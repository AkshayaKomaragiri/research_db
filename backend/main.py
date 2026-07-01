from fastapi import FastAPI
from pydantic import BaseModel
from .rag import rag_pipeline
app = FastAPI()

rag = rag_pipeline()

class Request(BaseModel):
    question: str
class Response(BaseModel):
    answer: str
@app.get("/")
async def root():
    return {"message": "Hello World"}

@app.post("/ask", response_model=Response)
async def answer_question():
    rag.setup()
    answer =rag.rag_retrieve()
    return Response(
        answer=answer
    )
