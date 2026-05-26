from sqlalchemy import event
from sqlalchemy.engine import Engine
import time
from app.core.logger import db_logger

@event.listens_for(Engine, "before_cursor_execute")
def before_cursor_execute(conn, cursor, statement, parameters, context, executemany):
    conn.info.setdefault("query_start_time", []).append(time.perf_counter())
    db_logger.debug(
        "Executing query",
        extra={
            "event": "db_query_start",
            "statement": statement.strip()[:500],
            "parameters": str(parameters)[:200] if parameters else None,
        }
    )

@event.listens_for(Engine, "after_cursor_execute")
def after_cursor_execute(conn, cursor, statement, parameters, context, executemany):
    total_ms = round((time.perf_counter() - conn.info["query_start_time"].pop()) * 1000, 2)

    log_fn = db_logger.warning if total_ms > 500 else db_logger.debug
    log_fn(
        f"Query completed in {total_ms}ms",
        extra={
            "event": "db_query_end",
            "duration_ms": total_ms,
            "statement": statement.strip()[:500],
            "slow_query": total_ms > 500,
        }
    )