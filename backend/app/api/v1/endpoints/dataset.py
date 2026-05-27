"""
/api/v1/datasets — Dataset upload and management endpoints.
"""
from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, File, Form, Query, UploadFile, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.users import get_current_user
from app.db.session import get_db
from app.models.user import User
from app.schemas.dataset import DatasetList, DatasetPreview, DatasetRead
from app.services import dataset as dataset_service

router = APIRouter(prefix="/datasets", tags=["datasets"])


@router.post(
    "/",
    response_model=DatasetRead,
    status_code=status.HTTP_201_CREATED,
    summary="Upload a dataset (CSV, Excel, JSON)",
)
async def upload_dataset(
    file: UploadFile = File(...),
    name: str | None = Form(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> DatasetRead:
    return await dataset_service.upload_dataset(
        db=db,
        user_id=current_user.id,
        file=file,
        name=name,
    )


@router.get(
    "/",
    response_model=DatasetList,
    summary="List all datasets for the current user",
)
async def list_datasets(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> DatasetList:
    return await dataset_service.list_datasets(
        db=db,
        user_id=current_user.id,
        skip=skip,
        limit=limit,
    )


@router.get(
    "/{dataset_id}",
    response_model=DatasetRead,
    summary="Get a single dataset",
)
async def get_dataset(
    dataset_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> DatasetRead:
    return await dataset_service.get_dataset(
        db=db,
        user_id=current_user.id,
        dataset_id=dataset_id,
    )


@router.get(
    "/{dataset_id}/preview",
    response_model=DatasetPreview,
    summary="Preview up to N rows of a dataset",
)
async def preview_dataset(
    dataset_id: UUID,
    limit: int = Query(100, ge=1, le=1000),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> DatasetPreview:
    raw = await dataset_service.get_dataset_preview(
        db=db,
        user_id=current_user.id,
        dataset_id=dataset_id,
        limit=limit,
    )
    return DatasetPreview(**raw)


@router.delete(
    "/{dataset_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a dataset and its file",
)
async def delete_dataset(
    dataset_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> None:
    await dataset_service.delete_dataset(
        db=db,
        user_id=current_user.id,
        dataset_id=dataset_id,
    )