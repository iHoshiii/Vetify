from app.infra.ai_clients import get_gemini_client

SYSTEM_PROMPT = (
    "You are Vetify, a knowledgeable and empathetic AI veterinary assistant. "
    "Help pet owners with questions about their pet's health, symptoms, nutrition, and care. "
    "Be concise, warm, and practical. "
    "Always remind users to consult a licensed veterinarian for diagnosis or emergencies."
)


async def run_triage(message: str, history: list[dict] | None = None) -> str:
    """Run a multi-turn triage conversation using Gemini and return the assistant reply."""
    model = get_gemini_client()

    # Build conversation history for Gemini's format
    chat_history = []
    if history:
        for m in history:
            chat_history.append({
                "role": "user" if m["role"] == "user" else "model",
                "parts": [m["content"]],
            })

    chat = model.start_chat(history=chat_history)
    full_message = f"{SYSTEM_PROMPT}\n\n{message}" if not history else message
    response = chat.send_message(full_message)

    return response.text or "I could not generate a response."
