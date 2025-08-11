
"""
FastAPI backend with detailed comments for beginners.

Features added/expanded:
- JWT-based admin authentication
- LLM live search with caching (HuggingFace inference)
- TMDb + OMDb integration for search, trending, and provider lookup
- Ratings aggregation: combines TMDb vote_average, IMDb (from OMDb), and Rotten Tomatoes (from OMDb)
  into a weighted normalized score (0-100) for ranking.
- Pagination for /search via `page` query parameter (TMDb pages are used, but we also support client-side pagination)
- Autosuggest improvements: server-side fallback to TMDb "search/suggest" via TMDb suggestions endpoints (if available),
  and client-side debounce to reduce calls.
- Extensive inline comments for a 16-year-old to follow.
"""

import os
import hashlib
import json
from datetime import datetime, timedelta
from typing import Optional, List, Dict, Any

from fastapi import FastAPI, HTTPException, Depends, status, Query
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from pydantic import BaseModel
from passlib.context import CryptContext
import httpx
from jose import JWTError, jwt
from slugify import slugify  # used to create stable cache keys for titles
from dotenv import load_dotenv

# local imports
from database import database, async_engine, sync_engine, metadata, cache, get_cache, set_cache, CACHE_EXPIRY_LLM, CACHE_EXPIRY_MOVIE, CACHE_EXPIRY_TREND
from models import admin_users, settings as settings_table

load_dotenv()

# ------------------ Configuration ------------------
SECRET_KEY = os.getenv("SECRET_KEY", "supersecret_change_me")  # change in production!
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "60"))

TMDB_API_KEY = os.getenv("TMDB_API_KEY")
OMDB_API_KEY = os.getenv("OMDB_API_KEY")
HF_API_TOKEN = os.getenv("HF_API_TOKEN")
DEFAULT_PROVIDER_REGION = os.getenv("DEFAULT_PROVIDER_REGION", "US")

# ------------------ App and utilities ------------------
app = FastAPI(title="Bingeworthy AI Backend (Detailed)")

# Password hashing context (bcrypt)
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")  # type: ignore

# OAuth2 scheme to extract Bearer token from Authorization header
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/admin/token")

# ------------------ Pydantic models ------------------
class Token(BaseModel):
    access_token: str
    token_type: str

class AdminUserIn(BaseModel):
    username: str
    password: str

class CardSettingsUpdate(BaseModel):
    card_fields: dict
    search_fields: dict

