from fastapi import FastAPI, APIRouter, HTTPException, Header, WebSocket, WebSocketDisconnect, Query, Depends
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import asyncio
import uuid
import json
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional, Dict
from datetime import datetime, timezone, timedelta
import httpx

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

EMERGENT_LLM_KEY = os.environ.get('EMERGENT_LLM_KEY', '')
ADMIN_EMAILS = set(e.strip().lower() for e in os.environ.get('ADMIN_EMAILS', '').split(',') if e.strip())

app = FastAPI()
api_router = APIRouter(prefix="/api")

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# ---------- Utils ----------
def utcnow():
    return datetime.now(timezone.utc)

def normalize_dt(dt):
    if dt is None:
        return None
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt

async def get_user_by_token(authorization: Optional[str]) -> Optional[dict]:
    if not authorization or not authorization.startswith('Bearer '):
        return None
    token = authorization[7:]
    session = await db.user_sessions.find_one({"session_token": token}, {"_id": 0})
    if not session:
        return None
    if normalize_dt(session.get('expires_at')) < utcnow():
        return None
    user = await db.users.find_one({"user_id": session['user_id']}, {"_id": 0})
    return user

async def require_user(authorization: Optional[str] = Header(None)) -> dict:
    user = await get_user_by_token(authorization)
    if not user:
        raise HTTPException(status_code=401, detail="Unauthorized")
    return user

async def require_admin(authorization: Optional[str] = Header(None)) -> dict:
    user = await require_user(authorization)
    if not user.get('is_admin'):
        raise HTTPException(status_code=403, detail="Admin only")
    return user

# ---------- Models ----------
class GoogleAuthPayload(BaseModel):
    session_token: str

class PhoneOtpRequest(BaseModel):
    phone: str

class PhoneOtpVerify(BaseModel):
    phone: str
    otp: str
    name: Optional[str] = None

class SendMessage(BaseModel):
    text: str

class AddMoney(BaseModel):
    amount: float

class AdminMessageCreate(BaseModel):
    title: str
    body: str

class BirthDetails(BaseModel):
    name: str
    date: str  # YYYY-MM-DD
    time: str  # HH:MM
    place: str

class ReviewCreate(BaseModel):
    astrologer_id: str
    rating: int
    comment: str
    chat_id: Optional[str] = None

# ---------- Seed Data ----------
SEED_ASTROLOGERS = [
    {
        "astrologer_id": "astro_1",
        "name": "Anaya Sharma",
        "gender": "female",
        "avatar": "https://images.unsplash.com/photo-1773595034105-4a53b9280308?crop=entropy&cs=srgb&fm=jpg&w=400&q=80",
        "specialties": ["Vedic", "Marriage", "Career"],
        "languages": ["English", "Hindi"],
        "experience_years": 12,
        "rating": 4.9,
        "reviews_count": 2340,
        "price_per_min": 25.0,
        "bio": "Award-winning Vedic astrologer with over a decade of experience in relationship and career readings. Anaya blends classical Jyotish with modern intuition.",
        "is_online": True,
        "orders": 5820,
    },
    {
        "astrologer_id": "astro_2",
        "name": "Rowan Vale",
        "gender": "female",
        "avatar": "https://images.unsplash.com/photo-1628479941723-0859e4b844c6?crop=entropy&cs=srgb&fm=jpg&w=400&q=80",
        "specialties": ["Tarot", "Love", "Intuitive"],
        "languages": ["English"],
        "experience_years": 8,
        "rating": 4.8,
        "reviews_count": 1560,
        "price_per_min": 30.0,
        "bio": "Rowan is an intuitive tarot reader guiding clients through matters of the heart with clarity, warmth, and honesty.",
        "is_online": True,
        "orders": 3210,
    },
    {
        "astrologer_id": "astro_3",
        "name": "Kabir Rathore",
        "gender": "male",
        "avatar": "https://images.unsplash.com/photo-1552058544-f2b08422138a?w=400&q=80",
        "specialties": ["Numerology", "Business", "Finance"],
        "languages": ["English", "Hindi", "Marathi"],
        "experience_years": 15,
        "rating": 4.7,
        "reviews_count": 3120,
        "price_per_min": 22.0,
        "bio": "Numerologist and business consultant. Kabir helps entrepreneurs align their names, dates, and decisions with prosperity.",
        "is_online": False,
        "orders": 7100,
    },
    {
        "astrologer_id": "astro_4",
        "name": "Selene Moon",
        "gender": "female",
        "avatar": "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400&q=80",
        "specialties": ["Palmistry", "Face Reading", "Spiritual Healing"],
        "languages": ["English", "Spanish"],
        "experience_years": 10,
        "rating": 4.9,
        "reviews_count": 980,
        "price_per_min": 35.0,
        "bio": "Selene reads palms, faces, and auras with a healer's touch, guiding clients back to their spiritual center.",
        "is_online": True,
        "orders": 2140,
    },
    {
        "astrologer_id": "astro_5",
        "name": "Arjun Deshmukh",
        "gender": "male",
        "avatar": "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&q=80",
        "specialties": ["KP System", "Career", "Education"],
        "languages": ["English", "Hindi"],
        "experience_years": 20,
        "rating": 4.8,
        "reviews_count": 4200,
        "price_per_min": 40.0,
        "bio": "Two decades of KP astrology. Arjun offers razor-sharp career and education timing predictions.",
        "is_online": True,
        "orders": 9450,
    },
    {
        "astrologer_id": "astro_6",
        "name": "Iris Nightingale",
        "gender": "female",
        "avatar": "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=400&q=80",
        "specialties": ["Tarot", "Dream Interpretation"],
        "languages": ["English"],
        "experience_years": 6,
        "rating": 4.6,
        "reviews_count": 720,
        "price_per_min": 18.0,
        "bio": "Iris weaves tarot with dream symbolism to reveal what the subconscious already knows.",
        "is_online": False,
        "orders": 1420,
    },
    {
        "astrologer_id": "astro_7",
        "name": "Master Chen Wei",
        "gender": "male",
        "avatar": "https://images.unsplash.com/photo-1519058082700-08a0b56da9b4?w=400&q=80",
        "specialties": ["Face Reading", "Vedic", "Career"],
        "languages": ["English", "Mandarin"],
        "experience_years": 22,
        "rating": 4.9,
        "reviews_count": 2870,
        "price_per_min": 45.0,
        "bio": "Master Chen practices Mien Shiang — the ancient art of face reading — combined with Vedic wisdom to reveal life patterns hidden in your features.",
        "is_online": True,
        "orders": 6320,
    },
    {
        "astrologer_id": "astro_8",
        "name": "Maya Ferreira",
        "gender": "female",
        "avatar": "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=401&q=80",
        "specialties": ["Palmistry", "Numerology"],
        "languages": ["English", "Portuguese"],
        "experience_years": 9,
        "rating": 4.7,
        "reviews_count": 1180,
        "price_per_min": 28.0,
        "bio": "Maya combines the intuitive lines of the palm with the precision of numerology to guide you through pivotal decisions.",
        "is_online": True,
        "orders": 2650,
    },
]

