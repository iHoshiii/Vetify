from pydantic import BaseModel


class HistoryMessage(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    message: str
    session_id: str = "default"
    history: list[HistoryMessage] = []


class ChatResponse(BaseModel):
    reply: str
