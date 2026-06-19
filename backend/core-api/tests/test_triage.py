def test_triage_chat_returns_reply(client, mock_groq):
    """Checks that the triage endpoint returns a reply field."""
    response = client.post("/triage/chat", json={"message": "My dog is limping."})
    assert response.status_code == 200
    data = response.json()
    assert "reply" in data
    assert isinstance(data["reply"], str)


def test_triage_chat_empty_message(client, mock_groq):
    """Checks that an empty message returns a validation error."""
    response = client.post("/triage/chat", json={})
    assert response.status_code == 422
