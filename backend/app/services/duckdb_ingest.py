import pandas as pd
from app.db.duckdb import get_duck, duck_write, _lock
from app.core.logger import logger




def table_name_for(dataset_id: str) -> str:
    """Stable DuckDB table name from dataset UUID."""
    return f"ds_{dataset_id.replace('-', '_')}"


def ingest_dataframe(dataset_id: str, df: pd.DataFrame) -> str:
    """
    Writes a DataFrame into DuckDB as a permanent table.
    Returns the table name.
    Safe to call from a sync context (Celery worker or FastAPI thread pool).
    """
    table = table_name_for(dataset_id)
    logger.info(f"Ingesting dataset {dataset_id} → DuckDB table {table}")

    with _lock:
        conn = get_duck()
        # Drop if somehow exists (re-upload scenario)
        conn.execute(f'DROP TABLE IF EXISTS "{table}"')
        # Register df then create permanent table from it
        conn.execute(f'CREATE TABLE "{table}" AS SELECT * FROM df')
        row_count = conn.execute(f'SELECT COUNT(*) FROM "{table}"').fetchone()[0]

    logger.info(f"DuckDB table {table} ready — {row_count} rows")
    return table


def drop_table(dataset_id: str) -> None:
    """Called when a dataset is deleted from Postgres."""
    table = table_name_for(dataset_id)
    with _lock:
        conn = get_duck()
        conn.execute(f'DROP TABLE IF EXISTS "{table}"')
    logger.info(f"DuckDB table {table} dropped")


def query_table(dataset_id: str, sql: str) -> pd.DataFrame:
    """
    Run an arbitrary SQL query scoped to this dataset's table.
    The caller passes SQL referencing the magic alias `dataset` which
    gets rewritten to the real table name.
    """
    table = table_name_for(dataset_id)
    scoped_sql = sql.replace("dataset", f'"{table}"')
    cursor = get_duck()
    return cursor.execute(scoped_sql).df()
