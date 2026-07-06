from fastapi import FastAPI
from pydantic import BaseModel
from fastapi.responses import StreamingResponse
import asyncio
from .rag import rag_pipeline
from contextlib import asynccontextmanager

rag = rag_pipeline()

class Request(BaseModel):
    question: str
class Response(BaseModel):
    answer: str

@asynccontextmanager
async def lifespan(app: FastAPI):
    rag.setup()
    if rag.vector_store._collection.count() == 0:
        await rag.process_pdf("https://research.chalmers.se/publication/527311/file/527311_Fulltext.pdf")

    yield
app = FastAPI(lifespan=lifespan)


@app.get("/")
async def root():
    return {"message": "Hello World"}


@app.post("/stream", response_model=Response)
async def answer_question():
    answer =rag.rag_retrieve()
    return Response(
        answer=answer
    )
