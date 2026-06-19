from unittest.mock import AsyncMock, patch


def test_nutrition_plan_returns_plan(client):
    """Asserts that the plan endpoint returns a structured plan object."""
    mock_plan = [
        {"day": "Monday", "morning": "Kibble 200g", "evening": "Wet food 150g", "notes": ""}
    ]

    with patch(
        "app.domains.nutrition.services.generate_meal_plan",
        new_callable=AsyncMock,
        return_value=mock_plan,
    ):
        response = client.post("/nutrition/plan", json={"petId": "abc123"})

    assert response.status_code == 200
    data = response.json()
    assert "plan" in data
    assert isinstance(data["plan"], list)


def test_nutrition_plan_requires_pet_id(client):
    """Validates that a missing petId returns 422."""
    response = client.post("/nutrition/plan", json={})
    assert response.status_code == 422
