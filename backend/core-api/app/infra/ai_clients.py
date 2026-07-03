import google.generativeai as genai
from app.core.config import settings

# --- Gemini Client ---
def get_gemini_client() -> genai.GenerativeModel:
    """Return a configured Gemini GenerativeModel instance."""
    genai.configure(api_key=settings.GEMINI_API_KEY)
    return genai.GenerativeModel("gemini-3.5-flash")
