from fastapi import FastAPI, HTTPException, UploadFile, File, Form
from pydantic import BaseModel
from fastapi.responses import StreamingResponse
import asyncio
from .rag import rag
from contextlib import asynccontextmanager
from fastapi.middleware.cors import CORSMiddleware
from langchain_core.messages import HumanMessage
import os
from supabase import create_client, Client
import tempfile
from typing import Optional
from .collections_papers import store_paper_in_collection

rag = rag()

class Request(BaseModel):
    question: str
    collection_id: Optional[str] = None
    user_id: Optional[str] = None

class Response(BaseModel):
    answer: str
supabase_url = os.environ.get("NEXT_PUBLIC_SUPABASE_URL")
supabase_key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
supabase: Client = create_client(supabase_url, supabase_key)
@asynccontextmanager
async def lifespan(app: FastAPI):
    rag.pipline()

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

@app.post("/upload")
async def upload_file(
    file: UploadFile = File(...),
    user_id: str = Form(...),
    collection_id: Optional[str] = Form(default=None),
):
    try:
        file_bytes = await file.read()
        supabase_path = f"{user_id}/{file.filename}"
        response = supabase.storage.from_("user-documents").upload(
            path=supabase_path,
            file=file_bytes,
            file_options={"cache-control": "3600", "upsert": "true", "content-type": file.content_type or "application/pdf"},
        )

        if collection_id:
            store_paper_in_collection(
                supabase,
                user_id=user_id,
                collection_id=collection_id,
                paper_name=file.filename,
                paper_path=supabase_path,
            )

        tmp = tempfile.NamedTemporaryFile(delete=False, suffix=".pdf")
        tmp_path = tmp.name
        try:
            tmp.write(file_bytes)
            tmp.close()
            await rag.process_pdf(url=tmp_path, user_id=user_id, collection_id=collection_id, paper_path=supabase_path)
        finally:
            if os.path.exists(tmp_path):
                os.remove(tmp_path)
        return {"message": "File uploaded successfully", "response": response}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    

@app.post("/chat")
async def answer_question(request: Request):
    context_parts = []
    if request.collection_id:
        context_parts.append(f"collection_id: {request.collection_id}")
    if request.user_id:
        context_parts.append(f"user_id: {request.user_id}")

    question_text = request.question
    if context_parts:
        question_text = f"{request.question}\n\nContext:\n" + "\n".join(context_parts)

    initial_state = {
        "question": question_text,
        "messages": [HumanMessage(content=question_text)],
        "context": [],
        "continue_chat": True,
        "collection_id": request.collection_id,
        "user_id": request.user_id,
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
