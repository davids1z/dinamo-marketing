"""
Root conftest: set environment variables before ANY app module is imported.
Replaces PostgreSQL and Redis URLs with in-process SQLite and memory
storage so tests run without any external services.
"""
import os

# SQLite in-process DB — overrides the Postgres defaults in config.py
os.environ.setdefault(
    "DATABASE_URL",
    "sqlite+aiosqlite:///./test.db",
)
os.environ.setdefault(
    "DATABASE_URL_SYNC",
    "sqlite:///./test.db",
)
# Use memory-backed rate limiting so slowapi doesn't try to hit Redis
os.environ.setdefault("REDIS_URL", "memory://")
os.environ.setdefault("CELERY_BROKER_URL", "memory://")
os.environ.setdefault("CELERY_RESULT_BACKEND", "memory://")
