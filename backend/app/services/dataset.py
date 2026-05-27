"""
Dataset service — async CRUD + file management.
"""
from __future__ import annotations

import os
import shutil
import uuid
from pathlib import Path
from typing import Any
from uuid import UUID

from fastapi import UploadFile, HTTPException, status
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.logger import logger
from app.models.dataset import Dataset, DatasetStatus
from app.schemas.dataset import DatasetRead, DatasetList
from app.services.parser import parse_file, preview_file
from app.services.duckdb_ingest import ingest_dataframe

ALLOWED_EXTENSIONS = {
    "text/csv": "csv",
    "application/vnd.ms-excel": "excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "excel",
    "application/json": "json",
}

ALLOWED_SUFFIXES = {".csv": "csv", ".xls": "excel", ".xlsx": "excel", ".json": "json"}

MAX_FILE_SIZE = 100 * 1024 * 1024  # 100 MB


def _upload_dir() -> Path:
    upload_dir = Path(getattr(settings, "UPLOAD_DIR", "uploads"))
    upload_dir.mkdir(parents=True, exist_ok=True)
    return upload_dir


def _detect_file_type(filename: str, content_type: str) -> str:
    suffix = Path(filename).suffix.lower()
    if suffix in ALLOWED_SUFFIXES:
        return ALLOWED_SUFFIXES[suffix]
    if content_type in ALLOWED_EXTENSIONS:
        return ALLOWED_EXTENSIONS[content_type]
    raise HTTPException(
        status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
        detail=f"Unsupported file type. Allowed: CSV, Excel, JSON.",
    )


# ── Upload ────────────────────────────────────────────────────────────────────

async def upload_dataset(
    db: AsyncSession,
    user_id: UUID,
    file: UploadFile,
    name: str | None = None,
) -> DatasetRead:
    file_type = _detect_file_type(file.filename or "", file.content_type or "")

    # Save file to disk
    dataset_id = uuid.uuid4()
    upload_dir = _upload_dir() / str(user_id)
    upload_dir.mkdir(parents=True, exist_ok=True)
    file_path = upload_dir / f"{dataset_id}{Path(file.filename or 'upload').suffix}"

    size = 0
    with open(file_path, "wb") as f:
        while chunk := await file.read(1024 * 64):  # 64 KB chunks
            size += len(chunk)
            if size > MAX_FILE_SIZE:
                f.close()
                file_path.unlink(missing_ok=True)
                raise HTTPException(
                    status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                    detail="File exceeds 100 MB limit.",
                )
            f.write(chunk)

    dataset_name = name or Path(file.filename or "Untitled").stem

    # Create DB record with pending status
    dataset = Dataset(
        id=dataset_id,
        user_id=user_id,
        name=dataset_name,
        original_filename=file.filename or "upload",
        file_path=str(file_path),
        file_size=size,
        file_type=file_type,
        status=DatasetStatus.processing,
    )
    db.add(dataset)
    await db.commit()
    await db.refresh(dataset)

    # Parse synchronously (swap for Celery task in production)
    try:
        result = parse_file(str(file_path), file_type)
        dataset.status = DatasetStatus.ready
        dataset.row_count = result.row_count
        dataset.column_count = result.column_count
        dataset.schema = [col.model_dump() for col in result.schema]
        dataset.stats = result.stats
    except Exception as exc:
        logger.error("Parse failed", extra={"dataset_id": str(dataset_id), "error": str(exc)})
        dataset.status = DatasetStatus.error
        dataset.error_message = str(exc)

    await db.commit()
    await db.refresh(dataset)
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
    return preview_file(dataset.file_path, dataset.file_type, limit=limit)


# ── Delete ────────────────────────────────────────────────────────────────────

async def delete_dataset(db: AsyncSession, user_id: UUID, dataset_id: UUID) -> None:
    dataset = await _get_dataset_orm(db, user_id, dataset_id)
    file_path = Path(dataset.file_path)
    await db.delete(dataset)
    await db.commit()
    if file_path.exists():
        file_path.unlink()
    logger.info("Dataset deleted", extra={"dataset_id": str(dataset_id)})



    #=========================DUCKDB=====================

    # app/services/dataset.py
async def upload_dataset(
    db: AsyncSession,
    user_id: UUID,
    file: UploadFile,
    name: str | None = None,
) -> DatasetRead:
    file_type = _detect_file_type(file.filename or "", file.content_type or "")

    dataset_id = uuid.uuid4()
    upload_dir = _upload_dir() / str(user_id)
    upload_dir.mkdir(parents=True, exist_ok=True)
    file_path = upload_dir / f"{dataset_id}{Path(file.filename or 'upload').suffix}"

    size = 0
    with open(file_path, "wb") as f:
        while chunk := await file.read(1024 * 64):
            size += len(chunk)
            if size > MAX_FILE_SIZE:
                f.close()
                file_path.unlink(missing_ok=True)
                raise HTTPException(
                    status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                    detail="File exceeds 100 MB limit.",
                )
            f.write(chunk)

    dataset_name = name or Path(file.filename or "Untitled").stem

    dataset = Dataset(
        id=dataset_id,
        user_id=user_id,
        name=dataset_name,
        original_filename=file.filename or "upload",
        file_path=str(file_path),
        file_size=size,
        file_type=file_type,
        status=DatasetStatus.processing,
    )
    db.add(dataset)
    await db.commit()
    await db.refresh(dataset)

    try:
        # 1. Parse file → DataFrame + stats
        result = parse_file(str(file_path), file_type)

        # 2. Ingest DataFrame into DuckDB as permanent table
        duckdb_table = ingest_dataframe(str(dataset_id), result.df)

        # 3. Store only metadata in Postgres
        dataset.status       = DatasetStatus.ready
        dataset.row_count    = result.row_count
        dataset.column_count = result.column_count
        dataset.schema       = [col.model_dump() for col in result.schema]
        dataset.stats        = result.stats
        dataset.duckdb_table = duckdb_table   # ← the link between Postgres and DuckDB

    except Exception as exc:
        logger.error("Ingest failed", extra={"dataset_id": str(dataset_id), "error": str(exc)})
        dataset.status        = DatasetStatus.error
        dataset.error_message = str(exc)

    await db.commit()
    await db.refresh(dataset)
    return DatasetRead.model_validate(dataset)