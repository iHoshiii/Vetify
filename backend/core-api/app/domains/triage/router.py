from fastapi import APIRouter
from app.domains.triage.schemas import ChatRequest, ChatResponse
from app.domains.triage.services import run_triage

router = APIRouter(prefix="/triage", tags=["Triage"])


@router.post("/chat", response_model=ChatResponse)
async def chat_endpoint(body: ChatRequest) -> ChatResponse:
    """Receive a user message with optional history and return an AI reply."""
    history = [{"role": m.role, "content": m.content} for m in body.history]
    reply = await run_triage(body.message, history=history)
    return ChatResponse(reply=reply)
