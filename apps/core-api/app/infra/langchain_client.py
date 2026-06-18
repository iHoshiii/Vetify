"""Simple LangChain client factories and helpers.

This file provides lightweight, lazy-loading factories so the rest of the
backend can obtain model clients without importing heavy SDKs at module
import time. It falls back to a small dict when the provider package
isn't installed (so CI / editor won't fail).
"""
from typing import Any, Dict
import os


def _env(key: str) -> str:
    val = os.getenv(key)
    if not val:
        raise RuntimeError(f"Environment variable {key} is not set")
    return val


def get_groq_client() -> Any:
    """Return a Groq client instance or a lightweight dict fallback.

    Expects `GROQ_API_KEY` in env. Uses lazy import so tests/editors don't
    require the Groq package to be installed.
    """
    key = _env("GROQ_API_KEY")
    try:
        # langchain-groq provides adapters; import lazily
        from langchain_groq import GroqClient  # type: ignore

        return GroqClient(api_key=key)
    except Exception:
        return {"provider": "groq", "api_key": key}


def get_gemini_client() -> Any:
    """Return a Gemini/Google GenAI client instance or a fallback dict.

    Expects `GEMINI_API_KEY` in env.
    """
    key = _env("GEMINI_API_KEY")
    try:
        from langchain_google_genai import GoogleGenAI  # type: ignore

        return GoogleGenAI(api_key=key)
    except Exception:
        return {"provider": "gemini", "api_key": key}


def run_prompt(client: Any, prompt: str, **kwargs) -> Dict[str, Any]:
    """Try to run a simple prompt against common client shapes.

    This helper normalizes a few common client APIs into a consistent dict
    response for quick integration in domain services.
    """
    # Known adapter: langchain-like objects with an `run` method
    if hasattr(client, "run"):
        try:
            result = client.run(prompt, **kwargs)
            return {"text": result}
        except Exception as e:
            return {"error": str(e)}

    # Fallback: if we returned a dict earlier
    if isinstance(client, dict):
        return {"text": f"(mock response from {client.get('provider')}) {prompt}"}

    # Unknown client shape
    return {"error": "Unsupported client type"}
