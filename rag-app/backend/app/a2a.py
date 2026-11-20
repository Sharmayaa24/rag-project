import json
import re
import time
from typing import Optional

from . import config, providers, tools

AGENT_CARD = {
    "name": "Qdrant Agentic RAG & Tool System",
    "description": "Agentic RAG + ReAct multi-agent system with query rewriting, retrieval grading, self-correction, PostgreSQL querying, Python execution, and web fallback.",
    "url": "http://localhost:8000",
    "version": "2.1.0",
    "protocol": "A2A/1.0",
    "capabilities": {
        "streaming": False,
        "pushNotifications": False,
        "stateTransitionHistory": True,
    },
    "agents": [
        {
            "id": "coordinator",
            "name": "Host Coordinator Agent",
            "role": "Rewrites queries, routes intents (PDF, PostgreSQL, Python, Web, Direct), and orchestrates ReAct steps.",
        },
        {
            "id": "rag-specialist",
            "name": "Agentic Qdrant RAG Agent",
            "role": "Searches Qdrant, grades chunk relevance, and rewrites queries on low relevance.",
        },
        {
            "id": "data-analyst",
            "name": "PostgreSQL & Python Analyst Agent",
            "role": "Runs read-only PostgreSQL queries, safe Python computations, and math expressions.",
        },
        {
            "id": "web-researcher",
            "name": "Web Research Agent",
            "role": "Queries DuckDuckGo & Wikipedia when information is absent from local documents.",
        },
        {
            "id": "citation-verifier",
            "name": "Synthesizer & Self-Correction Critic",
            "role": "Generates grounded answers, checks for hallucinations, and self-corrects if needed.",
        },
    ],
    "skills": tools.TOOL_SCHEMAS,
}


def get_agent_card() -> dict:
    return {
        **AGENT_CARD,
        "provider": providers.active_chat_provider(),
        "collection": config.COLLECTION,
    }


def _extract_keywords(question: str) -> str:
    stop = {
        "what", "where", "when", "which", "who", "whom", "whose", "why", "how",
        "is", "are", "the", "a", "an", "in", "on", "of", "for", "to", "does",
        "do", "can", "tell", "me", "about", "please", "explain", "give",
    }
    words = [w for w in re.findall(r"\b\w+\b", question.lower()) if w not in stop and len(w) > 2]
    return " ".join(words) if words else question


def _plan_route_and_rewrite(question: str, document_id: Optional[str], force_web_search: bool = False) -> dict:
    """Decide route and rewrite vague queries into focused search terms."""
    ql = question.lower()
    if document_id:
        return {"route": "pdf", "rewritten_query": question, "thought": "Document filter specified; searching Qdrant."}

    if force_web_search:
        return {"route": "web", "rewritten_query": question, "thought": "Web Search toggle enabled; searching live web and documents."}

    if re.search(r"\b(how many (pdf|document|file|page|vector)|list (all )?(pdf|document|file)|what (pdf|document|file)s)\b", ql):
        return {"route": "catalog", "rewritten_query": question, "thought": "User asked about uploaded knowledge base catalog."}

    if re.search(r"\b(postgres|postgresql|sql|database|tables?|select\s+.+\s+from)\b", ql):
        return {"route": "postgres", "rewritten_query": question, "thought": "Database/SQL intent detected; routing to PostgreSQL tool."}

    if re.search(r"\b(python|run code|execute code|script)\b", ql):
        return {"route": "python", "rewritten_query": question, "thought": "Code execution requested; routing to Python sandbox."}

    # Skip extra router LLM call on local CPU Ollama to keep latency low
    if providers.active_chat_provider() == "ollama":
        return {"route": "pdf", "rewritten_query": question, "thought": "Fast-pathing local Ollama directly to Qdrant RAG."}

    # Ask LLM router for ambiguous / general questions (graceful fallback if JSON unavailable)
    plan = providers.chat_json(
        "You are an Agentic RAG router. Choose the best route and rewrite the query for vector search.\n"
        "Routes: 'pdf' (uploaded documents/notes), 'web' (current events/external facts), "
        "'postgres' (SQL database), 'python' (computation/code), 'direct' (simple greeting/chitchat).\n"
        'Return JSON: {"route": "pdf|web|postgres|python|direct", "rewritten_query": "...", "thought": "..."}',
        f"User question: {question}",
    )
    route = (plan.get("route") or "pdf").lower()
    if route not in {"pdf", "web", "postgres", "python", "direct"}:
        route = "pdf"
    rewritten = (plan.get("rewritten_query") or question).strip()
    thought = (plan.get("thought") or f"Routed query to '{route}' pipeline.").strip()
    return {"route": route, "rewritten_query": rewritten, "thought": thought}


