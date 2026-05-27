from __future__ import annotations

import tempfile
from pathlib import Path
from uuid import UUID

from app.core.config import settings
from app.core.s3 import get_s3_client
from app.core.logger import worker_logger as logger
from app.models.dataset import DatasetStatus
from app.worker.celery_app import celery_app
from app.models.user import User


@celery_app.task(
    bind=True,
    name="app.worker.tasks.process_dataset",
    max_retries=3,
    default_retry_delay=10,
    acks_late=True,
)
def process_dataset(self, dataset_id: str, s3_key: str, file_type: str):
    from sqlalchemy import create_engine
    from sqlalchemy.orm import sessionmaker
    from app.models.dataset import Dataset
    from app.models.user import User
    from app.services.parser import parse_file
    from app.db.duckdb import get_write_conn

    engine = create_engine(settings.SYNC_DATABASE_URL)
    Session = sessionmaker(bind=engine)

    tmp_path = None

    with Session() as db:
        dataset = db.get(Dataset, UUID(dataset_id))
        if not dataset:
            logger.error(f"Dataset {dataset_id} not found")
            return

        try:
            logger.info(f"[{dataset_id}] Downloading from S3: {s3_key}")
            s3 = get_s3_client()

            suffix = Path(s3_key).suffix
            with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as tmp:
                s3.download_fileobj(settings.S3_BUCKET, s3_key, tmp)
                tmp_path = tmp.name

            logger.info(f"[{dataset_id}] Parsing {file_type}")
            result = parse_file(tmp_path, file_type)

            duckdb_table = f"ds_{dataset_id.replace('-', '_')}"
            logger.info(f"[{dataset_id}] Ingesting into DuckDB table: {duckdb_table}")
            duck = get_write_conn()
            try:
                duck.execute(f'DROP TABLE IF EXISTS "{duckdb_table}"')
                duck.register("_tmp_df", result.df)
                duck.execute(f'CREATE TABLE "{duckdb_table}" AS SELECT * FROM _tmp_df')
                duck.unregister("_tmp_df")
            finally:
                duck.close()

            dataset.status = DatasetStatus.ready
            dataset.row_count = result.row_count
            dataset.column_count = result.column_count
            dataset.schema = [col.model_dump() for col in result.schema]
            dataset.stats = result.stats
            dataset.duckdb_table = duckdb_table
            dataset.file_path = s3_key
            db.commit()

            logger.info(f"[{dataset_id}] Done ✓")

        except Exception as exc:
            logger.error(f"[{dataset_id}] Failed: {exc}", exc_info=True)
            dataset.status = DatasetStatus.error
            dataset.error_message = str(exc)
            db.commit()
            raise self.retry(exc=exc)

        finally:
            if tmp_path:
                try:
                    Path(tmp_path).unlink(missing_ok=True)
                except Exception:
                    pass