ZODIAC = [
    {"sign": "Aries",       "glyph": "\u2648", "dates": "Mar 21 - Apr 19", "element": "Fire",  "image": "https://images.unsplash.com/photo-1533928298208-27ff66555d8d?w=300&h=300&fit=crop&q=80"},
    {"sign": "Taurus",      "glyph": "\u2649", "dates": "Apr 20 - May 20", "element": "Earth", "image": "https://images.unsplash.com/photo-1516467508483-a7212febe31a?w=300&h=300&fit=crop&q=80"},
    {"sign": "Gemini",      "glyph": "\u264A", "dates": "May 21 - Jun 20", "element": "Air",   "image": "https://images.unsplash.com/photo-1509515837298-2c67a3933321?w=300&h=300&fit=crop&q=80"},
    {"sign": "Cancer",      "glyph": "\u264B", "dates": "Jun 21 - Jul 22", "element": "Water", "image": "https://images.unsplash.com/photo-1527842891421-42eec6e703ea?w=300&h=300&fit=crop&q=80"},
    {"sign": "Leo",         "glyph": "\u264C", "dates": "Jul 23 - Aug 22", "element": "Fire",  "image": "https://images.unsplash.com/photo-1546182990-dffeafbe841d?w=300&h=300&fit=crop&q=80"},
    {"sign": "Virgo",       "glyph": "\u264D", "dates": "Aug 23 - Sep 22", "element": "Earth", "image": "https://images.unsplash.com/photo-1476231682828-37e571bc172f?w=300&h=300&fit=crop&q=80"},
    {"sign": "Libra",       "glyph": "\u264E", "dates": "Sep 23 - Oct 22", "element": "Air",   "image": "https://images.unsplash.com/photo-1522441815192-d9f04eb0615c?w=300&h=300&fit=crop&q=80"},
    {"sign": "Scorpio",     "glyph": "\u264F", "dates": "Oct 23 - Nov 21", "element": "Water", "image": "https://images.unsplash.com/photo-1470240731273-7821a6eeb6bd?w=300&h=300&fit=crop&q=80"},
    {"sign": "Sagittarius", "glyph": "\u2650", "dates": "Nov 22 - Dec 21", "element": "Fire",  "image": "https://images.unsplash.com/photo-1470813740244-df37b8c1edcb?w=300&h=300&fit=crop&q=80"},
    {"sign": "Capricorn",   "glyph": "\u2651", "dates": "Dec 22 - Jan 19", "element": "Earth", "image": "https://images.unsplash.com/photo-1500595046743-cd271d694d30?w=300&h=300&fit=crop&q=80"},
    {"sign": "Aquarius",    "glyph": "\u2652", "dates": "Jan 20 - Feb 18", "element": "Air",   "image": "https://images.unsplash.com/photo-1524055988636-436cfa46e59e?w=300&h=300&fit=crop&q=80"},
    {"sign": "Pisces",      "glyph": "\u2653", "dates": "Feb 19 - Mar 20", "element": "Water", "image": "https://images.unsplash.com/photo-1524704654690-b56c05c78a00?w=300&h=300&fit=crop&q=80"},
]

