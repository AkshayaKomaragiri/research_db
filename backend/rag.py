import os
from dotenv import load_dotenv
from langchain_huggingface import ChatHuggingFace, HuggingFaceEndpoint
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_chroma import Chroma
from langchain_text_splitters import RecursiveCharacterTextSplitter
import bs4
from .load import load_pdf
from langchain.tools import tool
from langchain.agents import create_agent
from langchain_core.tools import InjectedToolArg
from typing import Annotated, TypedDict, List, Optional
from langchain_core.messages import BaseMessage, HumanMessage
from langchain_core.documents import Document 
from langgraph.graph import StateGraph, START, END
from langgraph.graph.message import add_messages 
from supabase import create_client,Client
from langchain_community.vectorstores import SupabaseVectorStore
from langchain_core.messages import SystemMessage

#from IPython.display import Image, display

load_dotenv()
class State(TypedDict):
    question: str
    messages: Annotated[List[BaseMessage], add_messages]
    context: List[Document]
    continue_chat: bool
    collection_id: Optional[str]
    user_id: Optional[str]
# using the Qwen ai model from the HuggingFace platform
# temperature is 0.7, which is the best for multi-purpose tasks. Temperature is amount of randomness and creativity introduced into the responses
# max number of tokens that the model can use in a single response
class rag:
    def __init__(self):
        # These will hold our shared resources after setup is called
        llm = HuggingFaceEndpoint(
            repo_id="Qwen/Qwen2.5-7B-Instruct",
            temperature=0.7,
            max_new_tokens=1024,
        )
        self.model = ChatHuggingFace(llm=llm)
        # transforms sentences into vectors
        # vectors places semantically similar texts close together in the mathematical space
        #vectors are normalized so the length is 1
        embeddings = HuggingFaceEmbeddings(
            model_name="sentence-transformers/all-mpnet-base-v2",
            encode_kwargs={"normalize_embeddings": True},
        ) 
        #vector database
        #the database is persistent
        supabase_url = os.environ.get("NEXT_PUBLIC_SUPABASE_URL")
        supabase_key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
        supabase_client: Client = create_client(supabase_url, supabase_key)

        self.vector_store = SupabaseVectorStore(
            client=supabase_client,
            embedding=embeddings,
            table_name="documents",
            query_name="match_documents",  
        ) 
        self.graph = self.pipline()
        
    def pipline(self):
        
        workflow = StateGraph(State)
        workflow.add_node("retrieve", self.retrieve_context)
        workflow.add_node("generate", self.generate)
     

        workflow.add_edge(START, "retrieve")
        workflow.add_edge("retrieve", "generate")
        workflow.add_edge("generate", END)

        app = workflow.compile()
        #display(Image(app.get_graph().draw_mermaid_png()))
        return app




    async def process_pdf(self, url : str, user_id: str, collection_id: Optional[str] = None, paper_path: Optional[str] = None):
        docs = load_pdf(url)
        print(len(docs))
        print(docs[0].page_content[:300] if docs else "EMPTY")
        
        # break up the document content into chunks
        # chunk overlap is to ensure we don't miss context
        text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=1000,  # chunk size (characters)
            chunk_overlap=200,  # chunk overlap (characters)
            add_start_index=True,  # track index in original document
        )
        #split document
        all_splits = text_splitter.split_documents(docs)
        for chunk in all_splits:
            chunk.metadata = chunk.metadata or {}
            chunk.metadata["user_id"] = user_id
            if collection_id:
                chunk.metadata["collection_id"] = collection_id
            if paper_path:
                chunk.metadata["paper_path"] = paper_path
        print(f"Split pdf into {len(all_splits)} sub-documents.")

        #storing the vectors
        document_ids = await self.vector_store.aadd_documents(documents=all_splits)

        print(document_ids[:3])
    
    def retrieve_context(self, state: State) -> State:
        """Retrieve information to help answer query"""
        filter_dict = {}
        if state.get("user_id"):
            filter_dict["user_id"] = state["user_id"]
        if state.get("collection_id"):
            filter_dict["collection_id"] = state["collection_id"]
        retrieved_docs = self.vector_store.similarity_search(state["question"], k=4, filter=filter_dict if filter_dict else {})
        serialized = "\n\n".join(
        (f"Source: {doc.metadata}\nContent: {doc.page_content}") for doc in retrieved_docs
        )
        state["context"] = retrieved_docs
        return {"context": retrieved_docs}


    def generate(self, state: State):
        docs_content = "\n\n".join(doc.page_content for doc in state.get("context", []))
        if docs_content:
            system_prompt = (
                "You are an assistant for research questions.\n"
                "Answer the user's question using ONLY the following retrieved context. "
                "If you don't know the answer or if the context doesn't contain it, state that clearly.\n\n"
                f"--- CONTEXT ---\n{docs_content}\n---------------"
            )
        else:
            system_prompt = "You are a helpful research assistant. No relevant context was found in your collections."

        input_messages = [SystemMessage(content=system_prompt)] + state["messages"]
        response = self.model.invoke(input_messages)
        return {"messages": [response]}
