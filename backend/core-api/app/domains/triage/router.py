from fastapi import APIRouter
from app.domains.triage.schemas import ChatRequest, ChatResponse
from app.domains.triage.services import run_triage

router = APIRouter(prefix="/triage", tags=["Triage"])


@router.post("/chat", response_model=ChatResponse)
async def chat_endpoint(body: ChatRequest) -> ChatResponse:
    """Receive a user message and return an AI reply via LangChain."""
    reply = await run_triage(body.message, session_id=body.session_id)
    return ChatResponse(reply=reply)
