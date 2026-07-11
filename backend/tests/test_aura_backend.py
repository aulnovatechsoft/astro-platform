import os
import json
import asyncio
import pytest
import requests

BASE_URL = os.environ.get('EXPO_PUBLIC_BACKEND_URL', 'https://cosmic-chat-53.preview.emergentagent.com').rstrip('/')
WS_URL = BASE_URL.replace("https://", "wss://").replace("http://", "ws://")


# ---------- Health ----------
def test_health():
    r = requests.get(f"{BASE_URL}/api/", timeout=10)
    assert r.status_code == 200
    assert r.json().get('status') == 'ok'


# ---------- Astrologers ----------
def test_list_astrologers():
    r = requests.get(f"{BASE_URL}/api/astrologers", timeout=10)
    assert r.status_code == 200
    data = r.json()
    assert isinstance(data, list)
    assert len(data) >= 6
    a = data[0]
    for f in ['name', 'rating', 'price_per_min', 'is_online', 'specialties']:
        assert f in a, f"missing field {f}"


def test_get_astro_detail_with_reviews():
    r = requests.get(f"{BASE_URL}/api/astrologers/astro_1", timeout=10)
    assert r.status_code == 200
    d = r.json()
    assert d['astrologer_id'] == 'astro_1'
    assert 'reviews' in d and isinstance(d['reviews'], list)


def test_astro_filter_tarot():
    r = requests.get(f"{BASE_URL}/api/astrologers?specialty=Tarot", timeout=10)
    assert r.status_code == 200
    data = r.json()
    assert len(data) > 0
    for a in data:
        assert any(s.lower() == 'tarot' for s in a['specialties'])


# ---------- Auth ----------
def test_phone_request_ok():
    r = requests.post(f"{BASE_URL}/api/auth/phone/request", json={"phone": "+15550001111"}, timeout=10)
    assert r.status_code == 200
    assert r.json().get('ok') is True


def test_phone_verify_ok_and_wallet_50():
    phone = f"+1555000{os.urandom(2).hex()}"
    r = requests.post(f"{BASE_URL}/api/auth/phone/verify", json={"phone": phone, "otp": "123456", "name": "TEST_walletcheck"}, timeout=10)
    assert r.status_code == 200
    d = r.json()
    assert 'session_token' in d
    assert d['user']['wallet_balance'] == 50.0


def test_phone_verify_bad_otp():
    r = requests.post(f"{BASE_URL}/api/auth/phone/verify", json={"phone": "+15559999999", "otp": "000000"}, timeout=10)
    assert r.status_code == 400


def test_auth_me(user_token):
    token, user = user_token
    r = requests.get(f"{BASE_URL}/api/auth/me", headers={"Authorization": f"Bearer {token}"}, timeout=10)
    assert r.status_code == 200
    assert r.json()['user_id'] == user['user_id']


# ---------- Zodiac / Horoscope / Kundli ----------
def test_zodiacs():
    r = requests.get(f"{BASE_URL}/api/zodiacs", timeout=10)
    assert r.status_code == 200
    z = r.json()
    assert len(z) == 12
    # Regression (Bug #1): every zodiac must expose an image URL
    for entry in z:
        assert 'image' in entry, f"zodiac {entry.get('sign')} missing 'image'"
        assert isinstance(entry['image'], str) and entry['image'].startswith('http'), \
            f"zodiac {entry.get('sign')} has invalid image URL: {entry.get('image')}"


def test_home_dashboard_leo_concerns_have_images():
    """Regression (Bug #2): home-dashboard concerns[] must include image URLs."""
    r = requests.get(f"{BASE_URL}/api/home-dashboard", params={"sign": "Leo"}, timeout=10)
    assert r.status_code == 200
    d = r.json()
    assert d['horoscope']['sign'] == 'Leo'
    concerns = d.get('concerns') or []
    assert len(concerns) >= 6, f"expected concerns list, got {len(concerns)}"
    keys = {c['key'] for c in concerns}
    for expected in ['love', 'career', 'marriage', 'money', 'health', 'family']:
        assert expected in keys, f"missing concern key {expected}"
    for c in concerns:
        assert 'image' in c, f"concern {c.get('key')} missing 'image'"
        assert isinstance(c['image'], str) and c['image'].startswith('http'), \
            f"concern {c.get('key')} has invalid image URL: {c.get('image')}"


def test_home_dashboard_panchang_shape():
    """Regression (Bug #3): panchang must have all 6 fields for the compact ribbon."""
    r = requests.get(f"{BASE_URL}/api/home-dashboard", params={"sign": "Aries"}, timeout=10)
    assert r.status_code == 200
    p = r.json().get('panchang') or {}
    for k in ['tithi', 'nakshatra', 'sunrise', 'sunset', 'rahu_kaal', 'abhijit']:
        assert k in p and p[k], f"panchang missing/empty {k}"


def test_horoscope_aries():
    r = requests.get(f"{BASE_URL}/api/horoscope/Aries", timeout=10)
    assert r.status_code == 200
    d = r.json()
    assert d['sign'] == 'Aries'
    assert 'reading' in d and len(d['reading']) > 0


