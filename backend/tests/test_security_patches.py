"""Security regression tests for SEC-001..SEC-004 (Aura Astrology).

Covers:
 - SEC-001 Phone OTP (no universal 123456, rate-limit, single-use, lockout, per-phone rotation)
 - SEC-002 Wallet top-up caps (per-call bounds + daily count/amount)
 - SEC-003 Order price integrity (server-derived from catalog)
 - SEC-004 Reviews require a real chat with at least one message from the reviewing user
 - Non-regression sanity: astrologers, home-dashboard, remedies, auth/me
"""
import os
import json
import secrets
import time

import pytest
import requests

BASE_URL = os.environ['EXPO_PUBLIC_BACKEND_URL'].rstrip('/')
WS_URL = BASE_URL.replace("https://", "wss://").replace("http://", "ws://")


def _phone():
    return f"+1555{secrets.randbelow(9000000) + 1000000}"


def _request_otp(phone):
    return requests.post(f"{BASE_URL}/api/auth/phone/request", json={"phone": phone}, timeout=10)


def _verify(phone, otp, name=None):
    body = {"phone": phone, "otp": otp}
    if name:
        body["name"] = name
    return requests.post(f"{BASE_URL}/api/auth/phone/verify", json=body, timeout=10)


# =====================================================================
# SEC-001 : Phone OTP
# =====================================================================
class TestSEC001PhoneOTP:
    def test_universal_123456_rejected_on_fresh_phone(self):
        phone = _phone()
        # A fresh phone that never had an OTP requested must reject 123456.
        r = _verify(phone, "123456")
        assert r.status_code == 400, f"expected 400 for stale universal OTP, got {r.status_code}: {r.text}"

    def test_request_returns_dev_otp(self):
        phone = _phone()
        r = _request_otp(phone)
        assert r.status_code == 200, r.text
        body = r.json()
        assert body.get("ok") is True
        assert "dev_otp" in body, "dev_otp must be surfaced in demo mode"
        assert isinstance(body["dev_otp"], str) and len(body["dev_otp"]) == 6 and body["dev_otp"].isdigit()

    def test_verify_with_dev_otp_returns_session(self):
        phone = _phone()
        r = _request_otp(phone)
        assert r.status_code == 200, r.text
        otp = r.json()["dev_otp"]
        r2 = _verify(phone, otp, name="TEST_OTPUser")
        assert r2.status_code == 200, r2.text
        data = r2.json()
        assert "session_token" in data and data["session_token"]
        assert "user" in data and data["user"].get("phone") == phone

    def test_single_use_otp(self):
        phone = _phone()
        otp = _request_otp(phone).json()["dev_otp"]
        r1 = _verify(phone, otp)
        assert r1.status_code == 200, r1.text
        # Re-using the same OTP must fail (already burned).
        r2 = _verify(phone, otp)
        assert r2.status_code == 400, f"expected 400 on reuse, got {r2.status_code}"

    def test_five_wrong_attempts_lock_out(self):
        phone = _phone()
        _request_otp(phone)
        # Send 5 wrong OTPs — the 5th (or by rule >=5) triggers lockout.
        last_status = None
        last_detail = None
        for i in range(6):
            r = _verify(phone, "000000")
            last_status = r.status_code
            try:
                last_detail = r.json().get("detail", "")
            except Exception:
                last_detail = r.text
            # every attempt returns 400 (invalid OTP), then a lockout 400 with different message
            assert r.status_code == 400, f"attempt {i}: got {r.status_code} {r.text}"
        assert "attempts" in (last_detail or "").lower() or "request a new code" in (last_detail or "").lower(), \
            f"expected lockout detail after 6 wrong tries, got: {last_detail}"

    def test_rate_limit_on_request(self):
        phone = _phone()
        statuses = []
        for _ in range(4):
            r = _request_otp(phone)
            statuses.append(r.status_code)
        # 3 requests per 10 min per phone; 4th must be 429.
        assert statuses[:3] == [200, 200, 200], f"first 3 should succeed, got {statuses}"
        assert statuses[3] == 429, f"4th request should hit rate limit, got {statuses[3]}"

    def test_two_phones_get_different_otps(self):
        p1, p2 = _phone(), _phone()
        o1 = _request_otp(p1).json()["dev_otp"]
        o2 = _request_otp(p2).json()["dev_otp"]
        # Overwhelmingly likely to differ (1-in-1e6 flake tolerated).
        assert o1 != o2, f"two phones returned same OTP {o1} (probabilistic)"
        # Cross-check: OTP for p1 cannot verify p2 (per-phone hash pepper).
        r = _verify(p2, o1)
        assert r.status_code == 400


