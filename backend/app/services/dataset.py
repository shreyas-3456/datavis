from __future__ import annotations

from pathlib import Path
from typing import Any
from uuid import UUID
import uuid

from fastapi import HTTPException, status
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.logger import logger
from app.core.s3 import generate_presigned_put, delete_s3_object
from app.models.dataset import Dataset, DatasetStatus
from app.schemas.dataset import DatasetRead, DatasetList
from app.services.parser import preview_file
from app.worker.tasks import process_dataset

ALLOWED_SUFFIXES = {".csv": "csv", ".xls": "excel", ".xlsx": "excel", ".json": "json"}
MAX_FILE_SIZE = 100 * 1024 * 1024  # 100 MB


def _detect_file_type(filename: str) -> str:
    suffix = Path(filename).suffix.lower()
    if suffix in ALLOWED_SUFFIXES:
        return ALLOWED_SUFFIXES[suffix]
    raise HTTPException(
        status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
        detail="Unsupported file type. Allowed: CSV, Excel, JSON.",
    )


def _content_type_for(file_type: str) -> str:
    return {
        "csv": "text/csv",
        "excel": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "json": "application/json",
    }.get(file_type, "application/octet-stream")


# ── Presign ───────────────────────────────────────────────────────────────────
async def presign_upload(
    db: AsyncSession,
    user_id: UUID,
    filename: str,
    file_size: int = 0,
    name: str | None = None,
) -> dict:
    file_type = _detect_file_type(filename)
    dataset_id = uuid.uuid4()
    suffix = Path(filename).suffix.lower()
    s3_key = f"{settings.S3_KEY_PREFIX}/{user_id}/{dataset_id}{suffix}"
    content_type = _content_type_for(file_type)

    dataset = Dataset(
        id=dataset_id,
        user_id=user_id,
        name=name or Path(filename).stem,
        original_filename=filename,
        file_path=s3_key,
        file_size=file_size,
        file_type=file_type,
        status=DatasetStatus.pending,
    )
    db.add(dataset)
    await db.flush()

    presigned_url = generate_presigned_put(s3_key, _content_type_for(file_type))

    return {
        "dataset_id": str(dataset_id),
        "upload_url": presigned_url,
        "s3_key": s3_key,
        "expires_in": settings.S3_PRESIGN_EXPIRY,
        "content_type": content_type
    }
# ── Confirm ───────────────────────────────────────────────────────────────────

async def confirm_upload(
    db: AsyncSession,
    user_id: UUID,
    dataset_id: UUID,
) -> DatasetRead:
    result = await db.execute(
        select(Dataset).where(Dataset.id == dataset_id, Dataset.user_id == user_id)
    )
    dataset = result.scalar_one_or_none()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found.")
    if dataset.status != DatasetStatus.pending:
        raise HTTPException(status_code=409, detail="Dataset already confirmed or processing.")

    dataset.status = DatasetStatus.processing
    await db.flush()

    # Enqueue — Celery wakes worker instantly via Redis BRPOP
    process_dataset.delay(
        str(dataset.id),
        dataset.file_path,   # s3_key
        dataset.file_type,
    )

    logger.info(f"Enqueued dataset {dataset_id} for processing")
    return DatasetRead.model_validate(dataset)


# ── List ──────────────────────────────────────────────────────────────────────

async def list_datasets(
    db: AsyncSession,
    user_id: UUID,
    skip: int = 0,
    limit: int = 50,
) -> DatasetList:
    count_result = await db.execute(
        select(func.count(Dataset.id)).where(Dataset.user_id == user_id)
    )
    total = count_result.scalar_one()
    result = await db.execute(
        select(Dataset)
        .where(Dataset.user_id == user_id)
        .order_by(Dataset.created_at.desc())
        .offset(skip)
        .limit(limit)
    )
    datasets = result.scalars().all()
    return DatasetList(
        items=[DatasetRead.model_validate(d) for d in datasets],
        total=total,
    )


# ── Get ───────────────────────────────────────────────────────────────────────

async def get_dataset(db: AsyncSession, user_id: UUID, dataset_id: UUID) -> DatasetRead:
    result = await db.execute(
        select(Dataset).where(Dataset.id == dataset_id, Dataset.user_id == user_id)
    )
    dataset = result.scalar_one_or_none()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found.")
    return DatasetRead.model_validate(dataset)


async def _get_dataset_orm(db: AsyncSession, user_id: UUID, dataset_id: UUID) -> Dataset:
    result = await db.execute(
        select(Dataset).where(Dataset.id == dataset_id, Dataset.user_id == user_id)
    )
    dataset = result.scalar_one_or_none()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found.")
    return dataset


# ── Preview ───────────────────────────────────────────────────────────────────

async def get_dataset_preview(
    db: AsyncSession,
    user_id: UUID,
    dataset_id: UUID,
    limit: int = 100,
) -> dict[str, Any]:
    dataset = await _get_dataset_orm(db, user_id, dataset_id)
    if dataset.status != DatasetStatus.ready:
        raise HTTPException(status_code=400, detail="Dataset is not ready yet.")
    # Preview now queries DuckDB directly instead of reading the file
    from app.db.duckdb import get_duck
    with get_duck() as conn:
        rows = conn.execute(
        f'SELECT * FROM "{dataset.duckdb_table}" LIMIT {limit}'
    ).fetchdf()
    columns = list(rows.columns)
    return {
        "columns": columns,
        "rows": rows.where(rows.notna(), None).values.tolist(),
        "total_rows": dataset.row_count,
    }


# ── Delete ────────────────────────────────────────────────────────────────────

async def delete_dataset(db: AsyncSession, user_id: UUID, dataset_id: UUID) -> None:
    dataset = await _get_dataset_orm(db, user_id, dataset_id)
    s3_key = dataset.file_path
    duckdb_table = dataset.duckdb_table

    await db.delete(dataset)
    await db.flush()

    # Clean up S3
    try:
        delete_s3_object(s3_key)
    except Exception as exc:
        logger.warning(f"S3 delete failed for {s3_key}: {exc}")

    # Clean up DuckDB
    if duckdb_table:
        try:
            from app.db.duckdb import get_write_conn
            duck = get_write_conn()
            try:
                duck.execute(f'DROP TABLE IF EXISTS "{duckdb_table}"')
            finally:
                duck.close()
        except Exception as exc:
            logger.warning(f"DuckDB drop failed for {duckdb_table}: {exc}")

    logger.info("Dataset deleted", extra={"dataset_id": str(dataset_id)})
