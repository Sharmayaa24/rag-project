import uuid

from typing import Optional

from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from . import config, providers, store
from .chunk import create_chunks
from .extract import extract_pdf

app = FastAPI(title="PDF RAG Chatbot")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)


class ChatRequest(BaseModel):
    question: str
    documentId: Optional[str] = None


@app.get("/api/health")
def health():
    return {"status": "ok", "provider": config.PROVIDER}


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
        qvec = providers.embed([question])[0]
        hits = [h for h in store.search(qvec, req.documentId, config.TOP_K) if h.score >= config.MIN_SCORE]
        if not hits:
            return {
                "answer": "I could not find relevant information in the uploaded documents.",
                "sources": [],
            }
        context = "\n\n".join(
            f"Source {i + 1} (Document: {h.payload.get('fileName', 'Document')}, Page {h.payload.get('page', 1)}):\n{h.payload['text']}"
            for i, h in enumerate(hits)
        )
        answer = providers.chat(
            providers.SYSTEM_PROMPT, f"Context:\n{context}\n\nQuestion:\n{question}"
        )
    except Exception as e:
        raise HTTPException(502, f"Answer generation failed ({config.PROVIDER}): {e}")

    return {
        "answer": answer or "No answer was generated.",
        "sources": [
            {
                "fileName": h.payload.get("fileName", "Document"),
                "page": h.payload.get("page", 1),
                "score": round(h.score, 3),
                "snippet": h.payload["text"][:300],
            }
            for h in hits
        ],
    }

