import pandas as pd
from app.db.duckdb import get_duck, get_write_conn
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

    conn = get_write_conn()
    try:
        conn.execute(f'DROP TABLE IF EXISTS "{table}"')
        conn.register("_tmp_df", df)
        conn.execute(f'CREATE TABLE "{table}" AS SELECT * FROM _tmp_df')
        conn.unregister("_tmp_df")
        row_count = conn.execute(f'SELECT COUNT(*) FROM "{table}"').fetchone()[0]
    finally:
        conn.close()

    logger.info(f"DuckDB table {table} ready — {row_count} rows")
    return table


def drop_table(dataset_id: str) -> None:
    """Called when a dataset is deleted from Postgres."""
    table = table_name_for(dataset_id)
    conn = get_write_conn()
    try:
        conn.execute(f'DROP TABLE IF EXISTS "{table}"')
    finally:
        conn.close()
    logger.info(f"DuckDB table {table} dropped")


def query_table(dataset_id: str, sql: str) -> pd.DataFrame:
    """
    Run an arbitrary SQL query scoped to this dataset's table.
    Caller passes SQL referencing the magic alias `dataset` which
    gets rewritten to the real table name.
    """
    table = table_name_for(dataset_id)
    scoped_sql = sql.replace("dataset", f'"{table}"')
    with get_duck() as conn:
        return conn.execute(scoped_sql).df()