# =====================================================================
# SEC-002 : Wallet top-up caps
# =====================================================================
class TestSEC002WalletCaps:
    def _fresh_token(self):
        phone = _phone()
        otp = _request_otp(phone).json()["dev_otp"]
        return _verify(phone, otp, name="TEST_Wallet").json()["session_token"]

    def _add(self, token, amount):
        return requests.post(
            f"{BASE_URL}/api/wallet/add",
            json={"amount": amount},
            headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
            timeout=10,
        )

    def test_zero_amount_rejected(self):
        token = self._fresh_token()
        r = self._add(token, 0)
        assert r.status_code == 400, r.text

    def test_per_call_over_cap_rejected(self):
        token = self._fresh_token()
        r = self._add(token, 99999)
        assert r.status_code == 400, r.text

    def test_negative_amount_rejected(self):
        token = self._fresh_token()
        r = self._add(token, -50)
        assert r.status_code == 400, r.text

    def test_daily_count_and_amount_caps(self):
        """Fresh user: 3 x 100 succeed → 4th blocked as 429 (daily count)."""
        token = self._fresh_token()
        results = []
        for _ in range(3):
            r = self._add(token, 100)
            results.append(r.status_code)
        assert results == [200, 200, 200], f"expected 3 successful top-ups, got {results}"
        r4 = self._add(token, 100)
        assert r4.status_code == 429, f"4th top-up must hit daily cap, got {r4.status_code} {r4.text}"

    def test_daily_amount_cap_when_close_to_limit(self):
        """3 x 200 = 600 should hit the 500-INR daily cap on the last one."""
        token = self._fresh_token()
        r1 = self._add(token, 200)
        r2 = self._add(token, 200)
        assert r1.status_code == 200 and r2.status_code == 200, (r1.text, r2.text)
        r3 = self._add(token, 200)
        # Third pushes total to 600 > 500 daily cap → 429
        assert r3.status_code == 429, f"expected 429 on daily amount cap, got {r3.status_code} {r3.text}"


# =====================================================================
# SEC-003 : Order price integrity
# =====================================================================
class TestSEC003OrderPriceIntegrity:
    @pytest.fixture(scope="class")
    def token(self):
        phone = _phone()
        otp = _request_otp(phone).json()["dev_otp"]
        return _verify(phone, otp, name="TEST_Orders").json()["session_token"]

    def _headers(self, token):
        return {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}

    def test_price_and_label_derived_from_catalog(self, token):
        payload = {
            "item_type": "pooja",
            "item_key": "pooja",
            "label": "Fake",
            "price_inr": 1,
            "notes": "TEST_hack",
        }
        r = requests.post(f"{BASE_URL}/api/orders", json=payload, headers=self._headers(token), timeout=10)
        assert r.status_code == 200, r.text
        order = r.json()
        assert order["price_inr"] == 1100, f"price must be catalog 1100, got {order['price_inr']}"
        assert order["label"] == "Pooja", f"label must be catalog 'Pooja', got {order['label']}"
        assert order["item_key"] == "pooja"

    def test_unknown_item_key_404(self, token):
        r = requests.post(
            f"{BASE_URL}/api/orders",
            json={"item_type": "pooja", "item_key": "does-not-exist", "label": "x", "price_inr": 10},
            headers=self._headers(token),
            timeout=10,
        )
        assert r.status_code == 404, f"expected 404 for unknown item, got {r.status_code} {r.text}"

    def test_invalid_item_type_400(self, token):
        r = requests.post(
            f"{BASE_URL}/api/orders",
            json={"item_type": "hack", "item_key": "pooja", "label": "x", "price_inr": 10},
            headers=self._headers(token),
            timeout=10,
        )
        assert r.status_code == 400, f"expected 400 for bad item_type, got {r.status_code} {r.text}"


