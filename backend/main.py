from fastapi import FastAPI
from pydantic import BaseModel
from fastapi.responses import StreamingResponse
import asyncio
from .rag import rag
from contextlib import asynccontextmanager
from fastapi.middleware.cors import CORSMiddleware
from langchain_core.messages import HumanMessage

rag = rag()

class Request(BaseModel):
    question: str
class Response(BaseModel):
    answer: str

@asynccontextmanager
async def lifespan(app: FastAPI):
    rag.pipline()
    if rag.vector_store._collection.count() == 0:
        await rag.process_pdf("https://research.chalmers.se/publication/527311/file/527311_Fulltext.pdf")

    yield
app = FastAPI(lifespan=lifespan)
origins = [
    "http://localhost:3000",
    "localhost:3000"
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)

@app.get("/")
async def root():
    return {"message": "Hello World"}


@app.post("/chat")
async def answer_question(request: Request):
    initial_state = {
        "question": request.question,
        "messages": [HumanMessage(content=request.question)],
        "context":[],
        "continue_chat": True
   }
    graph = rag.pipline()
    
    async def event_generator():
        async for event in graph.astream_events(initial_state, version="v2"):
            kind = event["event"]
            if kind == "on_chat_model_stream":
                content = event["data"]["chunk"].content
                if content:
                    yield content
                    
    return StreamingResponse(event_generator(), media_type="text/plain")