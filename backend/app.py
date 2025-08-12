\
import os, hashlib, json
from datetime import datetime, timedelta
from typing import Optional, Dict, Any
from fastapi import FastAPI, HTTPException, Depends, status, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from pydantic import BaseModel
from passlib.context import CryptContext
import httpx
from jose import JWTError, jwt
from dotenv import load_dotenv

from database import database, async_engine, sync_engine, metadata, cache, get_cache, set_cache, CACHE_EXPIRY_LLM, CACHE_EXPIRY_MOVIE, CACHE_EXPIRY_TREND, admin_users, settings as settings_table

load_dotenv()

SECRET_KEY = os.getenv('SECRET_KEY', 'change_this')
ALGORITHM = 'HS256'
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv('ACCESS_TOKEN_EXPIRE_MINUTES', '60'))

TMDB_API_KEY = os.getenv('TMDB_API_KEY')
OMDB_API_KEY = os.getenv('OMDB_API_KEY')
HF_API_TOKEN = os.getenv('HF_API_TOKEN')
DEFAULT_PROVIDER_REGION = os.getenv('DEFAULT_PROVIDER_REGION', 'US')

app = FastAPI(title='Bingeworthy AI Backend')

# CORS
allowed = os.getenv('ALLOWED_ORIGINS', 'http://localhost:3000,https://bingeworthy-ai.vercel.app,https://bingeworthy-ai.onrender.com').split(',')
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed,
    allow_credentials=True,
    allow_methods=['*'],
    allow_headers=['*'],
)

# ensure tables (sync) - create on startup too
try:
    metadata.create_all(sync_engine)
except Exception:
    pass

pwd_context = CryptContext(schemes=['bcrypt'], deprecated='auto')
oauth2_scheme = OAuth2PasswordBearer(tokenUrl='/admin/token')


class Token(BaseModel):
    access_token: str
    token_type: str

class AdminUserIn(BaseModel):
    username: str
    password: str

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)

async def get_admin_user(username: str):
    q = admin_users.select().where(admin_users.c.username == username)
    return await database.fetch_one(q)

async def authenticate_admin(username: str, password: str):
    user = await get_admin_user(username)
    if not user:
        return False
    if not verify_password(password, user['hashed_password']):
        return False
    return user

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
    to_encode.update({'exp': expire, 'sub': data.get('sub')})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

