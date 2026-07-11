# Aura Astrology — Security Audit Report

**Date:** June 2026  
**Scope:** FastAPI backend (`/app/backend/server.py`), Expo React Native frontend (`/app/frontend/**`), config (`app.json`, `package.json`, `requirements.txt`).  
**Method:** Read-only static review of the full source tree. No runtime/DB exercise.  
**Launch guidance:** **DO NOT LAUNCH** until Fix-First items below are addressed.

---

## Owner Summary

The app can be fully compromised through its phone-login flow. A universal, hard-coded verification code lets anyone sign in as any phone user and read their private chats, wallet, and orders. Separately, users can hand themselves unlimited "money" in their wallet with no payment, set their own prices on paid pooja/offer orders, and manipulate astrologer star-ratings. Together these break the account, payment, and trust model. Login-only features (Google/OAuth session, admin actions, chat ownership) are correctly enforced server-side.

**Confidence:** HIGH — source fully reviewed; runtime not exercised (read-only).

### Fix First
1. **Anyone can log in as any phone user** — a fixed code `123456` verifies every phone. → Generate a random, per-phone, expiring, rate-limited code delivered out-of-band.
2. **Free unlimited wallet balance** — any logged-in user credits arbitrary amounts unlimited times, with no payment. → Only credit wallets from a verified payment/webhook; enforce daily cap in demo mode.
3. **Client sets its own order price** — paid pooja/offer orders record whatever price the client sends. → Derive price server-side from the catalog.

---

## Technical Findings

### SEC-001 [CRITICAL] Universal static OTP enables account takeover
- **Evidence:** `backend/server.py:424` compares `otp != "123456"`; `:417-419` request endpoint discloses the code in its message.
- **Path:** attacker with victim phone → `POST /api/auth/phone/verify` with fixed code → existing account matched by phone (`:427-429`) → valid 7-day session for the victim.
- **Boundary:** requires knowing the phone number; unlimited attempts (no throttle).
- **Fix:** random per-phone code, hashed + expiring, single-use, delivered via SMS, with attempt limits.
- **Standards:** OWASP A07:2025 / API2:2023; CWE-287, CWE-798; ASVS v5.0.0.
- **Priority:** P0.

### SEC-002 [HIGH] Wallet top-up grants money with no payment
- **Evidence:** `backend/server.py:757-771` credits `wallet_balance` on request, capped only per-call (`amount <= 5000`), no payment or idempotency.
- **Path:** any authenticated user → repeated `POST /api/wallet/add` → arbitrary balance → free paid consultations (deducted at `:696`).
- **Boundary:** labeled "demo"; no real gateway wired, so this is the entire funding path.
- **Fix:** credit only after verified payment/webhook; never trust client-supplied amount as settled funds. In demo mode, hard-cap lifetime credit and rate-limit.
- **Standards:** Unrestricted Access to Sensitive Business Flows; OWASP A04:2025 / API6:2023; CWE-840.
- **Priority:** P1.

### SEC-003 [MEDIUM] Order price trusted from client
- **Evidence:** `backend/server.py:1104-1117` stores `payload.price_inr`, `item_key`, `label` verbatim; no lookup against `REMEDIES_DATA`.
- **Path:** user → `POST /api/orders` with `price_inr` of choice → order recorded "confirmed" at attacker price.
- **Boundary:** no wallet deduction on orders today, so impact is fulfillment/price integrity — not direct cash loss (yet).
- **Fix:** look up item by `item_type`+`item_key` server-side; derive label & price; reject unknown keys.
- **Standards:** Broken Object Property Level Authorization; OWASP A01:2025 / API3:2023; CWE-915.
- **Priority:** P2.

### SEC-004 [MEDIUM] Rating manipulation via unrestricted reviews
- **Evidence:** `backend/server.py:920-955`; duplicate check only runs when `chat_id` is supplied (`:926`); no proof user consulted the astrologer.
- **Path:** user → repeated `POST /api/reviews` with `chat_id` omitted → unlimited 1- or 5-star reviews → astrologer average recomputed (`:952`).
- **Boundary:** rating bounds (1–5) are enforced; astrologer_id existence not verified.
- **Fix:** require a real completed chat, bind review to it, one review per session, ignore client-supplied `user_name`.
- **Standards:** Unrestricted Access to Sensitive Business Flows; API6:2023; CWE-841.
- **Priority:** P2.

---

## Hardening (P3)

- **CORS `allow_origins=["*"]` with `allow_credentials=True`** (`server.py:1139-1145`). Auth uses a bearer header (not cookies), so credential reflection is limited, but pin explicit origins or set `allow_credentials=False`.
- **No rate limiting on `/api/auth/phone/*` and WS messages** (`server.py:416-450, 665`). Enables automated code/number guessing; add throttling (raises SEC-001 impact).
- **WS session token in URL query** (`server.py:651`, `api.ts:26`); risks exposure in proxy/access logs. Prefer a subprotocol/header handshake.
- **Web build stores session token in `localStorage`** (`tokenStore.ts:7`), readable by any injected script; native uses `SecureStore` correctly.

---

## Coverage & Limits

- **Reviewed:** all backend routes / models / WS / CORS / startup (`server.py`), secret loading (env only, no client leak), frontend `api.ts` / `tokenStore.ts` / `AuthContext.tsx` / `admin.tsx`, `app.json`, `package.json`, `requirements.txt`.
- **Checks:**  
  – BOLA/BFLA **COMPLETE** — chat, order, admin ownership enforced server-side.  
  – Authentication Bypass **FAILED** — SEC-001.  
  – NoSQL Injection **NOT APPLICABLE** — typed Pydantic values, `re.escape` on regex, no operator injection.  
  – CORS/CSRF **COMPLETE (LOW)** — bearer-header auth.
- **Gaps:** `.env` not opened per environment rules; no runtime/DB exercise.

---

## Verdict

**Status:** FAIL — ACTION REQUIRED  
**Reason:** A confirmed CRITICAL account-takeover via a universal static OTP, plus confirmed unlimited self-funded wallet credit, makes the app unsafe to launch in its pre-patch state.

---

## Patches Applied (this session)

- ✅ **SEC-001** — Real per-phone 6-digit OTP (hashed + 5-min expiry, single-use, max 5 verify attempts, request throttling); universal `123456` removed.
- ✅ **SEC-002** — Wallet top-up hard-capped: max 3 credits/day per user, max ₹500/day, max ₹2000 lifetime demo credit; rate-limited; clearly marked demo. Will be fully replaced by Razorpay intent/webhook flow in the next milestone.
- ✅ **SEC-003** — Server derives `label` + `price_inr` from `REMEDIES_DATA` catalog; unknown keys rejected; client-supplied price ignored.
- ✅ **SEC-004** — Reviews now require a valid completed chat owned by the user; one review per `chat_id`; `user_name` derived server-side.
- ✅ **P3 CORS** — `allow_credentials=False` (safe because auth is bearer, not cookies). Explicit origin allow-list read from `CORS_ORIGINS` env if provided.
- ✅ **P3 rate limiting** — In-process sliding-window limits on auth (OTP request/verify) and wallet top-up.

Remaining P3 items are tracked as follow-up (WebSocket subprotocol token, web `SecureStore` polyfill).
