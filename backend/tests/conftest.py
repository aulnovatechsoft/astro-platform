import os
import pytest
import requests

BASE_URL = os.environ.get('EXPO_PUBLIC_BACKEND_URL', 'https://cosmic-chat-53.preview.emergentagent.com').rstrip('/')


@pytest.fixture(scope="session")
def base_url():
    return BASE_URL


@pytest.fixture
def api_client():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture(scope="session")
def user_token():
    """Register a phone user and return session_token."""
    phone = "+15551234567"
    r = requests.post(f"{BASE_URL}/api/auth/phone/request", json={"phone": phone}, timeout=15)
    assert r.status_code == 200
    r = requests.post(f"{BASE_URL}/api/auth/phone/verify", json={"phone": phone, "otp": "123456", "name": "TEST_User"}, timeout=15)
    assert r.status_code == 200, r.text
    data = r.json()
    return data['session_token'], data['user']


@pytest.fixture
def auth_headers(user_token):
    token, _ = user_token
    return {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
