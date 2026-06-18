import groq
import google.generativeai as genai
from app.core.config import settings

# --- Groq Client ---
_groq_client: groq.Groq | None = None


def get_groq_client() -> groq.Groq:
    """Return a singleton Groq client instance."""
    global _groq_client
    if _groq_client is None:
        _groq_client = groq.Groq(api_key=settings.GROQ_API_KEY)
    return _groq_client


# --- Gemini Client ---
def get_gemini_client() -> genai.GenerativeModel:
    """Return a configured Gemini GenerativeModel instance."""
    genai.configure(api_key=settings.GEMINI_API_KEY)
    return genai.GenerativeModel("gemini-1.5-flash")
