from typing import Optional
import uuid

from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from . import a2a, config, providers, store
from .chunk import create_chunks
from .extract import extract_pdf

app = FastAPI(title="Qdrant Multi-Agent A2A RAG Chatbot")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)


class ChatRequest(BaseModel):
    question: str
    documentId: Optional[str] = None
    history: Optional[list[dict]] = None
    allowWebFallback: bool = True


class A2ATaskRequest(BaseModel):
    id: Optional[str] = None
    sessionId: Optional[str] = None
    message: dict


@app.get("/api/health")
def health():
    return {"status": "ok", "provider": config.PROVIDER, "protocol": "A2A/1.0"}


@app.get("/.well-known/agent.json")
@app.get("/api/a2a/agent-card")
def agent_card():
    """Return the official A2A Agent Card for agent discovery."""
    return a2a.get_agent_card()


@app.post("/api/a2a/tasks")
def a2a_task(req: A2ATaskRequest):
    """Standard A2A Task execution endpoint."""
    task_id = req.id or str(uuid.uuid4())
    parts = req.message.get("parts", [])
    question = " ".join(p.get("text", "") for p in parts if isinstance(p, dict)).strip()
    if not question and isinstance(req.message.get("text"), str):
        question = req.message["text"].strip()
    if not question:
        raise HTTPException(400, "A2A task message text is required.")

    try:
        result = a2a.run_a2a_pipeline(question)
    except Exception as e:
        raise HTTPException(502, f"A2A task execution failed: {e}")

    return {
        "id": task_id,
        "sessionId": req.sessionId or "default",
        "status": {"state": "completed"},
        "artifacts": [
            {
                "name": "answer",
                "parts": [{"type": "text", "text": result["answer"]}],
                "metadata": {
                    "sources": result["sources"],
                    "agentTrace": result["agentTrace"],
                },
            }
        ],
    }


@app.post("/api/documents")
async def upload(file: UploadFile = File(...)):
    name = file.filename or "document.pdf"
    if not name.lower().endswith(".pdf"):
        raise HTTPException(400, "Only PDF files are allowed.")
    data = await file.read(config.MAX_UPLOAD_BYTES + 1)
    if len(data) > config.MAX_UPLOAD_BYTES:
        raise HTTPException(413, "File is larger than 10 MB.")
    if not data.startswith(b"%PDF"):
        raise HTTPException(400, "File is not a valid PDF.")

    try:
        pages = extract_pdf(data)
    except Exception:
        raise HTTPException(400, "Could not read this PDF.")
    if not any(t.strip() for _, t in pages):
        raise HTTPException(422, "No selectable text found. This may be a scanned PDF; OCR is required.")

    chunks = create_chunks(pages, config.CHUNK_SIZE, config.CHUNK_OVERLAP)
    document_id = str(uuid.uuid4())
    try:
        for i in range(0, len(chunks), 16):
            batch = chunks[i : i + 16]
            vectors = providers.embed([c["text"] for c in batch])
            store.add_chunks(document_id, name, batch, vectors)
    except Exception as e:
        store.delete_document(document_id)
        raise HTTPException(502, f"Embedding/indexing failed ({config.PROVIDER}): {e}")

    return {
        "documentId": document_id,
        "fileName": name,
        "pages": len(pages),
        "chunks": len(chunks),
    }


@app.get("/api/documents")
def documents():
    return store.list_documents()


@app.delete("/api/documents/{document_id}")
def delete(document_id: str):
    store.delete_document(document_id)
    return {"deleted": document_id}


@app.post("/api/chat")
def chat(req: ChatRequest):
    question = req.question.strip()
    if not question:
        raise HTTPException(400, "Question is required.")
    try:
        return a2a.run_a2a_pipeline(
            question=question,
            document_id=req.documentId,
            history=req.history,
            allow_web_fallback=req.allowWebFallback,
        )
    except Exception as e:
        raise HTTPException(502, f"Answer generation failed ({config.PROVIDER}): {e}")
