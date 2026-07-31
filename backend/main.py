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

rag = rag()

class Request(BaseModel):
    question: str
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
async def upload_file( file: UploadFile = File(...), user_id: str = Form(...)):
    try:
        file_bytes= await file.read()
        supabase_path = f"{user_id}/{file.filename}"
        response = supabase.storage.from_("user-documents").upload(
                path=supabase_path,
                file=file_bytes,
                file_options={"cache-control": "3600", "upsert": "false"},
            )
        
        with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as tmp:
            tmp.write(file_bytes)
            tmp_path = tmp.name
        try:  
            await rag.process_pdf(tmp_path)
        finally:
            if os.path.exists(tmp_path):
                os.remove(tmp_path)
        return {"message": "File uploaded successfully", "response": response}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    

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
