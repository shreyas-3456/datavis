from datetime import datetime
from pydantic import BaseModel
from uuid import UUID
from typing import Any, Optional
import uuid


class SeedDatasetItem(BaseModel):
    id: uuid.UUID
    seed_key: str
    name: str
    description: str | None = None
    source: str | None = None
    source_url: str | None = None
    domain: str | None = None
    duckdb_table: str
    row_count: int | None = None
    column_count: int | None = None
    file_size_mb: float | None = None
    schema: list[dict[str, Any]] | None = None
    stats: dict[str, Any] | None = None
    created_at: datetime | None = None

    model_config = {"from_attributes": True}


class LinkResponse(BaseModel):
    dataset_id: UUID
    duckdb_table: str
    name: str
    row_count: int | None
    column_count: int | None