
"""models.py - SQLAlchemy table definitions for admin and settings.

We use simple tables here. For production, you may want to add more fields (email, roles, last_login, etc.).
"""
from sqlalchemy import Table, Column, Integer, String, JSON, Text
from database import metadata

admin_users = Table(
    'admin_users', metadata,
    Column('id', Integer, primary_key=True),
    Column('username', String, unique=True, index=True, nullable=False),
    Column('hashed_password', String, nullable=False),
)

settings = Table(
    'settings', metadata,
    Column('id', Integer, primary_key=True),
    Column('search_fields', JSON, default={"platforms": True, "genres": True, "actors": True}),
    Column('card_fields', JSON, default={"title": True, "rating": True, "summary": True, "platform": True}),
)
