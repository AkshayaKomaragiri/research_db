import asyncio
import os
from typing import Annotated, List, Optional, TypedDict

import arxiv
from dotenv import load_dotenv
from langchain_community.tools import DuckDuckGoSearchResults
from langchain_community.vectorstores import SupabaseVectorStore
from langchain_core.documents import Document
from langchain_core.messages import BaseMessage, HumanMessage, SystemMessage, ToolMessage
from langchain_core.tools import tool
from langchain_huggingface import ChatHuggingFace, HuggingFaceEndpoint, HuggingFaceEmbeddings
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langgraph.graph import END, START, StateGraph
from langgraph.graph.message import add_messages
from supabase import Client, create_client
from .load import load_pdf

#from IPython.display import Image, display

load_dotenv()
ddg_tool = DuckDuckGoSearchResults()
client = arxiv.Client()

@tool("web_search")
async def web_search( query: str) -> str:
    """search the web for information
        Args: 
        query: search terms to look for in the web
    """
    print(f"\nweb_search called with query: '{query}'")
    result = await ddg_tool.ainvoke(query)
    print(f"web_search returned {len(result)} characters.")
    return result



@tool("arxiv_search")
async def arxiv_search( query:str) -> str:
    """search through research papers on arxiv"""
    print(f"\narxiv_search called with query: '{query}'")
    def fetch_papers():
            
        search = arxiv.Search(
            query=query,
            max_results=10
            )
        paper_strings = []
        for result in client.results(search):
            paper_strings.append(f"Title: {result.title}\nSummary: {result.summary}\n")
        if not paper_strings:
            return "no results"
        return "\n----------\n".join(paper_strings)
    
    result = await asyncio.to_thread(fetch_papers)
    print(f"arxiv_search returned {len(result)} characters.")
    return result
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
        self.tools = [web_search, arxiv_search]
        self.tools_by_name = {t.name: t for t in self.tools}
        self.model_with_tools = self.model.bind_tools(self.tools)
        self.graph = self.pipline()
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

        
        
    def pipline(self):
        
        workflow = StateGraph(State)
        workflow.add_node("retrieve", self.retrieve_context)
        workflow.add_node("generate", self.generate)
        workflow.add_node("execute_tools", self.execute_tools)
     

        workflow.add_edge(START, "retrieve")
        workflow.add_edge("retrieve", "generate")
        workflow.add_conditional_edges(
            "generate",
            self.should_continue,
            {"execute_tools": "execute_tools", END: END}
        )
        workflow.add_edge("execute_tools", "generate")

        app = workflow.compile()
        #display(Image(app.get_graph().draw_mermaid_png()))
        return app

    def should_continue(self, state: State) -> str:
        """Decide whether to execute tools or finish standard generation."""
        last_message = state["messages"][-1]
        if hasattr(last_message, "tool_calls") and last_message.tool_calls:
            return "execute_tools"
        return END
    async def execute_tools(self, state: State) -> dict:
            """Execute tools requested by the model."""
            last_message = state["messages"][-1]
            tool_outputs = []

            for tool_call in last_message.tool_calls:
                selected_tool = self.tools_by_name[tool_call["name"]]
                # Execute tool asynchronously
                output = await selected_tool.ainvoke(tool_call["args"])
                
                tool_outputs.append(
                    ToolMessage(content=str(output), tool_call_id=tool_call["id"])
                )

            return {"messages": tool_outputs}
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
    
    def retrieve_context(self, state: State) -> dict:
        """Retrieve information to help answer query"""
        query_text = state.get("question")
        if not query_text and state.get("messages"):
            for msg in reversed(state["messages"]):
                if isinstance(msg, HumanMessage) or getattr(msg, "type", None) == "human":
                    query_text = msg.content
                    break
        if not query_text:
            print("No query text found for retrieval.")
            return {"context": []}

        # Build metadata filter dictionary
        filter_dict = {}
        if state.get("user_id"):
            filter_dict["user_id"] = str(state["user_id"])
        if state.get("collection_id"):
            filter_dict["collection_id"] = str(state["collection_id"])

        try:
            # Perform similarity search
            retrieved_docs = self.vector_store.similarity_search(
                query=query_text,
                k=4,
                filter=filter_dict if filter_dict else None
            )
            print(f"Retrieved {len(retrieved_docs)} docs for query: '{query_text}'")
        except Exception as e:
            print(f"Error during vector similarity search: {e}")
            retrieved_docs = []

        return {"context": retrieved_docs}
    # search_web tool
    #search_arxiv tool
    # search_semantic_scholar tool

    def generate(self, state: State):
        docs_content = "\n\n".join(doc.page_content for doc in state.get("context", []))
        if docs_content:
            system_prompt = (
                "You are an assistant for research questions.\n"
                "Answer the user's question using ONLY the following retrieved context. "
                "If you don't know the answer or if the context doesn't contain it, use the axriv search tool depending on the question.\n\n"
                
                "only return an answer that is relevant to the provided prompt" 
                f"--- CONTEXT ---\n{docs_content}\n---------------"
            )
        else:
            system_prompt = "You are a helpful research assistant. No relevant context was found in your collections."

        input_messages = [SystemMessage(content=system_prompt)] + state["messages"]
        
        response = self.model_with_tools.invoke(input_messages)
        return {"messages": [response]}