DAILY_HOROSCOPE = {
    "Aries":       {"reading": "Mars fuels bold moves today. Trust the spark, but breathe before you speak.", "lucky_color": "Crimson", "lucky_number": 9, "mood": "Fired up", "compat": "Leo"},
    "Taurus":      {"reading": "Venus rewards patience. A quiet decision today plants a lasting seed.", "lucky_color": "Emerald", "lucky_number": 6, "mood": "Grounded", "compat": "Virgo"},
    "Gemini":      {"reading": "Two paths appear. Choose the one that lets you keep learning.", "lucky_color": "Saffron", "lucky_number": 5, "mood": "Curious", "compat": "Libra"},
    "Cancer":      {"reading": "The moon softens a heavy conversation. Lead with tenderness.", "lucky_color": "Pearl", "lucky_number": 2, "mood": "Tender", "compat": "Pisces"},
    "Leo":         {"reading": "You are seen. Share your gift without shrinking it to fit others.", "lucky_color": "Gold", "lucky_number": 1, "mood": "Radiant", "compat": "Sagittarius"},
    "Virgo":       {"reading": "Details matter, but so does rest. Finish one thing, then close the laptop.", "lucky_color": "Olive", "lucky_number": 4, "mood": "Focused", "compat": "Capricorn"},
    "Libra":       {"reading": "Balance returns through honesty. Say the true thing gently.", "lucky_color": "Rose", "lucky_number": 7, "mood": "Harmonious", "compat": "Aquarius"},
    "Scorpio":     {"reading": "A closed door has already opened elsewhere. Look sideways.", "lucky_color": "Wine", "lucky_number": 8, "mood": "Intense", "compat": "Cancer"},
    "Sagittarius": {"reading": "Jupiter widens your view. Say yes to the invitation that stretches you.", "lucky_color": "Amber", "lucky_number": 3, "mood": "Adventurous", "compat": "Aries"},
    "Capricorn":   {"reading": "Saturn confirms your foundation. Build one more brick, no rush.", "lucky_color": "Charcoal", "lucky_number": 10, "mood": "Steady", "compat": "Taurus"},
    "Aquarius":    {"reading": "Your idea is not too strange. Send the message.", "lucky_color": "Sky", "lucky_number": 11, "mood": "Inventive", "compat": "Gemini"},
    "Pisces":      {"reading": "Neptune whispers. Journal before you scroll.", "lucky_color": "Sea foam", "lucky_number": 12, "mood": "Dreamy", "compat": "Scorpio"},
}

TAROT_DECK = [
    {"name": "The Star", "meaning": "Hope, renewal, quiet faith after a storm."},
    {"name": "The Moon", "meaning": "Trust your intuition; not everything is as it appears."},
    {"name": "The Sun", "meaning": "Joy, clarity, and a well-lit path forward."},
    {"name": "The Empress", "meaning": "Abundance, nurture, creative fertility."},
    {"name": "The Lovers", "meaning": "A choice made from the heart aligns your future."},
    {"name": "The Chariot", "meaning": "Willpower and focus deliver you across a threshold."},
    {"name": "The Hermit", "meaning": "Solitude reveals what the crowd was drowning out."},
    {"name": "Wheel of Fortune", "meaning": "Change is arriving — meet it with an open hand."},
    {"name": "Strength", "meaning": "Softness is a form of power today."},
    {"name": "Justice", "meaning": "Balance is being restored — speak your truth."},
    {"name": "The World", "meaning": "A cycle completes. Celebrate before beginning the next."},
    {"name": "Ace of Cups", "meaning": "A new emotional wellspring is opening in you."},
]

CONCERNS = [
    {"key": "love",      "label": "Love",      "icon": "heart",     "specialty": "Tarot",       "image": "https://images.unsplash.com/photo-1518199266791-5375a83190b7?w=400&h=300&fit=crop&q=80"},
    {"key": "career",    "label": "Career",    "icon": "briefcase", "specialty": "Vedic",       "image": "https://images.unsplash.com/photo-1521737604893-d14cc237f11d?w=400&h=300&fit=crop&q=80"},
    {"key": "marriage",  "label": "Marriage",  "icon": "diamond",   "specialty": "Vedic",       "image": "https://images.unsplash.com/photo-1519741497674-611481863552?w=400&h=300&fit=crop&q=80"},
    {"key": "money",     "label": "Money",     "icon": "cash",      "specialty": "Numerology",  "image": "https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=400&h=300&fit=crop&q=80"},
    {"key": "health",    "label": "Health",    "icon": "medkit",    "specialty": "Palmistry",   "image": "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400&h=300&fit=crop&q=80"},
    {"key": "family",    "label": "Family",    "icon": "people",    "specialty": "Vedic",       "image": "https://images.unsplash.com/photo-1511895426328-dc8714191300?w=400&h=300&fit=crop&q=80"},
    {"key": "education", "label": "Education", "icon": "school",    "specialty": "KP System",   "image": "https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=400&h=300&fit=crop&q=80"},
    {"key": "spiritual", "label": "Spiritual", "icon": "sparkles",  "specialty": "Tarot",       "image": "https://images.unsplash.com/photo-1502134249126-9f3755a50d78?w=400&h=300&fit=crop&q=80"},
]

