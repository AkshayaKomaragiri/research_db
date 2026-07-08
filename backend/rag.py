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
from typing import Annotated, TypedDict, List
from langchain_core.messages import BaseMessage, HumanMessage
from langchain_core.documents import Document 
from langgraph.graph import StateGraph, START, END
from langgraph.graph.message import add_messages 
#from IPython.display import Image, display

load_dotenv()
class State(TypedDict):
    question: str
    messages: Annotated[List[BaseMessage], add_messages]
    context: List[Document]
    continue_chat: bool
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

        self.vector_store = Chroma(
            collection_name="example_collection",
            embedding_function=embeddings,
            persist_directory="./chroma_langchain_db",  
        ) 
        self.graph = self.pipline()
        
    def pipline(self):
        
        workflow = StateGraph(State)
        workflow.add_node("retrieve", self.retrieve_context)
        workflow.add_node("generate", self.generate)
        workflow.add_node("user_speak", self.user_speak)
        workflow.add_node("continue_conversation", self.continue_conversation)

        workflow.add_edge(START, "user_speak")
        workflow.add_edge("user_speak", "continue_conversation")
        workflow.add_conditional_edges("continue_conversation", lambda x: x["continue_chat"],
        {
            True: "retrieve",
            False: END
        })
        workflow.add_edge("retrieve", "generate")
        workflow.add_edge("generate", "user_speak")

        app = workflow.compile()
        #display(Image(app.get_graph().draw_mermaid_png()))
        return workflow




    async def process_pdf(self, url : str):
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

        print(f"Split pdf into {len(all_splits)} sub-documents.")

        #storing the vectors
        document_ids = self.vector_store.add_documents(documents=all_splits)

        print(document_ids[:3])


    def user_speak(self, state: State) -> State:
        user_input = input("You: ")
        state["question"] = user_input
        state["messages"].append(HumanMessage(content=user_input))
        return state
    

    def continue_conversation(self, state: State) -> State:
        if state["messages"][-1].content == "exit":
            state["continue_chat"]=False
            print("Goodbye!")
        else:
            state["continue_chat"] = True
        return state
    
    def retrieve_context(self, state: State) -> State:
        """Retrieve information to help answer query"""
        retrieved_docs = self.vector_store.similarity_search(state["question"], k=2)
        serialized = "\n\n".join(
        (f"Source: {doc.metadata}\nContent: {doc.page_content}") for doc in retrieved_docs
        )
        state["context"] = retrieved_docs
        return state;


    def generate(self, state: State):
        docs_content = "\n\n".join(doc.page_content for doc in state["context"])
        question = state["questions"]
        message = f'''
        {question}
        {docs_content}
        '''

        response = self.model.invoke(state["messages"])
        state["messages"].append(response)
        print (state["messages"][-1].content)
        return {"messages": [response]}
