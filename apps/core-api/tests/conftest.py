import pytest
from fastapi.testclient import TestClient
from unittest.mock import AsyncMock, patch
from app.main import app


@pytest.fixture
def client():
    """FastAPI test client."""
    return TestClient(app)


@pytest.fixture
def mock_groq():
    """Mock Groq AI client to avoid real API calls."""
    with patch("app.infra.ai_clients.get_groq_client") as mock:
        instance = mock.return_value
        instance.chat.completions.create.return_value.choices = [
            type("Choice", (), {"message": type("Msg", (), {"content": "Mocked reply"})()})()
        ]
        yield mock


@pytest.fixture
def mock_db():
    """Mock MongoDB database connection."""
    with patch("app.infra.database.get_database", new_callable=AsyncMock) as mock:
        yield mock