TESTIMONIALS = [
    {"name": "Priya M.", "text": "Anaya nailed my career transition timing. Landed the role a week later.", "rating": 5, "sign": "Virgo"},
    {"name": "Marco D.", "text": "Rowan's tarot reading gave me the clarity I couldn't find anywhere else.", "rating": 5, "sign": "Scorpio"},
    {"name": "Sneha R.", "text": "Kabir's numerology suggestion completely reframed my business name.", "rating": 5, "sign": "Aquarius"},
    {"name": "Aiden T.", "text": "Selene's palm reading was scarily accurate. Booking again.", "rating": 5, "sign": "Leo"},
]

WISDOM = [
    "As above, so below; as within, so without.",
    "The stars incline, they do not compel.",
    "Every moment is a doorway between what was and what could be.",
    "The moon does not fight the darkness. She simply becomes the light.",
    "Your birth chart is a map, not a sentence.",
    "You are made of stardust — remember that when you feel small.",
]

def compat_score(a: str, b: str) -> int:
    order = ["Aries","Taurus","Gemini","Cancer","Leo","Virgo","Libra","Scorpio","Sagittarius","Capricorn","Aquarius","Pisces"]
    if a not in order or b not in order:
        return 60
    ia, ib = order.index(a), order.index(b)
    diff = (ia - ib) % 12
    # trine (4 apart) & sextile (2 apart) & conjunction (same) = high; square (3) & opposition (6) = medium
    if diff in (0, 4, 8): return 92
    if diff in (2, 10): return 85
    if diff in (5, 7): return 78
    if diff in (1, 11): return 66
    if diff in (3, 9): return 58
    if diff == 6: return 72
    return 70

# ---------- Startup ----------
@app.on_event("startup")
async def startup():
    # Indexes
    await db.users.create_index("email", unique=True, sparse=True)
    await db.users.create_index("user_id", unique=True)
    await db.user_sessions.create_index("session_token", unique=True)
    await db.user_sessions.create_index("expires_at", expireAfterSeconds=0)
    await db.astrologers.create_index("astrologer_id", unique=True)
    await db.messages.create_index([("chat_id", 1), ("created_at", 1)])

    # Seed astrologers — split fields:
    #   $setOnInsert: rating/reviews_count/orders (mutable — do not overwrite on restart)
    #   $set:         static profile info (name, avatar, bio, price…)
    MUTABLE = {"rating", "reviews_count", "orders"}
    for a in SEED_ASTROLOGERS:
        set_fields = {k: v for k, v in a.items() if k not in MUTABLE}
        set_on_insert = {k: a[k] for k in MUTABLE if k in a}
        await db.astrologers.update_one(
            {"astrologer_id": a["astrologer_id"]},
            {"$set": set_fields, "$setOnInsert": set_on_insert},
            upsert=True,
        )
    logger.info("Seeded %d astrologers", len(SEED_ASTROLOGERS))

    # Ensure admin exists (demo)
    admin_email = "admin@aura.app"
    existing = await db.users.find_one({"email": admin_email})
    if not existing:
        await db.users.insert_one({
            "user_id": f"user_{uuid.uuid4().hex[:12]}",
            "email": admin_email,
            "name": "Aura Admin",
            "picture": "",
            "is_admin": True,
            "wallet_balance": 1000.0,
            "created_at": utcnow(),
        })


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()

# ---------- Auth Routes ----------
@api_router.post("/auth/google")
async def auth_google(payload: GoogleAuthPayload):
    """Verify session with Emergent, upsert user, create session in DB."""
    async with httpx.AsyncClient() as http:
        try:
            r = await http.get(
                "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data",
                headers={"X-Session-ID": payload.session_token},
                timeout=15.0,
            )
            r.raise_for_status()
            data = r.json()
        except Exception as e:
            logger.error("Emergent auth verify failed: %s", e)
            raise HTTPException(status_code=401, detail="Invalid session")

    email = data['email'].lower()
    existing = await db.users.find_one({"email": email})
    if existing:
        user_id = existing['user_id']
        await db.users.update_one(
            {"user_id": user_id},
            {"$set": {"name": data.get('name', existing.get('name', '')), "picture": data.get('picture', existing.get('picture', ''))}}
        )
    else:
        user_id = f"user_{uuid.uuid4().hex[:12]}"
        await db.users.insert_one({
            "user_id": user_id,
            "email": email,
            "name": data.get('name', ''),
            "picture": data.get('picture', ''),
            "is_admin": email in ADMIN_EMAILS,
            "wallet_balance": 50.0,  # signup bonus
            "created_at": utcnow(),
        })

    session_token = data.get('session_token', payload.session_token)
    await db.user_sessions.insert_one({
        "session_token": session_token,
        "user_id": user_id,
        "created_at": utcnow(),
        "expires_at": utcnow() + timedelta(days=7),
    })
    user = await db.users.find_one({"user_id": user_id}, {"_id": 0})
    return {"session_token": session_token, "user": user}


@api_router.post("/auth/phone/request")
async def phone_request(payload: PhoneOtpRequest):
    # Mock OTP - always return "123456"
    return {"ok": True, "message": "OTP sent (use 123456 for demo)"}


