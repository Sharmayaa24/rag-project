import ast
from contextlib import redirect_stdout
import datetime
import html
from io import StringIO
import json
import math
import operator as op
import re
import statistics
from typing import Optional
from urllib.parse import parse_qs, unquote, urlparse

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


def _clean_ddg_url(href: str) -> str:
    if "uddg=" in href:
        qs = parse_qs(urlparse(href).query)
        if qs.get("uddg"):
            return unquote(qs["uddg"][0])
    if href.startswith("//"):
        return f"https:{href}"
    return href


def web_search_tool(query: str) -> list[dict]:
    """Search the live web via DuckDuckGo HTML, DuckDuckGo Instant Answer, and Wikipedia."""
    results: list[dict] = []

    # 1. Live DuckDuckGo HTML web search
    try:
        r = httpx.post(
            "https://html.duckduckgo.com/html/",
            data={"q": query},
            headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"},
            timeout=8.0,
            follow_redirects=True,
        )
        if r.status_code == 200:
            links = re.findall(
                r'<a[^>]*class="result__a"[^>]*href="([^"]+)"[^>]*>(.*?)</a>',
                r.text,
                re.DOTALL,
            )
            snippets = re.findall(
                r'class="result__snippet"[^>]*>(.*?)</(?:a|div|span)>',
                r.text,
                re.DOTALL,
            )
            for idx, (href, raw_title) in enumerate(links[:4]):
                title = html.unescape(re.sub(r"<[^>]+>", "", raw_title)).strip()
                snip = html.unescape(re.sub(r"<[^>]+>", "", snippets[idx])).strip() if idx < len(snippets) else ""
                url = _clean_ddg_url(html.unescape(href))
                if title and url.startswith("http"):
                    results.append({"title": title, "url": url, "snippet": (snip or title)[:400]})
    except Exception:
        pass

    # 2. Fallback: DuckDuckGo Instant Answer API
    if not results:
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

    # 3. Fallback: Wikipedia Search API
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

    return results[:4]


_FORBIDDEN_SQL = re.compile(
    r"\b(insert|update|delete|drop|alter|truncate|create|grant|revoke|copy|call|do)\b",
    re.IGNORECASE,
)


def postgres_query_tool(sql: str) -> dict:
    """Execute a read-only SQL query against PostgreSQL (max 50 rows)."""
    dsn = (config.RUNTIME_SETTINGS.get("postgresDsn") or config.POSTGRES_DSN).strip()
    if not dsn:
        return {
            "error": "PostgreSQL connection URL is not configured. Add it in Settings or set POSTGRES_DSN in .env."
        }

    cleaned = (sql or "").strip().rstrip(";")
    if not cleaned:
        return {"error": "SQL query cannot be empty."}
    first_word = cleaned.split(None, 1)[0].lower()
    if first_word not in {"select", "with", "show", "explain"} or _FORBIDDEN_SQL.search(cleaned):
        return {"error": "Only read-only SELECT / WITH / SHOW / EXPLAIN queries are permitted."}

    try:
        import psycopg

        with psycopg.connect(dsn, connect_timeout=5) as conn:
            with conn.cursor() as cur:
                cur.execute(cleaned)
                columns = [desc.name for desc in (cur.description or [])]
                rows = cur.fetchmany(50) if cur.description else []
                serialized = [[str(v) if v is not None else None for v in row] for row in rows]
        return {"columns": columns, "rows": serialized, "rowCount": len(serialized)}
    except Exception as exc:
        return {"error": f"PostgreSQL query failed: {exc}"}


_FORBIDDEN_PY_NAMES = {
    "__import__",
    "open",
    "exec",
    "eval",
    "compile",
    "globals",
    "locals",
    "vars",
    "dir",
    "getattr",
    "setattr",
    "delattr",
    "input",
    "breakpoint",
}
_SAFE_PY_BUILTINS = {
    "abs": abs,
    "all": all,
    "any": any,
    "bool": bool,
    "dict": dict,
    "enumerate": enumerate,
    "float": float,
    "int": int,
    "len": len,
    "list": list,
    "max": max,
    "min": min,
    "print": print,
    "range": range,
    "round": round,
    "set": set,
    "sorted": sorted,
    "str": str,
    "sum": sum,
    "tuple": tuple,
    "zip": zip,
}


