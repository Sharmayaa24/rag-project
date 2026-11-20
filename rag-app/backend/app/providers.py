from functools import lru_cache
import json
import re

import httpx

from . import config

SYSTEM_PROMPT = " ".join(
    [
        "You are a helpful AI assistant that answers questions clearly using the supplied context.",
        "Always structure your response cleanly so it is easy to read:",
        "1) Start with a brief 1-2 sentence overview.",
        "2) Use clear section headings (### Heading) when covering multiple topics or types.",
        "3) Present key points, types, or features as bullet points in the format: '- **Point or Type Name**: Clear explanation.'",
        "4) Highlight important keywords and terms using **bold**.",
        "Do not mention source numbers, file names, or page numbers.",
        "If the answer is not present in the context, state clearly that the information was not found.",
        "Do not invent facts, numbers, dates, or policies.",
    ]
)


@lru_cache(maxsize=4)
def _gemini(api_key: str):
    """Return a long-lived Gemini client per API key.

    The client must stay referenced: a temporary genai.Client is garbage-collected
    mid-call, which closes its HTTP session ("client has been closed").
    """
    from google import genai

    return genai.Client(api_key=api_key)


def embed(texts: list[str]) -> list[list[float]]:
    if config.PROVIDER == "gemini":
        key = config.RUNTIME_SETTINGS.get("geminiApiKey") or config.GEMINI_API_KEY
        client = _gemini(key)
        out = []
        for i in range(0, len(texts), 50):
            res = client.models.embed_content(
                model=config.GEMINI_EMBED_MODEL, contents=texts[i : i + 50]
            )
            out.extend(e.values for e in res.embeddings)
        return out

    r = httpx.post(
        f"{config.OLLAMA_URL}/api/embed",
        json={"model": config.OLLAMA_EMBED_MODEL, "input": texts},
        timeout=300,
    )
    r.raise_for_status()
    return r.json()["embeddings"]


def _chat_ollama(system: str, user: str) -> str:
    model = config.RUNTIME_SETTINGS.get("ollamaModel") or config.OLLAMA_CHAT_MODEL
    r = httpx.post(
        f"{config.OLLAMA_URL}/api/chat",
        json={
            "model": model,
            "stream": False,
            "options": {
                "num_ctx": 2048,
                "num_predict": 350,
                "temperature": 0.3,
            },
            "messages": [
                {"role": "system", "content": system},
                {"role": "user", "content": user},
            ],
        },
        timeout=600,
    )
    r.raise_for_status()
    return r.json().get("message", {}).get("content", "")


def _chat_freebuff(system: str, user: str) -> str:
    """Instant zero-key cloud LLM via Pollinations endpoint."""
    model = config.RUNTIME_SETTINGS.get("freebuffModel") or "openai"
    r = httpx.post(
        "https://text.pollinations.ai/",
        json={
            "model": model,
            "messages": [
                {"role": "system", "content": system},
                {"role": "user", "content": user},
            ],
        },
        timeout=45,
    )
    r.raise_for_status()
    text = r.text.strip()
    if text.startswith("{"):
        try:
            data = r.json()
            choices = data.get("choices") or []
            if choices and isinstance(choices[0], dict):
                return choices[0].get("message", {}).get("content", "") or text
        except Exception:
            pass
    return text


def _chat_gemini(system: str, user: str) -> str:
    from google.genai import types

    key = (config.RUNTIME_SETTINGS.get("geminiApiKey") or config.GEMINI_API_KEY).strip()
    if not key:
        raise ValueError("Gemini API key is missing. Add it in Settings or switch to FreeBuff / Ollama.")
    primary = config.RUNTIME_SETTINGS.get("geminiModel") or config.GEMINI_CHAT_MODEL
    candidates = [primary] + [
        m
        for m in ("gemini-3.5-flash-lite", "gemini-flash-lite-latest", "gemini-3.6-flash", "gemini-3.5-flash")
        if m != primary
    ]
    client = _gemini(key)
    last_exc = None
    for model in candidates:
        try:
            res = client.models.generate_content(
                model=model,
                contents=user,
                config=types.GenerateContentConfig(system_instruction=system),
            )
            return res.text or ""
        except Exception as exc:
            msg = str(exc)
            last_exc = exc
            if any(code in msg for code in ("503", "UNAVAILABLE", "404", "NOT_FOUND")):
                continue
            raise
    raise last_exc