@api_router.post("/auth/phone/verify")
async def phone_verify(payload: PhoneOtpVerify):
    if payload.otp != "123456":
        raise HTTPException(status_code=400, detail="Invalid OTP")
    phone = payload.phone.strip()
    existing = await db.users.find_one({"phone": phone})
    if existing:
        user_id = existing['user_id']
    else:
        user_id = f"user_{uuid.uuid4().hex[:12]}"
        await db.users.insert_one({
            "user_id": user_id,
            "phone": phone,
            "name": payload.name or f"User {phone[-4:]}",
            "picture": "",
            "is_admin": False,
            "wallet_balance": 50.0,
            "created_at": utcnow(),
        })
    session_token = f"phone_{uuid.uuid4().hex}"
    await db.user_sessions.insert_one({
        "session_token": session_token,
        "user_id": user_id,
        "created_at": utcnow(),
        "expires_at": utcnow() + timedelta(days=7),
    })
    user = await db.users.find_one({"user_id": user_id}, {"_id": 0})
    return {"session_token": session_token, "user": user}


@api_router.get("/auth/me")
async def auth_me(user: dict = Depends(require_user)):
    return user


@api_router.post("/auth/logout")
async def auth_logout(authorization: Optional[str] = Header(None)):
    if authorization and authorization.startswith('Bearer '):
        await db.user_sessions.delete_one({"session_token": authorization[7:]})
    return {"ok": True}


# ---------- Astrologers ----------
@api_router.get("/astrologers")
async def list_astrologers(
    specialty: Optional[str] = None,
    gender: Optional[str] = None,
    language: Optional[str] = None,
    max_price: Optional[float] = None,
    sort: Optional[str] = None,
):
    q: dict = {}
    if specialty and specialty.lower() != 'all':
        import re as _re
        q["specialties"] = {"$regex": f"^{_re.escape(specialty)}$", "$options": "i"}
    if gender and gender.lower() != 'all':
        q["gender"] = gender.lower()
    if language and language.lower() != 'all':
        import re as _re
        q["languages"] = {"$regex": f"^{_re.escape(language)}$", "$options": "i"}
    if max_price is not None and max_price > 0:
        q["price_per_min"] = {"$lte": max_price}

    cursor = db.astrologers.find(q, {"_id": 0})
    # Sort: rating (default), experience, price_asc, price_desc
    sort_key = (sort or "rating").lower()
    if sort_key == "experience":
        cursor = cursor.sort([("experience_years", -1), ("rating", -1)])
    elif sort_key == "price_asc":
        cursor = cursor.sort([("price_per_min", 1), ("rating", -1)])
    elif sort_key == "price_desc":
        cursor = cursor.sort([("price_per_min", -1), ("rating", -1)])
    else:
        cursor = cursor.sort([("rating", -1), ("reviews_count", -1)])
    astros = await cursor.to_list(100)
    return astros


@api_router.get("/astrologers/{astro_id}")
async def get_astrologer(astro_id: str):
    a = await db.astrologers.find_one({"astrologer_id": astro_id}, {"_id": 0})
    if not a:
        raise HTTPException(status_code=404, detail="Not found")
    reviews = await db.reviews.find({"astrologer_id": astro_id}, {"_id": 0}).sort("created_at", -1).to_list(50)
    a['reviews'] = reviews
    return a


# ---------- Chat ----------
@api_router.post("/chat/start/{astro_id}")
async def start_chat(astro_id: str, user: dict = Depends(require_user)):
    astro = await db.astrologers.find_one({"astrologer_id": astro_id}, {"_id": 0})
    if not astro:
        raise HTTPException(status_code=404, detail="Astrologer not found")
    if user['wallet_balance'] < astro['price_per_min']:
        raise HTTPException(status_code=402, detail=f"Insufficient balance. Need at least ${astro['price_per_min']}")

    # Reuse open chat if exists
    chat = await db.chats.find_one({"user_id": user['user_id'], "astrologer_id": astro_id, "status": "active"}, {"_id": 0})
    if not chat:
        chat_id = f"chat_{uuid.uuid4().hex[:12]}"
        chat = {
            "chat_id": chat_id,
            "user_id": user['user_id'],
            "astrologer_id": astro_id,
            "status": "active",
            "started_at": utcnow(),
        }
        await db.chats.insert_one(dict(chat))
        chat.pop('_id', None)
        # Seed greeting
        greeting = {
            "message_id": f"msg_{uuid.uuid4().hex[:12]}",
            "chat_id": chat_id,
            "sender": "astrologer",
            "text": f"Namaste 🙏 I'm {astro['name']}. Share your date of birth, time of birth and city, and tell me what's on your heart today.",
            "created_at": utcnow(),
        }
        await db.messages.insert_one(dict(greeting))
    return {"chat_id": chat["chat_id"], "astrologer": astro}


@api_router.get("/chat/{chat_id}/messages")
async def get_messages(chat_id: str, user: dict = Depends(require_user)):
    chat = await db.chats.find_one({"chat_id": chat_id}, {"_id": 0})
    if not chat or chat['user_id'] != user['user_id']:
        raise HTTPException(status_code=404, detail="Chat not found")
    msgs = await db.messages.find({"chat_id": chat_id}, {"_id": 0}).sort("created_at", 1).to_list(500)
    for m in msgs:
        if isinstance(m.get('created_at'), datetime):
            m['created_at'] = m['created_at'].isoformat()
    return msgs