# =====================================================================
# SEC-004 : Reviews require a real chat + message
# =====================================================================
class TestSEC004Reviews:
    @pytest.fixture(scope="class")
    def user_a(self):
        phone = _phone()
        otp = _request_otp(phone).json()["dev_otp"]
        d = _verify(phone, otp, name="TEST_ReviewerA").json()
        return d["session_token"], d["user"]

    @pytest.fixture(scope="class")
    def user_b(self):
        phone = _phone()
        otp = _request_otp(phone).json()["dev_otp"]
        d = _verify(phone, otp, name="TEST_ReviewerB").json()
        return d["session_token"], d["user"]

    def _h(self, token):
        return {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}

    def _start_chat(self, token, astro_id="astro_1"):
        r = requests.post(f"{BASE_URL}/api/chat/start/{astro_id}", headers=self._h(token), timeout=10)
        assert r.status_code == 200, r.text
        return r.json()["chat_id"]

    def test_missing_chat_id_400(self, user_a):
        token, _ = user_a
        r = requests.post(
            f"{BASE_URL}/api/reviews",
            json={"astrologer_id": "astro_1", "rating": 5, "comment": "no chat"},
            headers=self._h(token),
            timeout=10,
        )
        assert r.status_code == 400, f"expected 400 without chat_id, got {r.status_code} {r.text}"

    def test_fake_chat_id_404_or_403(self, user_a):
        token, _ = user_a
        r = requests.post(
            f"{BASE_URL}/api/reviews",
            json={"chat_id": "fake_chat_123", "astrologer_id": "astro_1", "rating": 5, "comment": "x"},
            headers=self._h(token),
            timeout=10,
        )
        assert r.status_code in (403, 404), f"expected 403/404 for fake chat, got {r.status_code} {r.text}"

    def test_real_chat_but_no_messages_400(self, user_a):
        token, _ = user_a
        # Start a NEW chat (still contains only server greeting from astrologer, no user msg)
        # Note: the endpoint reuses an active chat; but if user_a has none yet (no WS use), that's fine.
        chat_id = self._start_chat(token, astro_id="astro_2")
        r = requests.post(
            f"{BASE_URL}/api/reviews",
            json={"chat_id": chat_id, "astrologer_id": "astro_2", "rating": 5, "comment": "no msg"},
            headers=self._h(token),
            timeout=10,
        )
        assert r.status_code == 400, f"expected 400 when no user message, got {r.status_code} {r.text}"

    def test_review_after_ws_message_success_then_duplicate_409(self, user_a):
        token, _ = user_a
        try:
            import websocket
        except ImportError:
            pytest.skip("websocket-client not installed")

        chat_id = self._start_chat(token, astro_id="astro_1")
        ws = websocket.create_connection(f"{WS_URL}/api/ws/chat/{chat_id}?token={token}", timeout=30)
        ws.send(json.dumps({"text": "hi review test"}))
        # Wait for user echo (short-circuit — no need to wait for AI reply)
        got_user = False
        for _ in range(15):
            try:
                ws.settimeout(30)
                data = json.loads(ws.recv())
            except Exception:
                break
            if data.get("type") == "message" and data.get("message", {}).get("sender") == "user":
                got_user = True
                break
        ws.close()
        assert got_user, "user echo not received over WS"

        r = requests.post(
            f"{BASE_URL}/api/reviews",
            json={"chat_id": chat_id, "astrologer_id": "astro_1", "rating": 5, "comment": "TEST_review_ok"},
            headers=self._h(token),
            timeout=10,
        )
        assert r.status_code == 200, f"expected 200 on valid review, got {r.status_code} {r.text}"
        assert r.json().get("rating") == 5

        # Second review for same chat_id must be 409
        r2 = requests.post(
            f"{BASE_URL}/api/reviews",
            json={"chat_id": chat_id, "astrologer_id": "astro_1", "rating": 4, "comment": "dup"},
            headers=self._h(token),
            timeout=10,
        )
        assert r2.status_code == 409, f"expected 409 on duplicate review, got {r2.status_code} {r2.text}"

    @pytest.mark.parametrize("bad_rating", [0, 6, -1, 99])
    def test_rating_out_of_range_400(self, user_a, bad_rating):
        token, _ = user_a
        # Use any chat_id — validation should fire before chat lookup
        r = requests.post(
            f"{BASE_URL}/api/reviews",
            json={"chat_id": "anything", "astrologer_id": "astro_1", "rating": bad_rating, "comment": "x"},
            headers=self._h(token),
            timeout=10,
        )
        assert r.status_code in (400, 422), f"expected 400/422 for rating={bad_rating}, got {r.status_code}"

    def test_cross_user_review_forbidden(self, user_a, user_b):
        """User B must not be able to review a chat owned by User A."""
        token_a, _ = user_a
        token_b, _ = user_b
        chat_id = self._start_chat(token_a, astro_id="astro_3")
        r = requests.post(
            f"{BASE_URL}/api/reviews",
            json={"chat_id": chat_id, "astrologer_id": "astro_3", "rating": 5, "comment": "hijack"},
            headers=self._h(token_b),
            timeout=10,
        )
        assert r.status_code == 403, f"expected 403 for cross-user review, got {r.status_code} {r.text}"


# =====================================================================
# Non-regression sanity
# =====================================================================
class TestNonRegression:
    def test_astrologers_list(self):
        r = requests.get(f"{BASE_URL}/api/astrologers", timeout=10)
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data, list) and len(data) >= 6

    def test_home_dashboard(self):
        r = requests.get(f"{BASE_URL}/api/home-dashboard", timeout=10)
        assert r.status_code == 200
        d = r.json()
        for k in ["horoscope", "panchang", "card_of_the_day", "live_astrologers",
                  "top_astrologers", "testimonials", "wisdom", "concerns"]:
            assert k in d, f"home-dashboard missing {k}"

    def test_remedies(self):
        r = requests.get(f"{BASE_URL}/api/remedies", timeout=10)
        assert r.status_code == 200
        d = r.json()
        for k in ["offers", "store", "poojas", "top_selling", "newly_launched", "doshas"]:
            assert k in d

    def test_auth_me_ok(self):
        phone = _phone()
        otp = _request_otp(phone).json()["dev_otp"]
        token = _verify(phone, otp).json()["session_token"]
        r = requests.get(
            f"{BASE_URL}/api/auth/me",
            headers={"Authorization": f"Bearer {token}"},
            timeout=10,
        )
        assert r.status_code == 200
        assert r.json().get("phone") == phone

    def test_auth_me_no_token_401(self):
        r = requests.get(f"{BASE_URL}/api/auth/me", timeout=10)
        assert r.status_code == 401
