from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, Query, status
from pydantic import BaseModel, field_validator
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.users import get_current_user
from app.db.session import get_db
from app.models.user import User
from app.schemas.dataset import DatasetList, DatasetPreview, DatasetQuery, DatasetRead
from app.services import dataset as dataset_service

router = APIRouter(prefix="/datasets", tags=["datasets"])


class PresignRequest(BaseModel):
    filename: str
    file_size: int = 0
    name: str | None = None


class PresignResponse(BaseModel):
    dataset_id: str
    upload_url: str
    s3_key: str
    expires_in: int
    content_type: str


class ConfirmRequest(BaseModel):
    dataset_id: UUID


class QueryRequest(BaseModel):
    sql: str
    limit: int = 2000

    @field_validator("sql")
    @classmethod
    def sql_not_empty(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError("sql must not be empty")
        return v.strip()

    @field_validator("limit")
    @classmethod
    def limit_cap(cls, v: int) -> int:
        return max(1, min(v, 5000))


@router.post(
    "/presign",
    response_model=PresignResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Get a presigned S3 URL for direct browser upload",
)
async def presign_upload(
    body: PresignRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> PresignResponse:
    result = await dataset_service.presign_upload(
        db=db,
        user_id=current_user.id,
        filename=body.filename,
        file_size=body.file_size,
        name=body.name,
    )
    return PresignResponse(**result)


@router.post(
    "/confirm",
    response_model=DatasetRead,
    summary="Confirm S3 upload complete and enqueue processing",
)
async def confirm_upload(
    body: ConfirmRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> DatasetRead:
    return await dataset_service.confirm_upload(
        db=db,
        user_id=current_user.id,
        dataset_id=body.dataset_id,
    )


@router.get("/", response_model=DatasetList)
async def list_datasets(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> DatasetList:
    return await dataset_service.list_datasets(
        db=db, user_id=current_user.id, skip=skip, limit=limit,
    )


@router.get("/{dataset_id}", response_model=DatasetRead)
async def get_dataset(
    dataset_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> DatasetRead:
    return await dataset_service.get_dataset(
        db=db, user_id=current_user.id, dataset_id=dataset_id,
    )


@router.get("/{dataset_id}/preview", response_model=DatasetPreview)
async def preview_dataset(
    dataset_id: UUID,
    limit: int = Query(100, ge=1, le=1000),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> DatasetPreview:
    raw = await dataset_service.get_dataset_preview(
        db=db, user_id=current_user.id, dataset_id=dataset_id, limit=limit,
    )
    return DatasetPreview(**raw)


@router.post(
    "/{dataset_id}/query",
    response_model=DatasetQuery,
    summary="Run a SELECT query against the dataset's DuckDB table",
)
async def query_dataset(
    dataset_id: UUID,
    body: QueryRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> DatasetQuery:
    raw = await dataset_service.query_dataset(
        db=db,
        user_id=current_user.id,
        dataset_id=dataset_id,
        sql=body.sql,
        limit=body.limit,
    )
    return DatasetQuery(**raw)


@router.delete("/{dataset_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_dataset(
    dataset_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> None:
    await dataset_service.delete_dataset(
        db=db, user_id=current_user.id, dataset_id=dataset_id,
    )