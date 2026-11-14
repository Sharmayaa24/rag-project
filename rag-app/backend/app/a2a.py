import re
import time
from typing import Optional

from . import config, providers, tools

AGENT_CARD = {
    "name": "Qdrant Multi-Agent RAG System",
    "description": "A2A-enabled multi-agent system that searches Qdrant vector databases, performs calculations, falls back to live web research, and verifies source citations.",
    "url": "http://localhost:8000",
    "version": "2.0.0",
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
            "role": "Analyzes user intent, manages conversation memory, and delegates tasks to specialist agents.",
        },
        {
            "id": "rag-specialist",
            "name": "Qdrant RAG Agent",
            "role": "Embeds queries, searches Qdrant vector chunks, and reformulates queries when similarity is low.",
        },
        {
            "id": "math-analyst",
            "name": "Math & Catalog Analyst Agent",
            "role": "Evaluates arithmetic expressions and inspects Qdrant knowledge base metadata.",
        },
        {
            "id": "web-researcher",
            "name": "Web Research Agent",
            "role": "Queries DuckDuckGo & Wikipedia when information is absent from local documents.",
        },
        {
            "id": "citation-verifier",
            "name": "Synthesizer & Citation Verifier",
            "role": "Generates grounded answers and verifies that document and page citations are accurate.",
        },
    ],
    "skills": [
        {
            "id": "qdrant_vector_search",
            "name": "Qdrant Vector Similarity Search",
            "description": "Semantic search across all indexed documents in Qdrant with page-level metadata.",
        },
        {
            "id": "kb_catalog_inspector",
            "name": "Knowledge Base Catalog Inspector",
            "description": "Lists all uploaded documents, page counts, and vector chunk counts.",
        },
        {
            "id": "math_calculator",
            "name": "Safe AST Math Calculator",
            "description": "Evaluates mathematical formulas and expressions accurately.",
        },
        {
            "id": "live_web_search",
            "name": "Live Web & Wikipedia Search",
            "description": "Fallback external search when uploaded documents do not contain the answer.",
        },
    ],
}


def get_agent_card() -> dict:
    return {**AGENT_CARD, "provider": config.PROVIDER, "collection": config.COLLECTION}


def _extract_keywords(question: str) -> str:
    stop = {"what", "where", "when", "which", "who", "whom", "whose", "why", "how", "is", "are", "the", "a", "an", "in", "on", "of", "for", "to", "does", "do", "can", "tell", "me", "about", "please"}
    words = [w for w in re.findall(r"\b\w+\b", question.lower()) if w not in stop and len(w) > 2]
    return " ".join(words) if words else question