def test_kundli_generate(auth_headers):
    payload = {"name": "TEST_kundli", "date": "1995-04-15", "time": "10:30", "place": "Delhi"}
    r = requests.post(f"{BASE_URL}/api/kundli/generate", json=payload, headers=auth_headers, timeout=10)
    assert r.status_code == 200, r.text
    d = r.json()
    assert d['sun_sign'] == 'Aries'
    assert isinstance(d['planets'], list) and len(d['planets']) > 0


# ---------- Chat ----------
@pytest.fixture(scope="module")
def chat_id_holder():
    return {}


def test_chat_start(auth_headers, chat_id_holder):
    r = requests.post(f"{BASE_URL}/api/chat/start/astro_1", headers=auth_headers, timeout=10)
    assert r.status_code == 200, r.text
    d = r.json()
    assert 'chat_id' in d
    chat_id_holder['id'] = d['chat_id']


def test_get_chat_messages(auth_headers, chat_id_holder):
    assert 'id' in chat_id_holder, "chat_id not set from prior test"
    cid = chat_id_holder['id']
    r = requests.get(f"{BASE_URL}/api/chat/{cid}/messages", headers=auth_headers, timeout=10)
    assert r.status_code == 200
    msgs = r.json()
    assert isinstance(msgs, list) and len(msgs) >= 1  # greeting
    assert msgs[0]['sender'] == 'astrologer'


def test_list_chats(auth_headers):
    r = requests.get(f"{BASE_URL}/api/chats", headers=auth_headers, timeout=10)
    assert r.status_code == 200
    chats = r.json()
    assert isinstance(chats, list) and len(chats) >= 1
    assert 'astrologer' in chats[0]
    assert 'last_message' in chats[0]


# ---------- Wallet ----------
def test_wallet_get(auth_headers):
    r = requests.get(f"{BASE_URL}/api/wallet", headers=auth_headers, timeout=10)
    assert r.status_code == 200
    d = r.json()
    assert 'balance' in d
    assert 'transactions' in d


def test_wallet_add(auth_headers):
    r0 = requests.get(f"{BASE_URL}/api/wallet", headers=auth_headers, timeout=10)
    before = r0.json()['balance']
    r = requests.post(f"{BASE_URL}/api/wallet/add", json={"amount": 25}, headers=auth_headers, timeout=10)
    assert r.status_code == 200, r.text
    after = r.json()['balance']
    assert round(after - before, 2) == 25.0


def test_wallet_add_negative(auth_headers):
    r = requests.post(f"{BASE_URL}/api/wallet/add", json={"amount": -10}, headers=auth_headers, timeout=10)
    assert r.status_code == 400


# ---------- Announcements ----------
def test_announcements_list():
    r = requests.get(f"{BASE_URL}/api/announcements", timeout=10)
    assert r.status_code == 200
    assert isinstance(r.json(), list)


def test_admin_endpoint_requires_admin(auth_headers):
    r = requests.post(f"{BASE_URL}/api/admin/announcements", json={"title": "TEST_x", "body": "y"}, headers=auth_headers, timeout=10)
    assert r.status_code in (401, 403)


def test_admin_endpoint_no_auth():
    r = requests.post(f"{BASE_URL}/api/admin/announcements", json={"title": "TEST_x", "body": "y"}, timeout=10)
    assert r.status_code in (401, 403)


# ---------- WebSocket ----------
def test_websocket_chat_ai_reply(user_token):
    """Send hi over WS, expect user message + astrologer AI reply and wallet deduction."""
    try:
        import websocket  # websocket-client
    except ImportError:
        pytest.skip("websocket-client not installed")

    token, _ = user_token
    # Ensure chat exists
    r = requests.post(f"{BASE_URL}/api/chat/start/astro_1", headers={"Authorization": f"Bearer {token}"}, timeout=10)
    assert r.status_code == 200
    chat_id = r.json()['chat_id']

    # Get wallet before
    w_before = requests.get(f"{BASE_URL}/api/wallet", headers={"Authorization": f"Bearer {token}"}, timeout=10).json()['balance']

    ws_url = f"{WS_URL}/api/ws/chat/{chat_id}?token={token}"
    ws = websocket.create_connection(ws_url, timeout=30)
    ws.send(json.dumps({"text": "hi"}))

    got_user = False
    got_astrologer = False
    new_balance = None
    for _ in range(15):
        try:
            ws.settimeout(30)
            frame = ws.recv()
        except Exception:
            break
        try:
            data = json.loads(frame)
        except Exception:
            continue
        if data.get('type') == 'message':
            msg = data.get('message', {})
            if msg.get('sender') == 'user':
                got_user = True
                if 'wallet_balance' in data:
                    new_balance = data['wallet_balance']
            elif msg.get('sender') == 'astrologer' and got_user:
                # skip greeting - only after we sent
                got_astrologer = True
                break
    ws.close()

    assert got_user, "user echo message not received"
    assert got_astrologer, "AI astrologer reply not received"
    if new_balance is not None:
        assert new_balance < w_before, f"wallet not deducted: before={w_before} after={new_balance}"