@api_router.get("/chats")
async def list_chats(user: dict = Depends(require_user)):
    chats = await db.chats.find({"user_id": user['user_id']}, {"_id": 0}).sort("started_at", -1).to_list(100)
    # Attach astrologer
    result = []
    for c in chats:
        a = await db.astrologers.find_one({"astrologer_id": c['astrologer_id']}, {"_id": 0})
        c['astrologer'] = a
        if isinstance(c.get('started_at'), datetime):
            c['started_at'] = c['started_at'].isoformat()
        # last message
        last = await db.messages.find({"chat_id": c['chat_id']}, {"_id": 0}).sort("created_at", -1).limit(1).to_list(1)
        c['last_message'] = last[0]['text'] if last else ""
        result.append(c)
    return result


# ---------- WebSocket Chat ----------
class ConnectionManager:
    def __init__(self):
        self.rooms: Dict[str, List[WebSocket]] = {}

    async def connect(self, chat_id: str, ws: WebSocket):
        await ws.accept()
        self.rooms.setdefault(chat_id, []).append(ws)

    def disconnect(self, chat_id: str, ws: WebSocket):
        if chat_id in self.rooms:
            try:
                self.rooms[chat_id].remove(ws)
            except ValueError:
                pass

    async def broadcast(self, chat_id: str, payload: dict):
        dead = []
        for ws in self.rooms.get(chat_id, []):
            try:
                await ws.send_json(payload)
            except Exception:
                dead.append(ws)
        for d in dead:
            self.disconnect(chat_id, d)

manager = ConnectionManager()


async def generate_ai_reply(astro: dict, chat_id: str, user_text: str) -> str:
    """Use Emergent LLM key with Claude to generate astrologer reply."""
    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage
        system = (
            f"You are {astro['name']}, a {astro['experience_years']}-year experienced astrologer specializing in "
            f"{', '.join(astro['specialties'])}. Speak warmly and mystically, but keep replies concise (2-4 sentences). "
            f"Weave in references to planets, houses, cards, or auras where appropriate. Never break character. "
            f"If asked about pricing or booking, politely say the app manages that."
        )
        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=chat_id,
            system_message=system,
        ).with_model("anthropic", "claude-sonnet-4-6")
        resp = await chat.send_message(UserMessage(text=user_text))
        return str(resp).strip()
    except Exception as e:
        logger.error("AI reply failed: %s", e)
        return "The stars are quiet for a moment. Could you share a little more about what you'd like guidance on?"


@app.websocket("/api/ws/chat/{chat_id}")
async def websocket_chat(ws: WebSocket, chat_id: str, token: str = Query(...)):
    session = await db.user_sessions.find_one({"session_token": token}, {"_id": 0})
    if not session or normalize_dt(session['expires_at']) < utcnow():
        await ws.close(code=4401)
        return
    user_id = session['user_id']
    chat = await db.chats.find_one({"chat_id": chat_id}, {"_id": 0})
    if not chat or chat['user_id'] != user_id:
        await ws.close(code=4404)
        return
    astro = await db.astrologers.find_one({"astrologer_id": chat['astrologer_id']}, {"_id": 0})

    await manager.connect(chat_id, ws)
    try:
        while True:
            data = await ws.receive_json()
            text = (data.get('text') or '').strip()
            if not text:
                continue

            # deduct wallet per user message (proxy for per-min)
            user = await db.users.find_one({"user_id": user_id}, {"_id": 0})
            if user['wallet_balance'] < astro['price_per_min']:
                await ws.send_json({"type": "error", "message": "Insufficient balance"})
                continue
            new_balance = round(user['wallet_balance'] - astro['price_per_min'], 2)
            await db.users.update_one({"user_id": user_id}, {"$set": {"wallet_balance": new_balance}})
            await db.transactions.insert_one({
                "txn_id": f"txn_{uuid.uuid4().hex[:12]}",
                "user_id": user_id,
                "type": "chat",
                "amount": -astro['price_per_min'],
                "description": f"Chat with {astro['name']}",
                "created_at": utcnow(),
            })

            user_msg = {
                "message_id": f"msg_{uuid.uuid4().hex[:12]}",
                "chat_id": chat_id,
                "sender": "user",
                "text": text,
                "created_at": utcnow(),
            }
            await db.messages.insert_one(dict(user_msg))
            user_msg_out = dict(user_msg)
            user_msg_out['created_at'] = user_msg['created_at'].isoformat()
            await manager.broadcast(chat_id, {"type": "message", "message": user_msg_out, "wallet_balance": new_balance})

            # typing indicator
            await manager.broadcast(chat_id, {"type": "typing", "sender": "astrologer"})

            reply_text = await generate_ai_reply(astro, chat_id, text)
            astro_msg = {
                "message_id": f"msg_{uuid.uuid4().hex[:12]}",
                "chat_id": chat_id,
                "sender": "astrologer",
                "text": reply_text,
                "created_at": utcnow(),
            }
            await db.messages.insert_one(dict(astro_msg))
            astro_msg_out = dict(astro_msg)
            astro_msg_out['created_at'] = astro_msg['created_at'].isoformat()
            await manager.broadcast(chat_id, {"type": "message", "message": astro_msg_out})
    except WebSocketDisconnect:
        manager.disconnect(chat_id, ws)
    except Exception as e:
        logger.error("WS error: %s", e)
        manager.disconnect(chat_id, ws)


