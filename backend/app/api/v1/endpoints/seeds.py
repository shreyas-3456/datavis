import uuid
from typing import Optional

from fastapi import Depends, APIRouter, HTTPException, Query
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession
from starlette import status

from app.core.users import get_current_user
from app.db.session import get_db
from app.models.dataset import Dataset, DatasetStatus
from app.models.user import User
from app.schemas.seed import LinkResponse, SeedDatasetItem

router = APIRouter()


@router.get("/", response_model=list[SeedDatasetItem])
async def list_seeds(
    domain: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = "SELECT * FROM seed_datasets WHERE 1=1"
    params: dict = {}

    if domain:
        query += " AND domain = :domain"
        params["domain"] = domain

    if search:
        query += " AND (name ILIKE :search OR description ILIKE :search)"
        params["search"] = f"%{search}%"

    query += " ORDER BY name ASC"

    result = await db.execute(text(query), params)
    rows = result.mappings().all()
    return [dict(r) for r in rows]

@router.post("/{seed_key}/link", response_model=LinkResponse, status_code=status.HTTP_201_CREATED)
async def link_seed(
    seed_key: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        text("SELECT * FROM seed_datasets WHERE seed_key = :k FOR SHARE"),
        {"k": seed_key},
    )
    seed = result.mappings().one_or_none()
    if not seed:
        raise HTTPException(status_code=404, detail=f"Seed dataset '{seed_key}' not found.")

    existing = await db.execute(
        text("""
            SELECT id FROM datasets
            WHERE user_id = :uid AND duckdb_table = :table
            FOR UPDATE
        """),
        {"uid": current_user.id, "table": seed["duckdb_table"]},
    )
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="You have already added this dataset.",
        )

    dataset = Dataset(
        id=uuid.uuid4(),
        user_id=current_user.id,
        name=seed["name"],
        original_filename=f"{seed_key}.csv",
        file_path="",
        file_size=int((seed["file_size_mb"] or 0) * 1_048_576),
        file_type="csv",
        status=DatasetStatus.ready,
        row_count=seed["row_count"],
        column_count=seed["column_count"],
        schema=seed["schema"],
        stats=seed["stats"],
        duckdb_table=seed["duckdb_table"],
    )
    db.add(dataset)
    await db.flush()          # write to DB, get the generated fields back
    await db.refresh(dataset) # populate id, created_at, etc.
    # get_db commits on return

    return LinkResponse(
        dataset_id=dataset.id,
        duckdb_table=dataset.duckdb_table,
        name=dataset.name,
        row_count=dataset.row_count,
        column_count=dataset.column_count,
    )