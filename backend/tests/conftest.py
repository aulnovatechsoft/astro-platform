import os
import pytest
import requests
import secrets

BASE_URL = os.environ['EXPO_PUBLIC_BACKEND_URL'].rstrip('/')


def _fresh_phone() -> str:
    return f"+1555{secrets.randbelow(9000000) + 1000000}"


def _login_via_otp(phone: str, name: str = "TEST_User"):
    """Request OTP → verify with dev_otp → return (token, user)."""
    r = requests.post(f"{BASE_URL}/api/auth/phone/request", json={"phone": phone}, timeout=15)
    assert r.status_code == 200, r.text
    dev_otp = r.json().get("dev_otp")
    assert dev_otp and len(dev_otp) == 6, f"dev_otp missing/invalid in response: {r.json()}"
    r = requests.post(
        f"{BASE_URL}/api/auth/phone/verify",
        json={"phone": phone, "otp": dev_otp, "name": name},
        timeout=15,
    )
    assert r.status_code == 200, r.text
    d = r.json()
    return d["session_token"], d["user"]


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
    """Register a phone user via new OTP flow and return (session_token, user)."""
    token, user = _login_via_otp(_fresh_phone(), name="TEST_SessionUser")
    return token, user


@pytest.fixture
def auth_headers(user_token):
    token, _ = user_token
    return {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}


@pytest.fixture
def fresh_user():
    """Factory-style fresh user for tests that must isolate rate-limit buckets."""
    def _make(name: str = "TEST_FreshUser"):
        return _login_via_otp(_fresh_phone(), name=name)
    return _make


@pytest.fixture
def fresh_phone():
    return _fresh_phone


@pytest.fixture
def login_via_otp():
    return _login_via_otp