# ---------- Wallet ----------
@api_router.get("/wallet")
async def get_wallet(user: dict = Depends(require_user)):
    txns = await db.transactions.find({"user_id": user['user_id']}, {"_id": 0}).sort("created_at", -1).limit(50).to_list(50)
    for t in txns:
        if isinstance(t.get('created_at'), datetime):
            t['created_at'] = t['created_at'].isoformat()
    return {"balance": user.get('wallet_balance', 0.0), "transactions": txns}


@api_router.post("/wallet/add")
async def wallet_add(payload: AddMoney, user: dict = Depends(require_user)):
    if payload.amount <= 0 or payload.amount > 5000:
        raise HTTPException(status_code=400, detail="Invalid amount")
    new_balance = round(user['wallet_balance'] + payload.amount, 2)
    await db.users.update_one({"user_id": user['user_id']}, {"$set": {"wallet_balance": new_balance}})
    await db.transactions.insert_one({
        "txn_id": f"txn_{uuid.uuid4().hex[:12]}",
        "user_id": user['user_id'],
        "type": "topup",
        "amount": payload.amount,
        "description": "Wallet top-up (demo)",
        "created_at": utcnow(),
    })
    return {"balance": new_balance}


# ---------- Horoscope / Kundli ----------
@api_router.get("/horoscope/{sign}")
async def get_horoscope(sign: str):
    sign_title = sign.title()
    if sign_title not in DAILY_HOROSCOPE:
        raise HTTPException(status_code=404, detail="Sign not found")
    info = next((z for z in ZODIAC if z['sign'] == sign_title), None)
    h = DAILY_HOROSCOPE[sign_title]
    return {
        "sign": sign_title,
        "dates": info['dates'] if info else '',
        "element": info['element'] if info else '',
        "reading": h['reading'],
        "lucky_color": h['lucky_color'],
        "lucky_number": h['lucky_number'],
        "mood": h['mood'],
        "compat": h['compat'],
        "date": utcnow().date().isoformat(),
    }


@api_router.get("/zodiacs")
async def get_zodiacs():
    return ZODIAC


@api_router.get("/panchang")
async def panchang():
    day = utcnow().date()
    tithis = ["Pratipada","Dvitiya","Tritiya","Chaturthi","Panchami","Shashthi","Saptami","Ashtami","Navami","Dashami","Ekadashi","Dwadashi","Trayodashi","Chaturdashi","Purnima"]
    nakshatras = ["Ashwini","Bharani","Krittika","Rohini","Mrigashira","Ardra","Punarvasu","Pushya","Ashlesha","Magha"]
    idx = day.toordinal()
    return {
        "date": day.isoformat(),
        "tithi": tithis[idx % len(tithis)],
        "nakshatra": nakshatras[idx % len(nakshatras)],
        "sunrise": "06:12",
        "sunset": "18:47",
        "rahu_kaal": "16:30 - 18:00",
        "abhijit": "12:04 - 12:55",
        "auspicious": True,
    }


@api_router.get("/card-of-the-day")
async def card_of_the_day():
    day = utcnow().date().toordinal()
    card = TAROT_DECK[day % len(TAROT_DECK)]
    return {"name": card["name"], "meaning": card["meaning"], "date": utcnow().date().isoformat()}


@api_router.get("/concerns")
async def concerns():
    return CONCERNS


@api_router.get("/compatibility")
async def compatibility(sign1: str, sign2: str):
    s1, s2 = sign1.title(), sign2.title()
    score = compat_score(s1, s2)
    if score >= 88: verdict = "Cosmic soulmates — rare and radiant."
    elif score >= 78: verdict = "Strong resonance. A partnership that grows."
    elif score >= 68: verdict = "Curious chemistry — worth exploring gently."
    else: verdict = "Different rhythms. Patience unlocks the harmony."
    return {"sign1": s1, "sign2": s2, "score": score, "verdict": verdict}


@api_router.get("/home-dashboard")
async def home_dashboard(sign: str = "Aries"):
    """One-shot endpoint powering the home feed."""
    sign_t = sign.title()
    if sign_t not in DAILY_HOROSCOPE: sign_t = "Aries"
    h = DAILY_HOROSCOPE[sign_t]
    info = next((z for z in ZODIAC if z['sign'] == sign_t), None)
    astros = await db.astrologers.find({}, {"_id": 0}).to_list(20)
    online = [a for a in astros if a.get('is_online')]
    top_rated = sorted(astros, key=lambda x: (x['rating'], x['reviews_count']), reverse=True)[:3]
    day = utcnow().date().toordinal()
    card = TAROT_DECK[day % len(TAROT_DECK)]
    ann = await db.admin_messages.find({}, {"_id": 0}).sort("created_at", -1).limit(1).to_list(1)
    if ann and isinstance(ann[0].get('created_at'), datetime):
        ann[0]['created_at'] = ann[0]['created_at'].isoformat()
    return {
        "horoscope": {
            "sign": sign_t,
            "dates": info['dates'] if info else '',
            "element": info['element'] if info else '',
            **h,
        },
        "panchang": {
            "tithi": ["Shashthi","Saptami","Ashtami","Navami","Dashami"][day % 5],
            "nakshatra": ["Rohini","Mrigashira","Ardra","Punarvasu","Pushya"][day % 5],
            "sunrise": "06:12", "sunset": "18:47",
            "rahu_kaal": "16:30 - 18:00", "abhijit": "12:04 - 12:55",
        },
        "card_of_the_day": card,
        "live_astrologers": online[:8],
        "top_astrologers": top_rated,
        "testimonials": TESTIMONIALS,
        "wisdom": WISDOM[day % len(WISDOM)],
        "concerns": CONCERNS,
        "announcement": ann[0] if ann else None,
    }


