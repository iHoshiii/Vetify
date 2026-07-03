"""LangChain chain factory for Vetify.

Current: conversational triage chain backed by Gemini.
Future:  swap `_build_chain` to inject a retriever for RAG
         (professional profiles, vet knowledge base, etc.)
"""

from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_core.runnables.history import RunnableWithMessageHistory
from langchain_core.chat_history import BaseChatMessageHistory
from langchain_core.messages import BaseMessage
from langchain_google_genai import ChatGoogleGenerativeAI
from pydantic import BaseModel

from app.core.config import settings

# ---------------------------------------------------------------------------
# In-memory session store (replace with MongoDB-backed store when DB is ready)
# ---------------------------------------------------------------------------
_session_store: dict[str, "InMemoryHistory"] = {}


class InMemoryHistory(BaseChatMessageHistory, BaseModel):
    messages: list[BaseMessage] = []

    def add_messages(self, messages: list[BaseMessage]) -> None:
        self.messages.extend(messages)

    def clear(self) -> None:
        self.messages = []


def _get_session_history(session_id: str) -> InMemoryHistory:
    if session_id not in _session_store:
        _session_store[session_id] = InMemoryHistory()
    return _session_store[session_id]


# ---------------------------------------------------------------------------
# Chain factory
# ---------------------------------------------------------------------------
SYSTEM_PROMPT = (
    "You are Vetify, a knowledgeable and empathetic AI veterinary assistant. "
    "Help pet owners with questions about their pet's health, symptoms, nutrition, and care. "
    "Be concise, warm, and practical. "
    "Always remind users to consult a licensed veterinarian for diagnosis or emergencies."
)


def _build_chain() -> RunnableWithMessageHistory:
    """Build and return the triage LangChain chain.

    Structure (RAG slot is commented — uncomment and pass a retriever when ready):
        prompt | [retriever |] llm
    """
    llm = ChatGoogleGenerativeAI(
        model="gemini-1.5-flash",
        google_api_key=settings.GEMINI_API_KEY,
        temperature=0.7,
        max_output_tokens=512,
    )

    prompt = ChatPromptTemplate.from_messages([
        ("system", SYSTEM_PROMPT),
        # --- RAG slot ---
        # When professionals DB is ready, inject retrieved context here:
        # ("system", "Relevant professionals near the user:\n{context}"),
        MessagesPlaceholder(variable_name="history"),
        ("human", "{input}"),
    ])

    chain = prompt | llm

    return RunnableWithMessageHistory(
        chain,
        _get_session_history,
        input_messages_key="input",
        history_messages_key="history",
    )


# Singleton chain instance
_chain: RunnableWithMessageHistory | None = None


def get_triage_chain() -> RunnableWithMessageHistory:
    global _chain
    if _chain is None:
        _chain = _build_chain()
    return _chain