# ------------------ Auth helpers ------------------
def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a plaintext password against a bcrypt hash."""
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password: str) -> str:
    """Create a bcrypt hash of `password` for safe storage."""
    return pwd_context.hash(password)

async def get_admin_user(username: str):
    """Return admin user DB row or None."""
    q = admin_users.select().where(admin_users.c.username == username)
    return await database.fetch_one(q)

async def authenticate_admin(username: str, password: str):
    """Authenticate admin credentials. Return user row if ok, otherwise False."""
    user = await get_admin_user(username)
    if not user:
        return False
    if not verify_password(password, user["hashed_password"]):
        return False
    return user

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """Create a signed JWT token with expiration; include `sub` (subject) as username."""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

async def get_current_admin(token: str = Depends(oauth2_scheme)):
    """Dependency that decodes a JWT and returns the admin DB row. Raises 401 on failure."""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    user = await get_admin_user(username)
    if user is None:
        raise credentials_exception
    return user

# ------------------ Startup/shutdown events ------------------
@app.on_event("startup")
async def startup():
    """Connect to the database, create tables, and ensure a default admin exists for dev convenience."""
    
    # Create all tables in the DB if they don't exist yet
    async with async_engine.begin() as conn:
        await conn.run_sync(metadata.create_all)
    print("✅ Database tables created or verified successfully.")
    
    # Connect to the database (your existing code)
    await database.connect()
    
    # Check if any admin user exists
    q = admin_users.select().limit(1)
    existing = await database.fetch_one(q)
    
    if not existing:
        # Default admin: change immediately after first login.
        hashed = get_password_hash("admin123")
        await database.execute(admin_users.insert().values(username="admin", hashed_password=hashed))
        print("Created default admin 'admin' with password 'admin123'. Change ASAP.")

@app.on_event("shutdown")
async def shutdown():
    """Disconnect from the database cleanly on shutdown."""
    await database.disconnect()

# ------------------ Ratings aggregation ------------------
def normalize_imdb(value: Optional[str]) -> Optional[float]:
    """IMDb rating from OMDb comes like '7.4/10' — normalize to 0-100 numeric scale."""
    if not value:
        return None
    try:
        # split '7.4/10' -> 7.4 and scale to 74
        parts = value.split("/")
        score = float(parts[0])
        return score * 10.0
    except Exception:
        return None

def normalize_rt(value: Optional[str]) -> Optional[float]:
    """Rotten Tomatoes value is like '95%' — remove % and return numeric 0-100."""
    if not value:
        return None
    try:
        return float(value.replace("%", "").strip())
    except Exception:
        return None

def normalize_tmdb(value: Optional[float]) -> Optional[float]:
    """TMDb vote_average is 0-10 float; scale to 0-100."""
    if value is None:
        return None
    try:
        return float(value) * 10.0
    except Exception:
        return None

def aggregate_ratings(tmdb_score: Optional[float], imdb: Optional[str], rt: Optional[str]) -> Dict[str, Any]:
    """Combine available ratings into a weighted average and return breakdown.

    Weights (tunable):
      - TMDb: 0.2 (since it's community-driven)
      - IMDb: 0.5
      - Rotten Tomatoes: 0.3

    We compute a weighted mean only using available sources.
    Result 'aggregated' is 0-100.
    """
    weights = {"tmdb": 0.2, "imdb": 0.5, "rt": 0.3}
    vals = {}
    tmdb_n = normalize_tmdb(tmdb_score)
    imdb_n = normalize_imdb(imdb)
    rt_n = normalize_rt(rt)
    total_weight = 0.0
    weighted_sum = 0.0
    if tmdb_n is not None:
        weighted_sum += tmdb_n * weights["tmdb"]
        total_weight += weights["tmdb"]
        vals["tmdb"] = tmdb_n
    if imdb_n is not None:
        weighted_sum += imdb_n * weights["imdb"]
        total_weight += weights["imdb"]
        vals["imdb"] = imdb_n
    if rt_n is not None:
        weighted_sum += rt_n * weights["rt"]
        total_weight += weights["rt"]
        vals["rt"] = rt_n
    aggregated = round(weighted_sum / total_weight, 1) if total_weight > 0 else None
    return {"aggregated": aggregated, "breakdown": vals}

# ------------------ TMDb provider lookup (cached) ------------------
async def get_tmdb_providers(tmdb_id: int, media_type: str = "movie", region: str = DEFAULT_PROVIDER_REGION):
    """Query TMDb watch/providers endpoint and cache the result per id+region."""
    key = f"providers_{media_type}_{tmdb_id}_{region}"
    cached = await get_cache(database, key, CACHE_EXPIRY_MOVIE)
    if cached:
        return cached
    if not TMDB_API_KEY:
        return {"providers": [], "link": None}
    url = f"https://api.themoviedb.org/3/{'movie' if media_type == 'movie' else 'tv'}/{tmdb_id}/watch/providers"
    params = {"api_key": TMDB_API_KEY}
    async with httpx.AsyncClient() as client:
        resp = await client.get(url, params=params, timeout=10)
        if resp.status_code != 200:
            return {"providers": [], "link": None}
        data = resp.json()
        results = data.get("results", {})
        region_info = results.get(region, {}) if results else {}
        provider_names = []
        for cat in ["flatrate", "rent", "buy", "ads"]:
            for p in region_info.get(cat, []) or []:
                name = p.get("provider_name")
                if name and name not in provider_names:
                    provider_names.append(name)
        link = region_info.get("link")
        parsed = {"providers": provider_names, "link": link}
        await set_cache(database, key, parsed)
        return parsed

# ------------------ Autosuggest endpoint (improved) ------------------
@app.get("/suggest")
async def suggest(query: str = Query(..., min_length=2)):
    """Provide quick autosuggest results.

    Strategy:
      1. If we have a cached LLM suggestion for this query, return it.
      2. Otherwise, try TMDb search (fast) and return top titles as suggestions.
      3. Cache results for a short period.
    """
    qnorm = query.strip().lower()
    cache_key = f"suggest_{hashlib.sha256(qnorm.encode()).hexdigest()}"
    cached = await get_cache(database, cache_key, timedelta(hours=6))
    if cached:
        return {"source": "cache", "suggestions": cached}
    suggestions = []
    # First, quick TMDb search for titles/people (no heavy enrichment)
    if TMDB_API_KEY:
        url = "https://api.themoviedb.org/3/search/multi"
        params = {"api_key": TMDB_API_KEY, "query": query, "page": 1, "include_adult": "false"}
        async with httpx.AsyncClient() as client:
            resp = await client.get(url, params=params, timeout=6)
            if resp.status_code == 200:
                data = resp.json()
                # Collect up to 8 titles or names
                for item in data.get("results", [])[:8]:
                    title = item.get("title") or item.get("name")
                    if title and title not in suggestions:
                        suggestions.append(title)
    # Fallback: small LLM call (cached longer)
    if not suggestions and HF_API_TOKEN:
        llm_key = f"llm_suggest_{hashlib.sha256(query.lower().encode()).hexdigest()}"
        llm_cached = await get_cache(database, llm_key, CACHE_EXPIRY_LLM)
        if llm_cached:
            suggestions = llm_cached
        else:
            prompt = f"Give 6 short streaming search suggestions for: '{query}' (comma separated)." 
            headers = {"Authorization": f"Bearer {HF_API_TOKEN}", "Content-Type": "application/json"}
            payload = {"inputs": prompt, "parameters": {"max_new_tokens": 50, "temperature": 0.7}}
            async with httpx.AsyncClient() as client:
                r = await client.post("https://api-inference.huggingface.co/models/gpt2", headers=headers, json=payload, timeout=12)
                if r.status_code == 200:
                    data = r.json()
                    generated = data[0].get("generated_text") if isinstance(data, list) else (data.get("generated_text") or "")
                    text = generated.replace(prompt, "").strip()
                    suggestions = [s.strip() for s in text.replace("\\n", ",").split(",") if s.strip()][:6]
            if suggestions:
                await set_cache(database, llm_key, suggestions)
    await set_cache(database, cache_key, suggestions)
    return {"source": "tmdb" if suggestions else "none", "suggestions": suggestions}

# ------------------ Search with pagination, aggregation and caching ------------------
@app.get("/search")
async def search_movies(query: Optional[str] = None, platform: Optional[str] = None, genre: Optional[str] = None,
                        language: Optional[str] = None, country: Optional[str] = None, page: int = 1):
    """Search TMDb and enrich results with OMDb ratings + provider info.

    Pagination:
      - `page` maps to TMDb pages. TMDb returns 20 items per page; we keep that behavior here.
      - We limit to top 100 results by default (client can paginate).
    """
    if not TMDB_API_KEY or not OMDB_API_KEY:
        raise HTTPException(status_code=500, detail="TMDb or OMDb API keys missing")
    # Use TMDb search multi endpoint
    async with httpx.AsyncClient() as client:
        tmdb_url = "https://api.themoviedb.org/3/search/multi"
        params = {"api_key": TMDB_API_KEY, "query": query or "", "language": "en-US", "include_adult": "false", "page": page}
        resp = await client.get(tmdb_url, params=params, timeout=15)
        if resp.status_code != 200:
            raise HTTPException(status_code=502, detail="TMDb API error")
        tmdb_data = resp.json()
        results = []
        for item in tmdb_data.get("results", [])[:100]:
            title = item.get("title") or item.get("name")
            year = (item.get("release_date") or item.get("first_air_date") or "")[:4]
            tmdb_id = item.get("id")
            media_type = item.get("media_type") or ("movie" if item.get("title") else "tv")
            cache_key = f"movie_detail_{media_type}_{tmdb_id}"
            cached = await get_cache(database, cache_key, CACHE_EXPIRY_MOVIE)
            if cached:
                results.append(cached)
                continue
            # OMDb lookup to get IMDb and Rotten Tomatoes (OMDb is a convenient free-ish source)
            omdb_url = "http://www.omdbapi.com/"
            omdb_params = {"apikey": OMDB_API_KEY, "t": title, "y": year}
            omdb_resp = await client.get(omdb_url, params=omdb_params, timeout=10)
            omdb_data = omdb_resp.json() if omdb_resp.status_code == 200 else {}
            ratings = omdb_data.get("Ratings", [])
            imdb_rating = next((r["Value"] for r in ratings if r.get("Source") == "Internet Movie Database"), None)
            rt_rating = next((r["Value"] for r in ratings if r.get("Source") == "Rotten Tomatoes"), None)
            # TMDb vote_average is helpful as well
            tmdb_vote = item.get("vote_average")
            # Aggregate ratings into a single composite score so we can sort/rank more easily
            agg = aggregate_ratings(tmdb_vote, imdb_rating, rt_rating)
            # Provider lookup (which platforms)
            providers = await get_tmdb_providers(tmdb_id, media_type=media_type, region=country or DEFAULT_PROVIDER_REGION)
            movie_detail = {
                "id": tmdb_id,
                "title": title,
                "year": year,
                "summary": omdb_data.get("Plot") if omdb_data.get("Plot") not in (None, "N/A") else item.get("overview") or "",
                "poster": f"https://image.tmdb.org/t/p/w500{item.get('poster_path')}" if item.get("poster_path") else None,
                "imdb_rating": imdb_rating,
                "rotten_tomatoes_rating": rt_rating,
                "tmdb_vote_average": tmdb_vote,
                "aggregated_rating": agg.get("aggregated"),
                "platforms": providers.get("providers", []),
                "provider_link": providers.get("link")
            }
            await set_cache(database, cache_key, movie_detail)
            results.append(movie_detail)
        # Optionally: sort by aggregated_rating descending if query is empty or if client requests
        results_sorted = sorted(results, key=lambda r: (r.get("aggregated_rating") or 0), reverse=True)
        # Return TMDb's pagination info to help the client paginate
        return {
            "page": tmdb_data.get("page", page),
            "total_pages": tmdb_data.get("total_pages", 1),
            "total_results": tmdb_data.get("total_results", len(results_sorted)),
            "results": results_sorted
        }

# ------------------ Recommendations endpoint (trending) ------------------
@app.get("/recommendations")
async def get_recommendations():
    if not TMDB_API_KEY:
        raise HTTPException(status_code=500, detail="TMDb API key not configured")
    cache_key = "trending_week"
    cached = await get_cache(database, cache_key, CACHE_EXPIRY_TREND)
    if cached:
        return {"results": cached, "source": "cache"}
    async with httpx.AsyncClient() as client:
        url = "https://api.themoviedb.org/3/trending/all/week"
        params = {"api_key": TMDB_API_KEY, "language": "en-US", "page": 1}
        resp = await client.get(url, params=params, timeout=15)
        if resp.status_code != 200:
            raise HTTPException(status_code=502, detail="TMDb error")
        data = resp.json()
        results = []
        for item in data.get("results", [])[:100]:
            title = item.get("title") or item.get("name")
            year = (item.get("release_date") or item.get("first_air_date") or "")[:4]
            poster = item.get("poster_path")
            results.append({"id": item.get("id"), "title": title, "year": year, "poster": f"https://image.tmdb.org/t/p/w500{poster}" if poster else None})
        await set_cache(database, cache_key, results)
        return {"results": results}

# ------------------ Admin endpoints ------------------
async def get_app_settings():
    cache_key = "app_settings"
    cached = await get_cache(database, cache_key, timedelta(minutes=15))
    if cached:
        return cached
    q = settings_table.select().limit(1)
    row = await database.fetch_one(q)
    if row:
        parsed = {"id": row["id"], "search_fields": row["search_fields"], "card_fields": row["card_fields"]}
    else:
        default = {"search_fields": {"platforms": True, "genres": True, "actors": True, "language": True, "country": True}, "card_fields": {"title": True, "rating": True, "summary": True, "platform": True, "actors": False, "year": True}}
        ins = settings_table.insert().values(search_fields=default["search_fields"], card_fields=default["card_fields"])
        new_id = await database.execute(ins)
        parsed = {"id": new_id, **default}
    await set_cache(database, cache_key, parsed)
    return parsed

@app.get("/admin/settings")
async def admin_get_settings(current_admin=Depends(get_current_admin)):
    return await get_app_settings()

@app.put("/admin/settings")
async def admin_update_settings(payload: CardSettingsUpdate, current_admin=Depends(get_current_admin)):
    q = settings_table.select().limit(1)
    row = await database.fetch_one(q)
    if not row:
        await database.execute(settings_table.insert().values(search_fields=payload.search_fields, card_fields=payload.card_fields))
    else:
        await database.execute(settings_table.update().where(settings_table.c.id == row["id"]).values(search_fields=payload.search_fields, card_fields=payload.card_fields))
    await database.execute(cache.delete().where(cache.c.key == "app_settings"))
    return {"status": "ok", "message": "settings updated"}

@app.post("/admin/clear_cache")
async def admin_clear_cache(current_admin=Depends(get_current_admin)):
    await database.execute(cache.delete())
    return {"status": "ok", "message": "cache cleared"}

@app.post("/admin/register")
async def admin_register(user: AdminUserIn, current_admin=Depends(get_current_admin)):
    hashed = get_password_hash(user.password)
    try:
        await database.execute(admin_users.insert().values(username=user.username, hashed_password=hashed))
    except Exception:
        raise HTTPException(status_code=400, detail="username may already exist")
    return {"status": "ok", "message": "admin created"}

@app.post("/admin/token", response_model=Token)
async def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends()):
    user = await authenticate_admin(form_data.username, form_data.password)
    if not user:
        raise HTTPException(status_code=400, detail="Incorrect username or password")
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(data={"sub": user["username"]}, expires_delta=access_token_expires)
    return {"access_token": access_token, "token_type": "bearer"}

