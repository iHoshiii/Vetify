from app.infra.ai_clients import get_groq_client


async def run_triage(message: str) -> str:
    """Send user message through the LangChain triage pipeline and return a reply."""
    client = get_groq_client()

    response = client.chat.completions.create(
        model="llama3-8b-8192",
        messages=[
            {
                "role": "system",
                "content": (
                    "You are Vetify, an AI veterinary assistant. "
                    "Provide helpful, empathetic, and accurate pet health guidance. "
                    "Always recommend a real vet for serious concerns."
                ),
            },
            {"role": "user", "content": message},
        ],
    )

    return response.choices[0].message.content or "I could not generate a response."
