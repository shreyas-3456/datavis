from __future__ import annotations
from datetime import datetime
from typing import Any, Optional
from uuid import UUID

from pydantic import BaseModel, Field

from app.models.dataset import DatasetStatus


# ── Column schema (stored in Dataset.schema JSON) ────────────────────────────

class ColumnSchema(BaseModel):
    name: str
    dtype: str                          # "integer" | "float" | "string" | "boolean" | "datetime"
    nullable: bool
    missing_count: int = 0
    missing_pct: float = 0.0
    sample_values: list[Any] = Field(default_factory=list)
    # Numeric extras
    min: Optional[float] = None
    max: Optional[float] = None
    mean: Optional[float] = None
    std: Optional[float] = None
    # Categorical extras
    unique_count: Optional[int] = None
    top_values: Optional[list[Any]] = None


# ── Dataset response shapes ───────────────────────────────────────────────────

class DatasetBase(BaseModel):
    name: str
    original_filename: str
    file_type: str
    file_size: Optional[int] = None


class DatasetCreate(DatasetBase):
    pass


class DatasetRead(DatasetBase):
    id: UUID
    user_id: UUID
    status: DatasetStatus
    error_message: Optional[str] = None
    row_count: Optional[int] = None
    column_count: Optional[int] = None
    column_schema: Optional[list[ColumnSchema]] = Field(None, alias="schema")
    stats: Optional[dict[str, Any]] = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class DatasetList(BaseModel):
    items: list[DatasetRead]
    total: int


class DatasetPreviewRow(BaseModel):
    """A single row returned in the preview endpoint."""
    data: dict[str, Any]


class DatasetPreview(BaseModel):
    columns: list[str]
    rows: list[dict[str, Any]]
    total_rows: int
    preview_rows: int