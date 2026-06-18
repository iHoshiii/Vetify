from fastapi import APIRouter
from pydantic import BaseModel
from app.domains.nutrition.services import generate_meal_plan

router = APIRouter(prefix="/nutrition", tags=["Nutrition"])


class PlanRequest(BaseModel):
    petId: str


@router.post("/plan")
async def create_meal_plan(body: PlanRequest):
    """Generate a structured nutrition plan for a given pet."""
    plan = await generate_meal_plan(body.petId)
    return {"plan": plan}
