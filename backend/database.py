
"""database.py

Async database connection (databases) + SQLAlchemy metadata.
Also defines a persistent cache table and helpers to get/set cache entries.

This file is written to be cross-compatible with both SQLite (development) and Postgres (production).
To switch to Postgres, set DATABASE_URL to a postgres connection string and ensure psycopg2-binary is installed.
"""
import os, json
from databases import Database
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import create_engine, MetaData, Table, Column, String, DateTime, Text
from datetime import datetime, timedelta

# Read DB URL from environment; default to a local SQLite file for convenience.
DATABASE_URL = os.getenv('DATABASE_URL', "sqlite+aiosqlite:///./bingeworthy.db")

# `database` is the async interface used throughout the app (await database.fetch_one(...))
database = Database(DATABASE_URL)

# `engine` is the synchronous engine used by SQLAlchemy for schema creation and Alembic.
async_engine = create_async_engine(DATABASE_URL, echo=True)
# Sync engine used for metadata.create_all()
sync_engine = create_engine(DATABASE_URL.replace("postgresql+asyncpg://", "postgresql://"))


# Metadata object collects tables so Alembic can access them for migrations.
metadata = MetaData()

# Cache table stores JSON payloads (stringified) and a timestamp.
# We use TEXT for the `value` column to be safe with larger JSON blobs and Postgres compatibility.
cache = Table(
    "cache", metadata,
    Column("key", String, primary_key=True),
    Column("value", Text),
    Column("timestamp", DateTime, default=datetime.utcnow),
)

# Cache expiry settings (tunable)
CACHE_EXPIRY_LLM = timedelta(hours=24)      # LLM suggestions cache for 24 hours
CACHE_EXPIRY_MOVIE = timedelta(hours=24)    # Movie details cache for 24 hours
CACHE_EXPIRY_TREND = timedelta(hours=1)     # Trending lists cache for 1 hour

async def get_cache(db: Database, key: str, expiry: timedelta):
    """Return parsed JSON from cache if still fresh, else None.

    Args:
      db: the `databases.Database` connection object.
      key: cache key (string)
      expiry: timedelta after which cache is stale
    """
    query = cache.select().where(cache.c.key == key)
    row = await db.fetch_one(query)
    if not row:
        return None
    # row['timestamp'] is a datetime; check freshness
    if datetime.utcnow() - row['timestamp'] < expiry:
        try:
            return json.loads(row['value']) if row['value'] else None
        except Exception:
            # If JSON parsing fails for any reason, return None to force a fresh fetch
            return None
    return None

async def set_cache(db: Database, key: str, value: dict):
    """Store a JSON-serializable dict in the cache with the current timestamp.
    We use a simple delete+insert as an upsert (works both in SQLite and Postgres).
    """
    await db.execute(cache.delete().where(cache.c.key == key))
    await db.execute(cache.insert().values(key=key, value=json.dumps(value), timestamp=datetime.utcnow()))