@api_router.post("/kundli/generate")
async def generate_kundli(payload: BirthDetails, user: dict = Depends(require_user)):
    """Mocked kundli — computes zodiac sign and returns planetary positions."""
    try:
        month, day = int(payload.date.split('-')[1]), int(payload.date.split('-')[2])
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid date")

    def sun_sign(m, d):
        table = [
            ((3,21),(4,19),"Aries"),((4,20),(5,20),"Taurus"),((5,21),(6,20),"Gemini"),
            ((6,21),(7,22),"Cancer"),((7,23),(8,22),"Leo"),((8,23),(9,22),"Virgo"),
            ((9,23),(10,22),"Libra"),((10,23),(11,21),"Scorpio"),((11,22),(12,21),"Sagittarius"),
            ((12,22),(1,19),"Capricorn"),((1,20),(2,18),"Aquarius"),((2,19),(3,20),"Pisces"),
        ]
        for (sm,sd),(em,ed),name in table:
            if (m == sm and d >= sd) or (m == em and d <= ed):
                return name
        return "Capricorn"

    sign = sun_sign(month, day)
    planets = [
        {"name": "Sun", "sign": sign, "house": 1},
        {"name": "Moon", "sign": "Cancer", "house": 4},
        {"name": "Mercury", "sign": "Gemini", "house": 3},
        {"name": "Venus", "sign": "Libra", "house": 7},
        {"name": "Mars", "sign": "Aries", "house": 10},
        {"name": "Jupiter", "sign": "Sagittarius", "house": 9},
        {"name": "Saturn", "sign": "Capricorn", "house": 6},
    ]
    return {
        "name": payload.name,
        "sun_sign": sign,
        "moon_sign": "Cancer",
        "ascendant": "Leo",
        "planets": planets,
        "summary": f"With {sign} rising in your chart, you carry a magnetic drive tempered by lunar sensitivity. Jupiter's ninth-house placement blesses long journeys and learning.",
    }


# ---------- Reviews ----------
@api_router.post("/reviews")
async def create_review(payload: ReviewCreate, user: dict = Depends(require_user)):
    if payload.rating < 1 or payload.rating > 5:
        raise HTTPException(status_code=400, detail="Rating 1-5")

    # Block resubmission for the same chat by the same user
    if payload.chat_id:
        existing = await db.reviews.find_one({"chat_id": payload.chat_id, "user_id": user['user_id']})
        if existing:
            raise HTTPException(status_code=409, detail="You have already reviewed this session")

    review = {
        "review_id": f"rev_{uuid.uuid4().hex[:12]}",
        "astrologer_id": payload.astrologer_id,
        "user_id": user['user_id'],
        "user_name": user.get('name', 'Anonymous'),
        "rating": payload.rating,
        "comment": payload.comment,
        "chat_id": payload.chat_id,
        "created_at": utcnow(),
    }
    await db.reviews.insert_one(dict(review))

    # Recompute astrologer average rating & reviews_count
    pipeline = [
        {"$match": {"astrologer_id": payload.astrologer_id}},
        {"$group": {"_id": "$astrologer_id", "avg": {"$avg": "$rating"}, "count": {"$sum": 1}}},
    ]
    agg = await db.reviews.aggregate(pipeline).to_list(1)
    if agg:
        new_avg = round(agg[0]['avg'], 2)
        new_count = agg[0]['count']
        await db.astrologers.update_one(
            {"astrologer_id": payload.astrologer_id},
            {"$set": {"rating": new_avg, "reviews_count": new_count}},
        )

    review['created_at'] = review['created_at'].isoformat()
    return review


# ---------- Admin Announcements ----------
@api_router.get("/announcements")
async def list_announcements():
    items = await db.admin_messages.find({}, {"_id": 0}).sort("created_at", -1).limit(20).to_list(20)
    for i in items:
        if isinstance(i.get('created_at'), datetime):
            i['created_at'] = i['created_at'].isoformat()
    return items


@api_router.post("/admin/announcements")
async def create_announcement(payload: AdminMessageCreate, admin: dict = Depends(require_admin)):
    msg = {
        "announcement_id": f"ann_{uuid.uuid4().hex[:12]}",
        "title": payload.title,
        "body": payload.body,
        "posted_by": admin['user_id'],
        "created_at": utcnow(),
    }
    await db.admin_messages.insert_one(dict(msg))
    msg['created_at'] = msg['created_at'].isoformat()
    return msg


@api_router.delete("/admin/announcements/{ann_id}")
async def delete_announcement(ann_id: str, admin: dict = Depends(require_admin)):
    await db.admin_messages.delete_one({"announcement_id": ann_id})
    return {"ok": True}


# ---------- Root ----------
@api_router.get("/")
async def root():
    return {"app": "Aura Astrology", "status": "ok"}


app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)