def python_executor_tool(code: str) -> dict:
    """Safely execute pure-Python computation snippets in a restricted sandbox."""
    snippet = (code or "").strip()
    if not snippet:
        return {"error": "Code snippet cannot be empty."}
    try:
        tree = ast.parse(snippet, mode="exec")
    except SyntaxError as exc:
        return {"error": f"Syntax error: {exc}"}

    for node in ast.walk(tree):
        if isinstance(node, (ast.Import, ast.ImportFrom)):
            return {"error": "Imports are disabled; math, statistics, json, re, and datetime are preloaded."}
        if isinstance(node, ast.Name) and node.id in _FORBIDDEN_PY_NAMES:
            return {"error": f"Forbidden identifier '{node.id}' in sandbox."}
        if isinstance(node, ast.Attribute) and node.attr.startswith("__"):
            return {"error": "Dunder attribute access is disabled in sandbox."}

    env = {
        "__builtins__": _SAFE_PY_BUILTINS,
        "math": math,
        "statistics": statistics,
        "json": json,
        "re": re,
        "datetime": datetime,
    }
    buf = StringIO()
    try:
        with redirect_stdout(buf):
            exec(compile(tree, "<sandbox>", "exec"), env, env)
        output = buf.getvalue().strip()
        result = env.get("result")
        return {
            "stdout": output[:1500],
            "result": str(result)[:1000] if result is not None else None,
        }
    except Exception as exc:
        return {"error": f"Execution error: {exc}"}


TOOL_SCHEMAS = [
    {
        "name": "qdrant_vector_search",
        "description": "Search uploaded documents in Qdrant vector database for relevant passages.",
        "parameters": {
            "type": "object",
            "properties": {
                "query": {"type": "string", "description": "Focused semantic search query"},
                "top_k": {"type": "integer", "description": "Number of chunks to retrieve (default 3)"},
            },
            "required": ["query"],
        },
    },
    {
        "name": "kb_catalog_inspector",
        "description": "List all uploaded documents, page counts, and vector counts in Qdrant.",
        "parameters": {"type": "object", "properties": {}, "required": []},
    },
    {
        "name": "postgres_query",
        "description": "Run a read-only SQL SELECT query against the configured PostgreSQL database.",
        "parameters": {
            "type": "object",
            "properties": {
                "sql": {"type": "string", "description": "Read-only SQL SELECT query"},
            },
            "required": ["sql"],
        },
    },
    {
        "name": "python_executor",
        "description": "Run a safe pure-Python snippet (math, statistics, json, re, datetime preloaded).",
        "parameters": {
            "type": "object",
            "properties": {
                "code": {"type": "string", "description": "Python code; assign output to `result` or print()"},
            },
            "required": ["code"],
        },
    },
    {
        "name": "math_calculator",
        "description": "Evaluate an arithmetic expression accurately.",
        "parameters": {
            "type": "object",
            "properties": {
                "expression": {"type": "string", "description": "Arithmetic expression e.g. '12 * 5'"},
            },
            "required": ["expression"],
        },
    },
    {
        "name": "live_web_search",
        "description": "Search DuckDuckGo and Wikipedia for current or external facts.",
        "parameters": {
            "type": "object",
            "properties": {
                "query": {"type": "string", "description": "Web search query"},
            },
            "required": ["query"],
        },
    },
]


def execute_tool(name: str, args: dict, document_id: Optional[str] = None):
    """Dispatch a structured JSON tool call by name."""
    args = args or {}
    if name == "qdrant_vector_search":
        return qdrant_search_tool(args.get("query", ""), document_id, args.get("top_k"))
    if name == "kb_catalog_inspector":
        return kb_catalog_tool()
    if name == "postgres_query":
        return postgres_query_tool(args.get("sql", ""))
    if name == "python_executor":
        return python_executor_tool(args.get("code", ""))
    if name == "math_calculator":
        return math_calculator_tool(args.get("expression", ""))
    if name == "live_web_search":
        return web_search_tool(args.get("query", ""))
    return {"error": f"Unknown tool '{name}'"}


