# Aura — Astrology Consultation Mobile App

## Vision
A premium, cinematic astrology app where seekers connect with elite astrologers via chat/call, get personalised horoscopes, panchang, tarot, kundli, and compatibility — all in one atmospheric dark-gold experience.

## Tech
- Expo SDK 54 (React Native), expo-router file-based navigation
- FastAPI backend + MongoDB
- Emergent Google Auth + Phone OTP (mocked, `123456`)
- WebSocket real-time chat with **Claude Sonnet 4.6** (Emergent LLM key) for astrologer AI replies
- Mocked wallet + admin announcements panel

## Screens
- `(auth)/login` — Google + Phone OTP
- `(tabs)/index` — **Rich home dashboard**: greeting header, wallet pill, notifications, search, zodiac selector, personalised daily horoscope card (lucky color / number / mood / match), 4 quick actions, promo, Live Now astrologers with pulse animation, 8 concerns grid, Panchang card, Card of the Day tarot flip, Love Compatibility interactive, Top astrologers, Testimonials, Cosmic wisdom quote
- `(tabs)/astrologers` — filterable directory (horizontal chip row) with online status, price/min
- `(tabs)/chats` — active conversations
- `(tabs)/kundli` — daily horoscope per sign + Birth chart generator (sun/moon/ascendant + planetary positions)
- `(tabs)/profile` — user card, admin link, logout
- `astrologer/[id]` — detail with cover, metrics, bio, reviews, sticky CTA (Chat / Call)
- `chat/[id]` — WebSocket AI chat, per-message wallet deduction, typing indicator, running timer
- `call/[id]` — mocked ringing → live call UI with timer, mute/speaker/end
- `wallet` — balance card, add-money grid, transaction history
- `admin` — post/delete announcements (admin only)

## Backend endpoints
- Auth: `/api/auth/google`, `/api/auth/phone/request`, `/api/auth/phone/verify`, `/api/auth/me`, `/api/auth/logout`
- Astrologers: `/api/astrologers`, `/api/astrologers/{id}`
- Chat: `/api/chat/start/{astro_id}`, `/api/chat/{id}/messages`, `/api/chats`, WS `/api/ws/chat/{chat_id}?token=`
- Wallet: `/api/wallet`, `/api/wallet/add`
- Horoscope/Kundli: `/api/zodiacs`, `/api/horoscope/{sign}`, `/api/kundli/generate`, `/api/panchang`, `/api/card-of-the-day`, `/api/compatibility`, `/api/concerns`
- Reviews: `/api/reviews`
- Admin: `/api/announcements`, `/api/admin/announcements`, DELETE `/api/admin/announcements/{id}`
- **Aggregate**: `/api/home-dashboard?sign=` powers the home feed in a single call

## Business smart enhancement
- **Per-message wallet deduction** during chats (proxy for per-min) creates urgency + monetisation loop; first-recharge +20% bonus banner drives conversion.

## Roadmap
- Real Razorpay integration (India-first for astrology)
- Live-broadcast rooms (astrologer goes live to N users)
- Push notifications for astrologer availability
- Blog/articles & shareable horoscope cards
