import os, json
from databases import Database
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import create_engine, MetaData, Table, Column, String, DateTime, Text, Integer, JSON
from datetime import datetime, timedelta
from dotenv import load_dotenv
load_dotenv()

DATABASE_URL = os.getenv('DATABASE_URL', "sqlite+aiosqlite:///./bingeworthy.db")

# async DB interface for runtime queries
database = Database(DATABASE_URL)

# async engine for runtime operations and run_sync metadata creation
async_engine = create_async_engine(DATABASE_URL, echo=False)

# sync engine for metadata.create_all (replace async driver prefix if present)
_sync_url = DATABASE_URL
if _sync_url.startswith("postgresql+asyncpg://"):
    _sync_url = _sync_url.replace("postgresql+asyncpg://", "postgresql://")
if _sync_url.startswith("sqlite+aiosqlite://"):
    _sync_url = _sync_url.replace("+aiosqlite", "")

sync_engine = create_engine(_sync_url, echo=False)

metadata = MetaData()

# simple cache table
cache = Table(
    "cache", metadata,
    Column("key", String, primary_key=True),
    Column("value", Text),
    Column("timestamp", DateTime, default=datetime.utcnow),
)

# admin users and settings tables
admin_users = Table(
    'admin_users', metadata,
    Column('id', Integer, primary_key=True),
    Column('username', String, unique=True, index=True, nullable=False),
    Column('hashed_password', String, nullable=False),
)

settings = Table(
    'settings', metadata,
    Column('id', Integer, primary_key=True),
    Column('search_fields', JSON, nullable=True),
    Column('card_fields', JSON, nullable=True),
)

CACHE_EXPIRY_LLM = timedelta(hours=24)
CACHE_EXPIRY_MOVIE = timedelta(hours=24)
CACHE_EXPIRY_TREND = timedelta(hours=1)

async def get_cache(db: Database, key: str, expiry: timedelta):
    query = cache.select().where(cache.c.key == key)
    row = await db.fetch_one(query)
    if not row:
        return None
    # some DB drivers return datetime objects; ensure freshness
    try:
        ts = row['timestamp']
        if isinstance(ts, str):
            ts = datetime.fromisoformat(ts)
    except Exception:
        ts = None
    if ts and (datetime.utcnow() - ts < expiry):
        try:
            return json.loads(row['value']) if row['value'] else None
        except Exception:
            return None
    return None

async def set_cache(db: Database, key: str, value: dict):
    await db.execute(cache.delete().where(cache.c.key == key))
    await db.execute(cache.insert().values(key=key, value=json.dumps(value), timestamp=datetime.utcnow()))