async def get_current_admin(token: str = Depends(oauth2_scheme)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail='Could not validate credentials',
        headers={'WWW-Authenticate': 'Bearer'},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get('sub')
        if username is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    user = await get_admin_user(username)
    if user is None:
        raise credentials_exception
    return user

@app.on_event('startup')
async def startup():
    # create tables async
    async with async_engine.begin() as conn:
        await conn.run_sync(metadata.create_all)
    await database.connect()
    q = admin_users.select().limit(1)
    existing = await database.fetch_one(q)
    if not existing:
        hashed = get_password_hash('admin123')
        await database.execute(admin_users.insert().values(username='admin', hashed_password=hashed))
        print("Created default admin 'admin' with password 'admin123'. Change ASAP.")

@app.on_event('shutdown')
async def shutdown():
    await database.disconnect()

def normalize_imdb(value: Optional[str]) -> Optional[float]:
    if not value:
        return None
    try:
        parts = value.split('/')
        score = float(parts[0])
        return score * 10.0
    except Exception:
        return None

def normalize_rt(value: Optional[str]) -> Optional[float]:
    if not value:
        return None
    try:
        return float(value.replace('%','').strip())
    except Exception:
        return None

def normalize_tmdb(value: Optional[float]) -> Optional[float]:
    if value is None:
        return None
    try:
        return float(value) * 10.0
    except Exception:
        return None

def aggregate_ratings(tmdb_score: Optional[float], imdb: Optional[str], rt: Optional[str]) -> Dict[str, Any]:
    weights = {'tmdb': 0.2, 'imdb': 0.5, 'rt': 0.3}
    vals = {}
    tmdb_n = normalize_tmdb(tmdb_score)
    imdb_n = normalize_imdb(imdb)
    rt_n = normalize_rt(rt)
    total_weight = 0.0
    weighted_sum = 0.0
    if tmdb_n is not None:
        weighted_sum += tmdb_n * weights['tmdb']
        total_weight += weights['tmdb']
        vals['tmdb'] = tmdb_n
    if imdb_n is not None:
        weighted_sum += imdb_n * weights['imdb']
        total_weight += weights['imdb']
        vals['imdb'] = imdb_n
    if rt_n is not None:
        weighted_sum += rt_n * weights['rt']
        total_weight += weights['rt']
        vals['rt'] = rt_n
    aggregated = round(weighted_sum / total_weight, 1) if total_weight > 0 else None
    return {'aggregated': aggregated, 'breakdown': vals}

async def get_tmdb_providers(tmdb_id: int, media_type: str = 'movie', region: str = DEFAULT_PROVIDER_REGION):
    key = f"providers_{media_type}_{tmdb_id}_{region}"
    cached = await get_cache(database, key, CACHE_EXPIRY_MOVIE)
    if cached:
        return cached
    if not TMDB_API_KEY:
        return {'providers': [], 'link': None}
    url = f"https://api.themoviedb.org/3/{'movie' if media_type == 'movie' else 'tv'}/{tmdb_id}/watch/providers"
    params = {'api_key': TMDB_API_KEY}
    async with httpx.AsyncClient() as client:
        resp = await client.get(url, params=params, timeout=10)
        if resp.status_code != 200:
            return {'providers': [], 'link': None}
        data = resp.json()
        results = data.get('results', {})
        region_info = results.get(region, {}) if results else {}
        provider_names = []
        for cat in ['flatrate','rent','buy','ads']:
            for p in region_info.get(cat, []) or []:
                name = p.get('provider_name')
                if name and name not in provider_names:
                    provider_names.append(name)
        link = region_info.get('link')
        parsed = {'providers': provider_names, 'link': link}
        await set_cache(database, key, parsed)
        return parsed

@app.get('/ping')
async def ping():
    return {'status':'ok'}

@app.get('/suggest')
async def suggest(query: str = Query(..., min_length=2)):
    qnorm = query.strip().lower()
    cache_key = f"suggest_{hashlib.sha256(qnorm.encode()).hexdigest()}"
    cached = await get_cache(database, cache_key, timedelta(hours=6))
    if cached:
        return {'source':'cache','suggestions':cached}
    suggestions = []
    if TMDB_API_KEY:
        url = 'https://api.themoviedb.org/3/search/multi'
        params = {'api_key': TMDB_API_KEY, 'query': query, 'page': 1, 'include_adult':'false'}
        async with httpx.AsyncClient() as client:
            resp = await client.get(url, params=params, timeout=6)
            if resp.status_code == 200:
                data = resp.json()
                for item in data.get('results',[])[:8]:
                    title = item.get('title') or item.get('name')
                    if title and title not in suggestions:
                        suggestions.append(title)
    if not suggestions and HF_API_TOKEN:
        llm_key = f"llm_suggest_{hashlib.sha256(query.lower().encode()).hexdigest()}"
        llm_cached = await get_cache(database, llm_key, CACHE_EXPIRY_LLM)
        if llm_cached:
            suggestions = llm_cached
        else:
            prompt = f"Give 6 short streaming search suggestions for: '{query}' (comma separated)."
            headers = {'Authorization': f'Bearer {HF_API_TOKEN}', 'Content-Type': 'application/json'}
            payload = {'inputs': prompt, 'parameters': {'max_new_tokens': 50, 'temperature': 0.7}}
            async with httpx.AsyncClient() as client:
                r = await client.post('https://api-inference.huggingface.co/models/gpt2', headers=headers, json=payload, timeout=12)
                if r.status_code == 200:
                    data = r.json()
                    generated = data[0].get('generated_text') if isinstance(data, list) else (data.get('generated_text') or '')
                    text = generated.replace(prompt,'').strip()
                    suggestions = [s.strip() for s in text.replace('\\n', ',').split(',') if s.strip()][:6]
            if suggestions:
                await set_cache(database, llm_key, suggestions)
    await set_cache(database, cache_key, suggestions)
    return {'source': 'tmdb' if suggestions else 'none', 'suggestions': suggestions}

@app.get('/search')
async def search_movies(query: Optional[str] = None, platform: Optional[str] = None, genre: Optional[str] = None, language: Optional[str] = None, country: Optional[str] = None, page: int = 1):
    if not TMDB_API_KEY or not OMDB_API_KEY:
        raise HTTPException(status_code=500, detail='TMDb or OMDb API keys missing')
    async with httpx.AsyncClient() as client:
        tmdb_url = 'https://api.themoviedb.org/3/search/multi'
        params = {'api_key': TMDB_API_KEY, 'query': query or '', 'language': 'en-US', 'include_adult': 'false', 'page': page}
        resp = await client.get(tmdb_url, params=params, timeout=15)
        if resp.status_code != 200:
            raise HTTPException(status_code=502, detail='TMDb API error')
        tmdb_data = resp.json()
        results = []
        for item in tmdb_data.get('results', [])[:100]:
            title = item.get('title') or item.get('name')
            year = (item.get('release_date') or item.get('first_air_date') or '')[:4]
            tmdb_id = item.get('id')
            media_type = item.get('media_type') or ('movie' if item.get('title') else 'tv')
            cache_key = f"movie_detail_{media_type}_{tmdb_id}"
            cached = await get_cache(database, cache_key, CACHE_EXPIRY_MOVIE)
            if cached:
                results.append(cached)
                continue
            omdb_url = 'http://www.omdbapi.com/'
            omdb_params = {'apikey': OMDB_API_KEY, 't': title, 'y': year}
            omdb_resp = await client.get(omdb_url, params=omdb_params, timeout=10)
            omdb_data = omdb_resp.json() if omdb_resp.status_code == 200 else {}
            ratings = omdb_data.get('Ratings', [])
            imdb_rating = next((r['Value'] for r in ratings if r.get('Source') == 'Internet Movie Database'), None)
            rt_rating = next((r['Value'] for r in ratings if r.get('Source') == 'Rotten Tomatoes'), None)
            tmdb_vote = item.get('vote_average')
            agg = aggregate_ratings(tmdb_vote, imdb_rating, rt_rating)
            providers = await get_tmdb_providers(tmdb_id, media_type=media_type, region=country or DEFAULT_PROVIDER_REGION)
            # Fetch TMDb details to ensure poster and videos (trailer) are accurate
            tmdb_detail = {}
            tmdb_poster = None
            tmdb_trailer = None
            try:
                if TMDB_API_KEY:
                    # movie or tv details endpoint
                    details_url = f"https://api.themoviedb.org/3/{'movie' if media_type=='movie' else 'tv'}/{tmdb_id}"
                    details_params = {'api_key': TMDB_API_KEY, 'language': 'en-US'}
                    details_resp = await client.get(details_url, params=details_params, timeout=8)
                    if details_resp.status_code == 200:
                        tmdb_detail = details_resp.json()
                        poster_path = tmdb_detail.get('poster_path')
                        if poster_path:
                            tmdb_poster = f"https://image.tmdb.org/t/p/w500{poster_path}"
                        # Fetch videos to get a trailer (YouTube)
                        videos_url = f"https://api.themoviedb.org/3/{'movie' if media_type=='movie' else 'tv'}/{tmdb_id}/videos"
                        videos_resp = await client.get(videos_url, params={'api_key': TMDB_API_KEY}, timeout=8)
                        if videos_resp.status_code == 200:
                            videos = videos_resp.json().get('results', [])
                            # Prefer official trailers from YouTube
                            for v in videos:
                                if v.get('site','').lower() == 'youtube' and v.get('type','').lower() in ('trailer','teaser'):
                                    tmdb_trailer = f"https://www.youtube.com/watch?v={v.get('key')}"
                                    break
            except Exception:
                tmdb_detail = {}
            # Build final movie detail payload
            movie_detail = {
                'id': tmdb_id,
                'title': title,
                'year': year,
                'media_type': media_type,
                'summary': omdb_data.get('Plot') if omdb_data.get('Plot') not in (None, 'N/A') else item.get('overview') or '',
                'poster': tmdb_poster or (f"https://image.tmdb.org/t/p/w500{item.get('poster_path')}" if item.get('poster_path') else None),
                'imdb_rating': imdb_rating,
                'rotten_tomatoes_rating': rt_rating,
                'tmdb_vote_average': tmdb_vote,
                'aggregated_rating': agg.get('aggregated'),
                'platforms': providers.get('providers', []),
                'provider_link': providers.get('link'),
                'tmdb': tmdb_detail,
                'trailer': tmdb_trailer
            }
            await set_cache(database, cache_key, movie_detail)
            results.append(movie_detail)
        results_sorted = sorted(results, key=lambda r: (r.get('aggregated_rating') or 0), reverse=True)
        return {
            'page': tmdb_data.get('page', page),
            'total_pages': tmdb_data.get('total_pages', 1),
            'total_results': tmdb_data.get('total_results', len(results_sorted)),
            'results': results_sorted
        }
