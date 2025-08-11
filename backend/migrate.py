from models import metadata  # import your metadata from models.py or wherever defined
from database import async_engine
import asyncio

async def create_tables():
    async with async_engine.begin() as conn:
        await conn.run_sync(metadata.create_all)
    print("Tables created successfully!")

if __name__ == "__main__":
    asyncio.run(create_tables())
