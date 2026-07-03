from app.infra.langchain_client import get_triage_chain


async def run_triage(message: str, session_id: str = "default", history: list[dict] | None = None) -> str:
    """Run the triage LangChain chain and return the assistant reply.

    `session_id` scopes the conversation memory per user.
    `history` is accepted for API compatibility but memory is managed by LangChain internally.
    """
    chain = get_triage_chain()

    response = await chain.ainvoke(
        {"input": message},
        config={"configurable": {"session_id": session_id}},
    )

    return response.content or "I could not generate a response."
