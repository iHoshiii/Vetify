from unittest.mock import AsyncMock, patch


def test_locator_nearby_returns_list(client):
    """Tests that the nearby endpoint returns a clinics array."""
    mock_clinics = [{"_id": "1", "name": "PawCare Clinic", "location": {}}]

    with patch(
        "app.domains.locator.services.find_nearby_clinics",
        new_callable=AsyncMock,
        return_value=mock_clinics,
    ):
        response = client.get("/locator/nearby?lat=14.5995&lng=120.9842&radius=3000")

    assert response.status_code == 200
    data = response.json()
    assert "clinics" in data
    assert isinstance(data["clinics"], list)


def test_locator_requires_lat_lng(client):
    """Validates that missing coordinates returns 422."""
    response = client.get("/locator/nearby")
    assert response.status_code == 422
