from typing import Optional
from urllib.parse import urlparse
import uuid

from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
import httpx
from pydantic import BaseModel

from . import a2a, config, providers, store
from .chunk import create_chunks
from .extract import (
    SUPPORTED_EXTENSIONS,
    extract_document,
    extract_html_text,
    split_text_into_pages,
)

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


class TextUploadRequest(BaseModel):
    title: str
    content: str


class UrlUploadRequest(BaseModel):
    url: str


class A2ATaskRequest(BaseModel):
    id: Optional[str] = None
    sessionId: Optional[str] = None
    message: dict


def _index_pages(name: str, pages: list[tuple[int, str]]) -> dict:
    if not any(t.strip() for _, t in pages):
        raise HTTPException(422, "No readable text or OCR content could be extracted.")

    chunks = create_chunks(pages, config.CHUNK_SIZE, config.CHUNK_OVERLAP)
    document_id = str(uuid.uuid4())
    try:
        batch_size = 64
        for i in range(0, len(chunks), batch_size):
            batch = chunks[i : i + batch_size]
            vectors = providers.embed([c["text"][:3000] for c in batch])
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
def upload(file: UploadFile = File(...)):
    name = file.filename or "document.pdf"
    ext = "." + name.rsplit(".", 1)[-1].lower() if "." in name else ""
    if ext not in SUPPORTED_EXTENSIONS:
        raise HTTPException(
            400,
            f"Unsupported file type '{ext}'. Allowed: {', '.join(SUPPORTED_EXTENSIONS)}",
        )

    data = file.file.read()
    try:
        pages = extract_document(data, name)
    except ValueError as ve:
        raise HTTPException(400, str(ve))
    except Exception:
        raise HTTPException(400, f"Could not read '{name}'.")

    return _index_pages(name, pages)


@app.post("/api/documents/text")
def upload_text(req: TextUploadRequest):
    title = req.title.strip() or "Note.txt"
    if "." not in title:
        title = f"{title}.txt"
    content = req.content.strip()
    if not content:
        raise HTTPException(400, "Text content cannot be empty.")

    pages = split_text_into_pages(content)
    return _index_pages(title, pages)


@app.post("/api/documents/url")
def upload_url(req: UrlUploadRequest):
    url = req.url.strip()
    parsed = urlparse(url)
    if parsed.scheme not in ("http", "https") or not parsed.netloc:
        raise HTTPException(400, "Please enter a valid http:// or https:// URL.")

    try:
        resp = httpx.get(
            url,
            headers={"User-Agent": "Mozilla/5.0 (DocumentWorkspaceBot/1.0)"},
            follow_redirects=True,
            timeout=20,
        )
        resp.raise_for_status()
    except Exception as e:
        raise HTTPException(400, f"Could not fetch URL: {e}")

    text = extract_html_text(resp.text)
    if not text.strip():
        raise HTTPException(422, "No readable text found at that URL.")

    label = f"{parsed.netloc}{parsed.path}".rstrip("/") or parsed.netloc
    pages = split_text_into_pages(text)
    return _index_pages(label, pages)


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
