import hashlib
import os
import tempfile

os.environ["QDRANT_PATH"] = tempfile.mkdtemp()
os.environ["QDRANT_URL"] = ""  # tests always use local storage, never the cloud
os.environ["PROVIDER"] = "ollama"

import pytest
from fastapi.testclient import TestClient

from app import providers
from app.chunk import create_chunks
from app.main import app


def make_pdf(page_texts):
    objs = {1: "<< /Type /Catalog /Pages 2 0 R >>", 3: "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>"}
    kids = " ".join(f"{4 + i * 2} 0 R" for i in range(len(page_texts)))
    objs[2] = f"<< /Type /Pages /Kids [{kids}] /Count {len(page_texts)} >>"
    for i, t in enumerate(page_texts):
        p = 4 + i * 2
        stream = f"BT /F1 12 Tf 50 700 Td ({t}) Tj ET"
        objs[p] = f"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents {p + 1} 0 R /Resources << /Font << /F1 3 0 R >> >> >>"
        objs[p + 1] = f"<< /Length {len(stream)} >>\nstream\n{stream}\nendstream"
    out = "%PDF-1.4\n"
    offs = {}
    for i in sorted(objs):
        offs[i] = len(out)
        out += f"{i} 0 obj\n{objs[i]}\nendobj\n"
    xref = len(out)
    n = max(objs) + 1
    out += f"xref\n0 {n}\n0000000000 65535 f \n"
    for i in range(1, n):
        out += f"{offs[i]:010d} 00000 n \n"
    out += f"trailer\n<< /Size {n} /Root 1 0 R >>\nstartxref\n{xref}\n%%EOF"
    return out.encode()


def fake_embed(texts):
    # deterministic bag-of-words style vector so similar words score high
    vecs = []
    for t in texts:
        v = [0.0] * 64
        for w in t.lower().split():
            v[int(hashlib.md5(w.encode()).hexdigest(), 16) % 64] += 1.0
        vecs.append(v)
    return vecs


@pytest.fixture(autouse=True)
def mock_providers(monkeypatch):
    monkeypatch.setattr(providers, "embed", fake_embed)
    monkeypatch.setattr(providers, "chat", lambda s, u: "Twelve casual leaves (page 2).")


def test_chunker_pages_and_overlap():
    words = " ".join(f"w{i}" for i in range(25))
    chunks = create_chunks([(3, words)], 10, 2)
    assert len(chunks) == 3
    assert all(c["page"] == 3 for c in chunks)
    assert chunks[1]["text"].startswith("w8 w9")
    with pytest.raises(ValueError):
        create_chunks([], 5, 5)


def test_upload_chat_delete_flow():
    c = TestClient(app)
    pdf = make_pdf(["Welcome intro page", "Employees receive twelve casual leaves per year", "Salary paid monthly"])
    r = c.post("/api/documents", files={"file": ("hb.pdf", pdf, "application/pdf")})
    assert r.status_code == 200, r.text
    doc = r.json()
    assert doc["pages"] == 3

    assert c.get("/api/documents").json()[0]["fileName"] == "hb.pdf"

    r = c.post("/api/chat", json={"documentId": doc["documentId"], "question": "How many casual leaves per year"})
    body = r.json()
    assert r.status_code == 200
    assert body["sources"][0]["page"] == 2
    assert "casual" in body["answer"]

    # other document id sees nothing
    r = c.post("/api/chat", json={"documentId": "nope", "question": "casual leaves"})
    assert r.json()["sources"] == []

    assert c.delete(f"/api/documents/{doc['documentId']}").status_code == 200
    assert c.get("/api/documents").json() == []


def test_upload_rejects_bad_files():
    c = TestClient(app)
    assert c.post("/api/documents", files={"file": ("a.txt", b"hi", "text/plain")}).status_code == 400
    assert c.post("/api/documents", files={"file": ("a.pdf", b"not a pdf", "application/pdf")}).status_code == 400

