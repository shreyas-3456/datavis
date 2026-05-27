from contextlib import contextmanager
import os
import threading

import duckdb
from app.core.config import settings

_lock = threading.Lock()


@contextmanager
def get_duck():
    """Opens a short-lived read-only DuckDB connection."""
    os.makedirs(os.path.dirname(settings.DUCKDB_PATH), exist_ok=True)
    conn = duckdb.connect(
        database=settings.DUCKDB_PATH,
        read_only=True,
    )
    try:
        conn.execute("PRAGMA threads=4")
        conn.execute("PRAGMA memory_limit='512MB'")
        yield conn
    finally:
        conn.close()


def get_write_conn() -> duckdb.DuckDBPyConnection:
    """
    Opens a fresh write connection. Caller must close it.
    Only call from the Celery worker — never from FastAPI.
    """
    os.makedirs(os.path.dirname(settings.DUCKDB_PATH), exist_ok=True)
    conn = duckdb.connect(
        database=settings.DUCKDB_PATH,
        read_only=False,
    )
    conn.execute("PRAGMA threads=4")
    conn.execute("PRAGMA memory_limit='512MB'")
    return conn


def close_duck() -> None:
    """Backward-compatible no-op now that reads are short-lived."""
    return None