def _grade_chunks(question: str, hits: list[dict]) -> tuple[list[dict], bool]:
    """Grade retrieved chunks for relevance. Returns (kept_hits, llm_graded)."""
    if not hits:
        return [], False
    if providers.active_chat_provider() == "ollama":
        return hits, False
    previews = "\n".join(
        f"[{i}] ({h['fileName']} p.{h['page']}): {h['text'][:320]}"
        for i, h in enumerate(hits)
    )
    res = providers.chat_json(
        "You are a retrieval relevance grader. Given a user question and retrieved chunks, "
        'return JSON {"relevant_indices": [0, ...]} listing ONLY indices of chunks that help answer the question.',
        f"Question: {question}\n\nChunks:\n{previews}",
    )
    indices = res.get("relevant_indices")
    if isinstance(indices, list):
        kept = [hits[i] for i in indices if isinstance(i, int) and 0 <= i < len(hits)]
        return kept, True
    # Fallback when LLM doesn't return structured JSON (e.g., mocked tests)
    return hits, False


def _run_postgres_react(question: str, trace: list[dict]) -> tuple[str, list[dict]]:
    """Inspect Postgres schema if needed, generate a safe SELECT query, and execute it."""
    extra_blocks: list[str] = []
    # Check if user already wrote a SELECT query
    sql_match = re.search(r"\b((?:select|with)\b.+)", question, re.IGNORECASE | re.DOTALL)
    if sql_match:
        sql = sql_match.group(1).strip().rstrip(";")
    else:
        t0 = time.perf_counter()
        schema_res = tools.execute_tool(
            "postgres_query",
            {"sql": "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name"},
        )
        trace.append(
            {
                "from": "Host Coordinator",
                "to": "PostgreSQL Analyst",
                "tool": "postgres_query",
                "thought": "Inspecting public PostgreSQL tables before writing query.",
                "status": "completed" if "error" not in schema_res else "error",
                "summary": (
                    f"Found {schema_res.get('rowCount', 0)} table(s) in PostgreSQL."
                    if "error" not in schema_res
                    else schema_res["error"]
                ),
                "durationMs": max(round((time.perf_counter() - t0) * 1000), 1),
            }
        )
        if "error" in schema_res:
            return f"PostgreSQL Tool Notice: {schema_res['error']}", trace

        tables = [r[0] for r in schema_res.get("rows", []) if r]
        if not tables:
            return "PostgreSQL connected, but no tables exist in the `public` schema.", trace

        extra_blocks.append(f"PostgreSQL public tables: {', '.join(tables)}")
        sql_plan = providers.chat_json(
            "Write a read-only PostgreSQL SELECT query (LIMIT 50) to answer the user's question.",
            f"Tables: {tables}\nQuestion: {question}\nReturn JSON: {{\"sql\": \"SELECT ...\"}}",
        )
        sql = (sql_plan.get("sql") or "").strip()
        if not sql:
            return "\n".join(extra_blocks), trace

    t1 = time.perf_counter()
    res = tools.execute_tool("postgres_query", {"sql": sql})
    trace.append(
        {
            "from": "PostgreSQL Analyst",
            "to": "Host Coordinator",
            "tool": "postgres_query",
            "thought": f"Executing SQL: {sql[:120]}",
            "status": "completed" if "error" not in res else "error",
            "summary": (
                f"Query returned {res.get('rowCount', 0)} row(s)."
                if "error" not in res
                else res["error"]
            ),
            "durationMs": max(round((time.perf_counter() - t1) * 1000), 1),
        }
    )
    if "error" in res:
        extra_blocks.append(f"SQL Error ({sql}): {res['error']}")
    else:
        extra_blocks.append(f"PostgreSQL Result ({sql}):\n{json.dumps(res, ensure_ascii=False)}")
    return "\n\n".join(extra_blocks), trace


def _verify_and_correct(
    question: str, context_str: str, draft_answer: str, trace: list[dict]
) -> str:
    """Check draft answer for hallucinations against context and self-correct once if needed."""
    if (
        not config.ENABLE_SELF_CORRECTION
        or providers.active_chat_provider() == "ollama"
        or not context_str.strip()
        or not draft_answer.strip()
    ):
        return draft_answer

    t0 = time.perf_counter()
    check = providers.chat_json(
        "You are a strict hallucination & grounding critic. Verify that every factual claim in the draft answer "
        "is supported by the provided context.\n"
        'Return JSON: {"supported": true|false, "issue": "brief explanation if false, else empty"}',
        f"Question: {question}\n\nContext:\n{context_str[:2400]}\n\nDraft Answer:\n{draft_answer}",
    )
    if check.get("supported") is False and check.get("issue"):
        corrected = providers.chat(
            providers.SYSTEM_PROMPT,
            f"Context:\n{context_str}\n\nQuestion:\n{question}\n\n"
            f"Previous draft had an issue: {check['issue']}. Rewrite using ONLY facts supported by the context.",
        )
        trace.append(
            {
                "from": "Citation Verifier & Critic",
                "to": "Citation Verifier & Critic",
                "tool": "self_correction",
                "thought": f"Detected unsupported claim: {check['issue']}",
                "status": "completed",
                "summary": "Self-corrected draft answer to stay strictly grounded in context.",
                "durationMs": max(round((time.perf_counter() - t0) * 1000), 1),
            }
        )
        return corrected or draft_answer
    return draft_answer