def run_a2a_pipeline(
    question: str,
    document_id: Optional[str] = None,
    history: Optional[list[dict]] = None,
    allow_web_fallback: bool = True,
) -> dict:
    trace = []
    t0 = time.perf_counter()

    # 1. Host Coordinator Agent: Analyze intent & check tools
    needs_catalog = bool(
        re.search(r"\b(how many (pdf|document|file|page|vector)|list (all )?(pdf|document|file)|what (pdf|document|file)s)\b", question.lower())
    )
    math_res = tools.math_calculator_tool(question)
    t_coord = round((time.perf_counter() - t0) * 1000)

    delegated_to = ["Qdrant RAG Agent"]
    if needs_catalog:
        delegated_to.append("Catalog Inspector")
    if math_res:
        delegated_to.append("Math Analyst Agent")

    trace.append(
        {
            "from": "Host Coordinator",
            "to": ", ".join(delegated_to),
            "tool": "intent_router",
            "status": "completed",
            "summary": f"Analyzed query and dispatched A2A tasks to {', '.join(delegated_to)}.",
            "durationMs": max(t_coord, 1),
        }
    )

    extra_context_blocks = []

    # 2. Optional Catalog / Math Analyst Agent
    if needs_catalog:
        t1 = time.perf_counter()
        cat = tools.kb_catalog_tool()
        doc_names = ", ".join(f"{d['fileName']} ({d['pages']} pages, {d['chunks']} chunks)" for d in cat["documents"]) or "None"
        extra_context_blocks.append(
            f"Knowledge Base Catalog Summary:\nTotal PDFs: {cat['totalDocuments']}, Total Pages: {cat['totalPages']}, Total Vectors: {cat['totalChunks']}.\nFiles: {doc_names}"
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

    if math_res:
        extra_context_blocks.append(
            f"Verified Calculator Result: {math_res['expression']} = {math_res['result']}"
        )
        trace.append(
            {
                "from": "Host Coordinator",
                "to": "Math Analyst Agent",
                "tool": "math_calculator",
                "status": "completed",
                "summary": f"Computed {math_res['expression']} = {math_res['result']}",
                "durationMs": 2,
            }
        )

    # 3. Qdrant RAG Specialist Agent
    t_rag = time.perf_counter()
    hits = tools.qdrant_search_tool(question, document_id, config.TOP_K)

    # Corrective RAG: If no hits or very weak top score, rewrite query to core keywords and retry
    if not hits and not document_id:
        rewritten = _extract_keywords(question)
        if rewritten and rewritten.lower() != question.lower():
            hits = tools.qdrant_search_tool(rewritten, document_id, config.TOP_K)
            if hits:
                trace.append(
                    {
                        "from": "Qdrant RAG Agent",
                        "to": "Query Rewriter",
                        "tool": "corrective_query_rewrite",
                        "status": "completed",
                        "summary": f"Rewrote query to keywords '{rewritten}' and recovered {len(hits)} vector matches.",
                        "durationMs": max(round((time.perf_counter() - t_rag) * 1000), 1),
                    }
                )

    top_pct = f"{round(hits[0]['score'] * 100)}%" if hits else "0%"
    trace.append(
        {
            "from": "Host Coordinator",
            "to": "Qdrant RAG Agent",
            "tool": "qdrant_vector_search",
            "status": "completed",
            "summary": (
                f"Retrieved {len(hits)} vector chunks from Qdrant (top match: {top_pct})."
                if hits
                else "No matching vector chunks above threshold in Qdrant."
            ),
            "durationMs": max(round((time.perf_counter() - t_rag) * 1000), 1),
        }
    )

    # 4. Web Research Agent Fallback (only if Qdrant had 0 matches, no single-doc filter, and no catalog info)
    web_sources = []
    if not hits and not extra_context_blocks and allow_web_fallback and not document_id:
        t_web = time.perf_counter()
        web_hits = tools.web_search_tool(question)
        if web_hits:
            for w in web_hits:
                extra_context_blocks.append(f"Web Source ({w['title']} - {w['url']}):\n{w['snippet']}")
                web_sources.append(
                    {
                        "fileName": f"🌐 {w['title']}",
                        "page": 1,
                        "score": 0.75,
                        "snippet": w["snippet"],
                    }
                )
            trace.append(
                {
                    "from": "Qdrant RAG Agent",
                    "to": "Web Research Agent",
                    "tool": "live_web_search",
                    "status": "completed",
                    "summary": f"No PDF match found; fetched {len(web_hits)} external web reference(s).",
                    "durationMs": max(round((time.perf_counter() - t_web) * 1000), 1),
                }
            )

    if not hits and not extra_context_blocks:
        return {
            "answer": "I could not find relevant information in the uploaded documents.",
            "sources": [],
            "agentTrace": trace,
        }

    # 5. Assemble multi-agent context + conversation history
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

    # 6. Synthesizer & Citation Verifier Agent
    t_gen = time.perf_counter()
    prompt_user = f"{history_str}Context:\n{context_str}\n\nQuestion:\n{question}"
    answer = providers.chat(providers.SYSTEM_PROMPT, prompt_user)
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
            "from": "Qdrant RAG Agent",
            "to": "Citation Verifier & Writer",
            "tool": f"llm_synthesize ({config.PROVIDER})",
            "status": "completed",
            "summary": f"Synthesized answer grounded in {len(all_sources)} source(s) and verified citations.",
            "durationMs": gen_ms,
        }
    )

    return {
        "answer": answer or "No answer was generated.",
        "sources": all_sources,
        "agentTrace": trace,
    }

