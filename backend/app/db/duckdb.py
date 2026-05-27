# app/db/duckdb.py
import duckdb
import threading
import os
from app.core.config import settings
from app.core.logger import logger


# DuckDB has one writer at a time — use a module-level lock
_lock = threading.Lock()
_conn: duckdb.DuckDBPyConnection | None = None


def _get_conn() -> duckdb.DuckDBPyConnection:
    global _conn
    if _conn is None:
        os.makedirs(os.path.dirname(settings.DUCKDB_PATH), exist_ok=True)
        _conn = duckdb.connect(
            database=settings.DUCKDB_PATH,
            read_only=settings.DUCKDB_READ_ONLY,
        )
        _conn.execute("PRAGMA threads=4")
        _conn.execute("PRAGMA memory_limit='512MB'")
        logger.info(f"DuckDB connected at {settings.DUCKDB_PATH}")
    return _conn


def get_duck() -> duckdb.DuckDBPyConnection:
    """
    Returns a per-call cursor on the shared connection.
    Each cursor is isolated for reads; writes use the module lock.
    """
    return _get_conn().cursor()


def duck_write(sql: str, params: list | None = None) -> None:
    """Thread-safe write execution."""
    with _lock:
        conn = _get_conn()
        conn.execute(sql, params or [])


def close_duck() -> None:
    global _conn
    if _conn:
        _conn.close()
        _conn = None
        logger.info("DuckDB connection closed")