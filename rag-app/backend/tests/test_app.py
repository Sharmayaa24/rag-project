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
    assert c.post("/api/documents", files={"file": ("a.exe", b"hi", "application/octet-stream")}).status_code == 400
    assert c.post("/api/documents", files={"file": ("a.pdf", b"not a pdf", "application/pdf")}).status_code == 400
    assert c.post("/api/documents/text", json={"title": "Notes", "content": "Important project note"}).status_code == 200


def test_a2a_protocol_and_agent_trace():
    c = TestClient(app)
    card = c.get("/.well-known/agent.json")
    assert card.status_code == 200
    assert card.json()["protocol"] == "A2A/1.0"
    assert len(card.json()["agents"]) >= 4

    task_res = c.post(
        "/api/a2a/tasks",
        json={"id": "t1", "message": {"parts": [{"type": "text", "text": "What is 12 * 5?"}]}},
    )
    assert task_res.status_code == 200
    data = task_res.json()
    assert data["status"]["state"] == "completed"
    trace = data["artifacts"][0]["metadata"]["agentTrace"]
    assert any(step["tool"] == "math_calculator" for step in trace)


def test_python_and_postgres_tools_safety():
    from app import tools

    ok = tools.python_executor_tool("result = sum([2, 4, 6])")
    assert ok["result"] == "12"

    blocked_py = tools.python_executor_tool("import os\nresult = os.listdir('.')")
    assert "error" in blocked_py

    blocked_sql = tools.postgres_query_tool("DELETE FROM users")
    assert "error" in blocked_sql


def test_agentic_rag_grading_and_self_correction(monkeypatch):
    from app import a2a

    # Mock chat_json to route to pdf, keep chunk 0, and trigger 1 self-correction
    calls = {"grade": 0, "correct": 0}

    def fake_chat_json(system, user):
        if "router" in system.lower():
            return {"route": "pdf", "rewritten_query": "casual leaves policy", "thought": "Check PDF"}
        if "relevance grader" in system.lower():
            calls["grade"] += 1
            return {"relevant_indices": [0]}
        if "hallucination" in system.lower():
            calls["correct"] += 1
            return {"supported": False, "issue": "Added unsupported bonus detail"} if calls["correct"] == 1 else {"supported": True, "issue": ""}
        return {}

    monkeypatch.setattr(providers, "chat_json", fake_chat_json)
    monkeypatch.setattr(a2a.tools, "qdrant_search_tool", lambda q, d, k: [
        {"fileName": "hb.pdf", "page": 2, "score": 0.88, "text": "Twelve casual leaves per year", "snippet": "Twelve casual leaves"}
    ])

    res = a2a.run_a2a_pipeline("How many leaves?")
    assert len(res["sources"]) == 1
    assert calls["grade"] == 1
    assert any(step["tool"] == "self_correction" for step in res["agentTrace"])


