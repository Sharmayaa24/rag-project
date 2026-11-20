import json
import os
from pathlib import Path

from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BASE_DIR / ".env")

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "").strip()
GROQ_API_KEY = os.getenv("GROQ_API_KEY", "").strip()
OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY", "").strip()

# Embedding provider stays consistent so Qdrant collection vectors remain compatible
PROVIDER = (os.getenv("PROVIDER") or ("gemini" if GEMINI_API_KEY else "ollama")).lower()

OLLAMA_URL = os.getenv("OLLAMA_URL", "http://localhost:11434")
OLLAMA_EMBED_MODEL = os.getenv("OLLAMA_EMBED_MODEL", "nomic-embed-text")
OLLAMA_CHAT_MODEL = os.getenv("OLLAMA_CHAT_MODEL", "qwen2.5:3b")

GEMINI_EMBED_MODEL = os.getenv("GEMINI_EMBED_MODEL", "gemini-embedding-001")
GEMINI_CHAT_MODEL = os.getenv("GEMINI_CHAT_MODEL", "gemini-3.5-flash-lite")

GROQ_CHAT_MODEL = os.getenv("GROQ_CHAT_MODEL", "llama-3.3-70b-versatile")
OPENROUTER_CHAT_MODEL = os.getenv("OPENROUTER_CHAT_MODEL", "meta-llama/llama-3.3-70b-instruct:free")
FREEBUFF_CHAT_MODEL = os.getenv("FREEBUFF_CHAT_MODEL", "openai")
POSTGRES_DSN = os.getenv("POSTGRES_DSN", os.getenv("DATABASE_URL", "")).strip()

# Mutable runtime settings controlled from the UI Settings dialog
RUNTIME_SETTINGS = {
    "chatProvider": os.getenv("CHAT_PROVIDER", PROVIDER),  # "ollama" | "freebuff" | "gemini" | "groq" | "openrouter"
    "ollamaModel": OLLAMA_CHAT_MODEL,
    "freebuffModel": FREEBUFF_CHAT_MODEL,
    "geminiApiKey": GEMINI_API_KEY,
    "geminiModel": GEMINI_CHAT_MODEL,
    "groqApiKey": GROQ_API_KEY,
    "groqModel": GROQ_CHAT_MODEL,
    "openrouterApiKey": OPENROUTER_API_KEY,
    "openrouterModel": OPENROUTER_CHAT_MODEL,
    "postgresDsn": POSTGRES_DSN,
}

# UI Settings (provider choice + API keys) are persisted here so they survive restarts.
# This file holds secrets and is gitignored (see rag-app/.gitignore).
SETTINGS_FILE = BASE_DIR / "settings.local.json"


def _load_saved_settings() -> None:
    try:
        saved = json.loads(SETTINGS_FILE.read_text(encoding="utf-8"))
    except (FileNotFoundError, json.JSONDecodeError, OSError):
        return
    RUNTIME_SETTINGS.update({k: v for k, v in saved.items() if k in RUNTIME_SETTINGS and v})


def save_runtime_settings() -> None:
    SETTINGS_FILE.write_text(json.dumps(RUNTIME_SETTINGS, indent=2), encoding="utf-8")


_load_saved_settings()

# Qdrant Cloud (set URL + key). If QDRANT_URL is empty, a local folder is used.
QDRANT_URL = os.getenv("QDRANT_URL", "").strip()
QDRANT_API_KEY = os.getenv("QDRANT_API_KEY", "").strip()
QDRANT_PATH = os.getenv("QDRANT_PATH", str(BASE_DIR / "qdrant_data"))
COLLECTION = f"pdf_{PROVIDER}"

CHUNK_SIZE = int(os.getenv("CHUNK_SIZE", "600"))
CHUNK_OVERLAP = int(os.getenv("CHUNK_OVERLAP", "100"))
TOP_K = int(os.getenv("TOP_K", "3"))
MIN_SCORE = float(os.getenv("MIN_SCORE", "0.2"))
MAX_REACT_STEPS = int(os.getenv("MAX_REACT_STEPS", "4"))
ENABLE_SELF_CORRECTION = os.getenv("ENABLE_SELF_CORRECTION", "true").lower() == "true"
