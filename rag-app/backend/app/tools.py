import ast
import operator as op
import re
from typing import Optional

import httpx

from . import config, providers, store

_ALLOWED_OPS = {
    ast.Add: op.add,
    ast.Sub: op.sub,
    ast.Mult: op.mul,
    ast.Div: op.truediv,
    ast.Pow: op.pow,
    ast.Mod: op.mod,
    ast.USub: op.neg,
    ast.UAdd: op.pos,
}


def _eval_ast(node):
    if isinstance(node, ast.Constant) and isinstance(node.value, (int, float)):
        return float(node.value)
    if isinstance(node, ast.BinOp) and type(node.op) in _ALLOWED_OPS:
        return _ALLOWED_OPS[type(node.op)](_eval_ast(node.left), _eval_ast(node.right))
    if isinstance(node, ast.UnaryOp) and type(node.op) in _ALLOWED_OPS:
        return _ALLOWED_OPS[type(node.op)](_eval_ast(node.operand))
    raise ValueError("Unsupported math expression")


def math_calculator_tool(text: str) -> Optional[dict]:
    """Extract and safely evaluate arithmetic expressions found in a question."""
    matches = re.findall(r"(?:\d+(?:\.\d+)?\s*[\+\-\*\/\%\^]\s*)+\d+(?:\.\d+)?", text)
    if not matches:
        return None
    expr = matches[0].replace("^", "**").strip()
    try:
        tree = ast.parse(expr, mode="eval")
        value = _eval_ast(tree.body)
        formatted = int(value) if value.is_integer() else round(value, 4)
        return {"expression": matches[0].strip(), "result": formatted}
    except Exception:
        return None


def kb_catalog_tool() -> dict:
    """Return a summary of all indexed documents in Qdrant."""
    docs = store.list_documents()
    total_pages = sum(d.get("pages", 0) for d in docs)
    total_chunks = sum(d.get("chunks", 0) for d in docs)
    return {
        "totalDocuments": len(docs),
        "totalPages": total_pages,
        "totalChunks": total_chunks,
        "documents": docs,
    }


def qdrant_search_tool(question: str, document_id: Optional[str] = None, top_k: Optional[int] = None) -> list[dict]:
    """Embed the query and retrieve top matching chunks from Qdrant."""
    k = top_k or config.TOP_K
    qvec = providers.embed([question])[0]
    raw_hits = store.search(qvec, document_id, k)
    hits = [h for h in raw_hits if h.score >= config.MIN_SCORE]
    return [
        {
            "fileName": h.payload.get("fileName", "Document"),
            "page": h.payload.get("page", 1),
            "score": round(h.score, 3),
            "text": h.payload.get("text", ""),
            "snippet": h.payload.get("text", "")[:300],
        }
        for h in hits
    ]


def web_search_tool(query: str) -> list[dict]:
    """Query Wikipedia & DuckDuckGo Instant Answer API for external knowledge fallback."""
    results = []
    try:
        r = httpx.get(
            "https://api.duckduckgo.com/",
            params={"q": query, "format": "json", "no_html": 1, "skip_disambig": 1},
            timeout=5.0,
        )
        if r.status_code == 200:
            data = r.json()
            if data.get("AbstractText"):
                results.append(
                    {
                        "title": data.get("Heading") or "DuckDuckGo Instant Answer",
                        "url": data.get("AbstractURL") or "https://duckduckgo.com",
                        "snippet": data["AbstractText"][:400],
                    }
                )
            for topic in data.get("RelatedTopics", [])[:2]:
                if isinstance(topic, dict) and topic.get("Text"):
                    results.append(
                        {
                            "title": "Web Reference",
                            "url": topic.get("FirstURL", "https://duckduckgo.com"),
                            "snippet": topic["Text"][:300],
                        }
                    )
    except Exception:
        pass

    if not results:
        try:
            r = httpx.get(
                "https://en.wikipedia.org/w/api.php",
                params={
                    "action": "query",
                    "list": "search",
                    "srsearch": query,
                    "format": "json",
                    "srlimit": 2,
                },
                headers={"User-Agent": "RAG-A2A-Agent/1.0"},
                timeout=5.0,
            )
            if r.status_code == 200:
                for item in r.json().get("query", {}).get("search", []):
                    clean = re.sub(r"<[^>]+>", "", item.get("snippet", ""))
                    results.append(
                        {
                            "title": f"Wikipedia: {item.get('title')}",
                            "url": f"https://en.wikipedia.org/wiki/{item.get('title', '').replace(' ', '_')}",
                            "snippet": clean,
                        }
                    )
        except Exception:
            pass

    return results[:3]