def run_a2a_pipeline(
    question: str,
    document_id: Optional[str] = None,
    history: Optional[list[dict]] = None,
    allow_web_fallback: bool = True,
    force_web_search: bool = False,
) -> dict:
    trace: list[dict] = []
    t0 = time.perf_counter()

    # 1. Routing & Query Rewriting
    plan = _plan_route_and_rewrite(question, document_id, force_web_search)
    route = plan["route"]
    search_query = plan["rewritten_query"]
    math_res = tools.math_calculator_tool(question)

    trace.append(
        {
            "from": "Host Coordinator",
            "to": f"Route ({route})",
            "tool": "intent_router_and_rewriter",
            "thought": plan["thought"],
            "status": "completed",
            "summary": f"Routed to '{route}' | Query: '{search_query[:80]}'",
            "durationMs": max(round((time.perf_counter() - t0) * 1000), 1),
        }
    )

    extra_context_blocks: list[str] = []
    hits: list[dict] = []
    web_sources: list[dict] = []

    # 2. ReAct Tool Execution Steps (up to MAX_REACT_STEPS)
    if math_res:
        extra_context_blocks.append(f"Verified Calculator Result: {math_res['expression']} = {math_res['result']}")
        trace.append(
            {
                "from": "Host Coordinator",
                "to": "Math Analyst Agent",
                "tool": "math_calculator",
                "thought": f"Detected arithmetic expression '{math_res['expression']}'.",
                "status": "completed",
                "summary": f"Computed {math_res['expression']} = {math_res['result']}",
                "durationMs": 2,
            }
        )

    if route == "catalog":
        t1 = time.perf_counter()
        cat = tools.kb_catalog_tool()
        doc_names = ", ".join(f"{d['fileName']} ({d['pages']} pages, {d['chunks']} chunks)" for d in cat["documents"]) or "None"
        extra_context_blocks.append(
            f"Knowledge Base Catalog Summary:\nTotal Documents: {cat['totalDocuments']}, Total Pages: {cat['totalPages']}, Total Vectors: {cat['totalChunks']}.\nFiles: {doc_names}"
        )
        trace.append(
            {
                "from": "Host Coordinator",
                "to": "Catalog Analyst Agent",
                "tool": "kb_catalog_inspector",
                "status": "completed",
                "summary": f"Inspected Qdrant catalog: {cat['totalDocuments']} documents ({cat['totalChunks']} vectors).",
                "durationMs": max(round((time.perf_counter() - t1) * 1000), 1),
            }
        )

    if route == "postgres":
        pg_block, trace = _run_postgres_react(question, trace)
        if pg_block:
            extra_context_blocks.append(pg_block)

    if route == "python":
        t_py = time.perf_counter()
        py_plan = providers.chat_json(
            "Write a short pure-Python snippet (math, statistics, json, re, datetime preloaded; no imports) "
            "and assign the final value to `result`.",
            f"Task: {question}\nReturn JSON: {{\"code\": \"result = ...\"}}",
        )
        code = (py_plan.get("code") or "").strip()
        if code:
            py_res = tools.execute_tool("python_executor", {"code": code})
            extra_context_blocks.append(f"Python Execution Result:\n{json.dumps(py_res, ensure_ascii=False)}")
            trace.append(
                {
                    "from": "Host Coordinator",
                    "to": "Python Analyst Agent",
                    "tool": "python_executor",
                    "thought": "Executing safe Python computation in sandbox.",
                    "status": "completed" if "error" not in py_res else "error",
                    "summary": py_res.get("result") or py_res.get("stdout") or py_res.get("error", "Executed"),
                    "durationMs": max(round((time.perf_counter() - t_py) * 1000), 1),
                }
            )

    # 3. Agentic RAG (Search -> Grade Relevance -> Rewrite & Retry -> Web Fallback)
    if route in {"pdf", "catalog"} or force_web_search or (route not in {"direct", "web", "postgres", "python"}):
        t_rag = time.perf_counter()
        raw_hits = tools.qdrant_search_tool(search_query, document_id, config.TOP_K)
        hits, graded = _grade_chunks(question, raw_hits)

        if not hits and not document_id:
            rewritten_kw = _extract_keywords(question)
            if rewritten_kw and rewritten_kw.lower() != search_query.lower():
                retry_hits = tools.qdrant_search_tool(rewritten_kw, document_id, config.TOP_K)
                hits, _ = _grade_chunks(question, retry_hits)
                if hits:
                    trace.append(
                        {
                            "from": "Agentic RAG Agent",
                            "to": "Query Rewriter",
                            "tool": "corrective_query_rewrite",
                            "thought": "Initial search returned no relevant chunks; retrying with core keywords.",
                            "status": "completed",
                            "summary": f"Rewrote query to '{rewritten_kw}' and recovered {len(hits)} relevant chunk(s).",
                            "durationMs": max(round((time.perf_counter() - t_rag) * 1000), 1),
                        }
                    )

        top_pct = f"{round(hits[0]['score'] * 100)}%" if hits else "0%"
        trace.append(
            {
                "from": "Host Coordinator",
                "to": "Agentic RAG Agent",
                "tool": "qdrant_vector_search",
                "thought": "Graded retrieved chunks for relevance." if graded else "Retrieved top matching chunks.",
                "status": "completed",
                "summary": (
                    f"Kept {len(hits)} relevant chunk(s) from Qdrant (top match: {top_pct})."
                    if hits
                    else "No relevant document chunks found in Qdrant."
                ),
                "durationMs": max(round((time.perf_counter() - t_rag) * 1000), 1),
            }
        )

    # 4. Web Research (when forced by toggle, routed to web, or RAG found nothing and fallback allowed)
    should_search_web = force_web_search or (
        (route == "web" or (not hits and not extra_context_blocks and route != "direct"))
        and allow_web_fallback
        and not document_id
    )
    if should_search_web:
        t_web = time.perf_counter()
        web_hits = tools.web_search_tool(search_query)
        if web_hits:
            for w in web_hits:
                extra_context_blocks.append(f"Web Source ({w['title']} - {w['url']}):\n{w['snippet']}")
                web_sources.append(
                    {
                        "fileName": f"Web: {w['title']}",
                        "page": 1,
                        "score": 0.75,
                        "snippet": w["snippet"],
                        "url": w["url"],
                    }
                )
            trace.append(
                {
                    "from": "Host Coordinator",
                    "to": "Web Research Agent",
                    "tool": "live_web_search",
                    "thought": "Fetching live web results via DuckDuckGo/Wikipedia.",
                    "status": "completed",
                    "summary": f"Fetched {len(web_hits)} external web reference(s).",
                    "durationMs": max(round((time.perf_counter() - t_web) * 1000), 1),
                }
            )

    if route == "direct" and not force_web_search and not web_sources and not hits and not extra_context_blocks:
        direct_system = (
            "You are a helpful, accurate AI assistant. Answer clearly using headings, bullet points, and **bold** highlights."
        )
        direct_answer = providers.chat(direct_system, question)
        return {"answer": direct_answer or "Hello! How can I help you today?", "sources": [], "agentTrace": trace}

    if not hits and not extra_context_blocks:
        return {
            "answer": "I could not find relevant information in the uploaded documents.",
            "sources": [],
            "agentTrace": trace,
        }

    # 5. Assemble Context + Generate + Self-Correct
    context_parts = [
        f"Source {i + 1} (Document: {h['fileName']}, Page {h['page']}):\n{h['text'][:1200]}"
        for i, h in enumerate(hits)
    ]
    context_parts.extend(extra_context_blocks)
    context_str = "\n\n".join(context_parts)

    history_str = ""
    if history:
        recent = history[-4:]
        formatted_turns = [
            f"{'User' if m.get('role') == 'user' else 'Assistant'}: {m.get('text', '')[:300]}"
            for m in recent
            if m.get("text")
        ]
        if formatted_turns:
            history_str = "Recent Conversation History:\n" + "\n".join(formatted_turns) + "\n\n"

    t_gen = time.perf_counter()
    prompt_user = f"{history_str}Context:\n{context_str}\n\nQuestion:\n{question}"
    draft_answer = providers.chat(providers.SYSTEM_PROMPT, prompt_user)
    final_answer = _verify_and_correct(question, context_str, draft_answer, trace)
    gen_ms = max(round((time.perf_counter() - t_gen) * 1000), 1)

    all_sources = [
        {
            "fileName": h["fileName"],
            "page": h["page"],
            "score": h["score"],
            "snippet": h["snippet"],
        }
        for h in hits
    ] + web_sources

    trace.append(
        {
            "from": "Agentic RAG Agent",
            "to": "Citation Verifier & Critic",
            "tool": f"llm_synthesize ({providers.active_chat_provider()})",
            "status": "completed",
            "summary": f"Synthesized and verified answer across {len(all_sources)} source(s).",
            "durationMs": gen_ms,
        }
    )

    return {
        "answer": final_answer or "No answer was generated.",
        "sources": all_sources,
        "agentTrace": trace,
    }