def _chat_groq(system: str, user: str) -> str:
    key = (config.RUNTIME_SETTINGS.get("groqApiKey") or config.GROQ_API_KEY).strip()
    if not key:
        raise ValueError("Groq API key is missing. Add it in Settings or switch to FreeBuff / Ollama.")
    model = config.RUNTIME_SETTINGS.get("groqModel") or config.GROQ_CHAT_MODEL
    r = httpx.post(
        "https://api.groq.com/openai/v1/chat/completions",
        headers={"Authorization": f"Bearer {key}", "Content-Type": "application/json"},
        json={
            "model": model,
            "messages": [
                {"role": "system", "content": system},
                {"role": "user", "content": user},
            ],
            "temperature": 0.3,
        },
        timeout=45,
    )
    r.raise_for_status()
    return r.json()["choices"][0]["message"]["content"]


def _chat_openrouter(system: str, user: str) -> str:
    key = (config.RUNTIME_SETTINGS.get("openrouterApiKey") or config.OPENROUTER_API_KEY).strip()
    if not key:
        raise ValueError("OpenRouter API key is missing. Add it in Settings or switch to FreeBuff / Ollama.")
    model = config.RUNTIME_SETTINGS.get("openrouterModel") or config.OPENROUTER_CHAT_MODEL
    r = httpx.post(
        "https://openrouter.ai/api/v1/chat/completions",
        headers={"Authorization": f"Bearer {key}", "Content-Type": "application/json"},
        json={
            "model": model,
            "messages": [
                {"role": "system", "content": system},
                {"role": "user", "content": user},
            ],
            "temperature": 0.3,
        },
        timeout=60,
    )
    r.raise_for_status()
    return r.json()["choices"][0]["message"]["content"]


def active_chat_provider() -> str:
    """Provider currently selected in the UI Settings (falls back to .env default)."""
    return (config.RUNTIME_SETTINGS.get("chatProvider") or config.PROVIDER).lower()


def describe_error(exc: Exception, action: str) -> str:
    """Turn low-level connection errors into a clear, actionable message."""
    if isinstance(exc, httpx.ConnectError):
        host = exc.request.url.host if exc.request else ""
        if host in ("localhost", "127.0.0.1"):
            return (
                "Local Ollama is not running. Document search always uses Ollama "
                f"({config.OLLAMA_EMBED_MODEL}), even when Gemini / Groq / FreeBuff writes the answer. "
                "Start it with: ollama serve"
            )
        return f"{action} failed: could not reach {host}. Check your internet connection."
    return f"{action} failed ({active_chat_provider()}): {exc}"


def chat(system: str, user: str) -> str:
    provider = active_chat_provider()
    if provider == "freebuff":
        return _chat_freebuff(system, user)
    if provider == "gemini":
        return _chat_gemini(system, user)
    if provider == "groq":
        return _chat_groq(system, user)
    if provider == "openrouter":
        return _chat_openrouter(system, user)
    return _chat_ollama(system, user)


def chat_json(system: str, user: str) -> dict:
    """Call the active LLM expecting a JSON object response; returns {} on parse failure."""
    raw = chat(f"{system}\nRespond with ONLY a valid JSON object and no extra text.", user).strip()
    if not raw:
        return {}
    # Strip optional markdown code fences
    fenced = re.search(r"```(?:json)?\s*(\{.*?\})\s*```", raw, re.DOTALL)
    candidate = fenced.group(1) if fenced else raw
    if not candidate.startswith("{"):
        brace = re.search(r"\{.*\}", candidate, re.DOTALL)
        candidate = brace.group(0) if brace else ""
    if not candidate:
        return {}
    try:
        parsed = json.loads(candidate)
        return parsed if isinstance(parsed, dict) else {}
    except Exception:
        return {}
