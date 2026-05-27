"""
Dataset parsing service.

Reads uploaded files with Pandas, infers schema via PyArrow,
computes per-column statistics, and detects outliers / missing values.
"""
from __future__ import annotations

import math
from pathlib import Path
from typing import Any

import numpy as np
import pandas as pd
import pyarrow as pa
import pyarrow.compute as pc

from app.core.logger import logger
from app.schemas.dataset import ColumnSchema




# ── Type mapping ──────────────────────────────────────────────────────────────

_ARROW_TO_DTYPE: dict[str, str] = {
    "int8": "integer", "int16": "integer", "int32": "integer", "int64": "integer",
    "uint8": "integer", "uint16": "integer", "uint32": "integer", "uint64": "integer",
    "float16": "float", "float32": "float", "float64": "float",
    "double": "float",
    "bool": "boolean",
    "string": "string", "large_string": "string", "utf8": "string",
    "date32": "datetime", "date64": "datetime",
    "timestamp": "datetime",
}


def _arrow_dtype(arrow_type: pa.DataType) -> str:
    base = str(arrow_type).split("[")[0]  # strip timezone / unit
    return _ARROW_TO_DTYPE.get(base, "string")


# ── Loader ────────────────────────────────────────────────────────────────────

def load_dataframe(file_path: str, file_type: str) -> pd.DataFrame:
    path = Path(file_path)
    if file_type == "csv":
        try:
            return pd.read_csv(path, low_memory=False)
        except Exception:
            return pd.read_csv(path, engine="python", on_bad_lines="skip")
    elif file_type == "excel":
        return pd.read_excel(path)
    elif file_type == "json":
        try:
            return pd.read_json(path)
        except ValueError:
            return pd.read_json(path, lines=True)
    else:
        raise ValueError(f"Unsupported file type: {file_type}")


# ── Schema + stats ────────────────────────────────────────────────────────────

def _safe_scalar(val: Any) -> Any:
    """Convert numpy scalars / NaN to JSON-safe Python types."""
    if val is None:
        return None
    if isinstance(val, float) and math.isnan(val):
        return None
    if isinstance(val, (np.integer,)):
        return int(val)
    if isinstance(val, (np.floating,)):
        return float(val)
    if isinstance(val, (np.bool_,)):
        return bool(val)
    return val


def _column_schema(series: pd.Series, arrow_field: pa.Field) -> ColumnSchema:
    dtype = _arrow_dtype(arrow_field.type)
    total = len(series)
    missing_count = int(series.isna().sum())
    missing_pct = round(missing_count / total * 100, 2) if total else 0.0
    nullable = missing_count > 0

    # Sample non-null values (up to 5)
    sample = series.dropna().head(5).tolist()
    sample = [_safe_scalar(v) for v in sample]

    schema = ColumnSchema(
        name=series.name,
        dtype=dtype,
        nullable=nullable,
        missing_count=missing_count,
        missing_pct=missing_pct,
        sample_values=sample,
    )

    if dtype in ("integer", "float"):
        numeric = pd.to_numeric(series, errors="coerce")
        schema.min = _safe_scalar(numeric.min())
        schema.max = _safe_scalar(numeric.max())
        schema.mean = _safe_scalar(round(float(numeric.mean()), 4) if not numeric.empty else None)
        schema.std = _safe_scalar(round(float(numeric.std()), 4) if not numeric.empty else None)

    if dtype == "string":
        schema.unique_count = int(series.nunique())
        top = series.value_counts().head(5).index.tolist()
        schema.top_values = [_safe_scalar(v) for v in top]

    return schema


def _detect_outliers(df: pd.DataFrame, schema: list[ColumnSchema]) -> dict[str, Any]:
    """IQR-based outlier detection for numeric columns."""
    outlier_info: dict[str, Any] = {}
    for col_schema in schema:
        if col_schema.dtype not in ("integer", "float"):
            continue
        series = pd.to_numeric(df[col_schema.name], errors="coerce").dropna()
        if series.empty:
            continue
        q1 = series.quantile(0.25)
        q3 = series.quantile(0.75)
        iqr = q3 - q1
        lower, upper = q1 - 1.5 * iqr, q3 + 1.5 * iqr
        outliers = series[(series < lower) | (series > upper)]
        if not outliers.empty:
            outlier_info[col_schema.name] = {
                "count": int(len(outliers)),
                "pct": round(len(outliers) / len(series) * 100, 2),
                "lower_fence": _safe_scalar(lower),
                "upper_fence": _safe_scalar(upper),
            }
    return outlier_info


# ── Public API ────────────────────────────────────────────────────────────────

class ParseResult:
     def __init__(
        self,
        df: pd.DataFrame,        
        row_count: int,
        column_count: int,
        schema: list[ColumnSchema],
        stats: dict[str, Any],
    ):
        self.df = df            
        self.row_count = row_count
        self.column_count = column_count
        self.schema = schema
        self.stats = stats


def parse_file(file_path: str, file_type: str) -> ParseResult:
    logger.info("Parsing file", extra={"path": file_path, "type": file_type})

    df = load_dataframe(file_path, file_type)

    # Convert to Arrow to get solid type inference
    table = pa.Table.from_pandas(df, preserve_index=False)

    column_schemas: list[ColumnSchema] = []
    for i, col_name in enumerate(table.column_names):
        series = df[col_name]
        field = table.schema.field(col_name)
        col_schema = _column_schema(series, field)
        column_schemas.append(col_schema)

    # Global stats
    total_cells = len(df) * len(df.columns)
    total_missing = int(df.isna().sum().sum())
    outliers = _detect_outliers(df, column_schemas)

    stats = {
        "total_missing": total_missing,
        "missing_pct": round(total_missing / total_cells * 100, 2) if total_cells else 0.0,
        "outlier_columns": outliers,
        "duplicate_rows": int(df.duplicated().sum()),
    }

    logger.info(
        "Parse complete",
        extra={
            "rows": len(df),
            "columns": len(df.columns),
            "missing_pct": stats["missing_pct"],
        },
    )

    return ParseResult(
         df=df, 
        row_count=len(df),
        column_count=len(df.columns),
        schema=column_schemas,
        stats=stats,
    )


def preview_file(file_path: str, file_type: str, limit: int = 100) -> dict[str, Any]:
    """Return first `limit` rows as JSON-serialisable dicts."""
    df = load_dataframe(file_path, file_type)
    preview_df = df.head(limit)

    # Replace NaN with None for JSON safety
    preview_df = preview_df.where(pd.notnull(preview_df), None)

    return {
        "columns": list(df.columns),
        "rows": preview_df.to_dict(orient="records"),
        "total_rows": len(df),
        "preview_rows": len(preview_df),
    }