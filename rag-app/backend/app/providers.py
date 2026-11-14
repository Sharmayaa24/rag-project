import httpx

from . import config

SYSTEM_PROMPT = " ".join(
    [
        "You are a helpful AI assistant that answers questions clearly and concisely based on the supplied context.",
        "Provide the exact answer directly without mentioning source numbers, file names, or page numbers.",
        "If the answer is not present in the context, state clearly that the information was not found.",
        "Do not invent facts, numbers, dates, or policies.",
    ]
)

_gemini_client = None


def _gemini():
    global _gemini_client
    if _gemini_client is None:
        from google import genai

        _gemini_client = genai.Client(api_key=config.GEMINI_API_KEY)
    return _gemini_client


def embed(texts: list[str]) -> list[list[float]]:
    if config.PROVIDER == "gemini":
        out = []
        for i in range(0, len(texts), 50):
            res = _gemini().models.embed_content(
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


def chat(system: str, user: str) -> str:
    if config.PROVIDER == "gemini":
        from google.genai import types

        res = _gemini().models.generate_content(
            model=config.GEMINI_CHAT_MODEL,
            contents=user,
            config=types.GenerateContentConfig(system_instruction=system),
        )
        return res.text or ""

    r = httpx.post(
        f"{config.OLLAMA_URL}/api/chat",
        json={
            "model": config.OLLAMA_CHAT_MODEL,
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

