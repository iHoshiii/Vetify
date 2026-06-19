import json
from app.infra.ai_clients import get_gemini_client
from app.infra.database import get_database


async def generate_meal_plan(pet_id: str) -> dict:
    """
    Fetch pet profile from MongoDB, then use Gemini to generate
    a structured JSON weekly meal plan.
    """
    db = await get_database()
    pet = await db["pets"].find_one({"_id": pet_id})

    if not pet:
        return {"error": f"Pet {pet_id} not found."}

    prompt = (
        f"Create a 7-day meal plan for a {pet.get('species', 'dog')} "
        f"named {pet.get('name', 'Unknown')}, "
        f"aged {pet.get('age', 'unknown')} years, "
        f"weighing {pet.get('weight', 'unknown')} kg. "
        "Return the plan as a JSON array with fields: day, morning, evening, notes."
    )

    client = get_gemini_client()
    response = client.generate_content(prompt)

    try:
        plan = json.loads(response.text)
    except json.JSONDecodeError:
        plan = {"raw": response.text}

    return plan
