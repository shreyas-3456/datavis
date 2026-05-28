"""
DataVis Platform — One-Time Global Dataset Seeder
==================================================
Run ONCE by an admin/developer. Downloads 10 real-world datasets,
ingests each into DuckDB as a permanent shared table, and records
catalogue metadata in Postgres `seed_datasets` table.

No user association. Users link to these via the /api/v1/seeds endpoint.

Usage:
    cd /home/shreyas/datavis-platform/backend
    source venv/bin/activate
    python seed_datasets.py
"""

from __future__ import annotations

import asyncio
import io
import os
import sys
import uuid
import zipfile
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
os.chdir(Path(__file__).parent)

import requests
import pandas as pd

# ── Manifest ──────────────────────────────────────────────────────────────────

DATASETS = [
    {
        "seed_key": "bank_marketing_portugal",
        "name": "UCI Bank Marketing — Portugal Telemarketing",
        "description": (
            "41,188 phone call records from a Portuguese bank's term deposit "
            "campaign (May 2008–Nov 2010). 20 features including client demographics, "
            "last contact info, and macro-economic context indices."
        ),
        "source": "UCI Machine Learning Repository",
        "source_url": "https://archive.ics.uci.edu/ml/datasets/bank+marketing",
        "domain": "finance",
        "url": "https://archive.ics.uci.edu/ml/machine-learning-databases/00222/bank-additional.zip",
        "zip_member": "bank-additional/bank-additional-full.csv",
        "sep": ";",
    },
    {
        "seed_key": "air_quality_milan",
        "name": "UCI Air Quality — Milan, Italy 2004–2005",
        "description": (
            "9,358 hourly sensor readings from 5 metal-oxide chemical sensors "
            "at road level in an Italian city. Measures CO, NOx, NO2, Benzene, "
            "NMHC, temperature, and humidity. Contains real sensor drift."
        ),
        "source": "UCI Machine Learning Repository",
        "source_url": "https://archive.ics.uci.edu/ml/datasets/Air+Quality",
        "domain": "environment",
        "url": "https://archive.ics.uci.edu/ml/machine-learning-databases/00360/AirQualityUCI.zip",
        "zip_member": "AirQualityUCI.csv",
        "sep": ";",
        "decimal": ",",
    },
    {
        "seed_key": "adult_census_income",
        "name": "UCI Adult Census Income — USA 1994",
        "description": (
            "48,842 records from the 1994 US Census Bureau. Predicts whether "
            "income exceeds $50K/yr. 14 features: age, workclass, education, "
            "occupation, race, sex, capital gain/loss, hours-per-week, country."
        ),
        "source": "UCI Machine Learning Repository",
        "source_url": "https://archive.ics.uci.edu/ml/datasets/adult",
        "domain": "social",
        "url": "https://archive.ics.uci.edu/ml/machine-learning-databases/adult/adult.data",
        "sep": ", ",
        "header": [
            "age", "workclass", "fnlwgt", "education", "education_num",
            "marital_status", "occupation", "relationship", "race", "sex",
            "capital_gain", "capital_loss", "hours_per_week", "native_country", "income",
        ],
    },
    {
        "seed_key": "beijing_pm25",
        "name": "UCI Beijing PM2.5 Air Pollution — China 2010–2014",
        "description": (
            "43,824 hourly records of fine particulate matter (PM2.5) at the "
            "US Embassy in Beijing alongside dew point, temperature, pressure, "
            "wind direction/speed, snow and rain hours."
        ),
        "source": "UCI Machine Learning Repository",
        "source_url": "https://archive.ics.uci.edu/ml/datasets/Beijing+PM2.5+Data",
        "domain": "environment",
        "url": "https://archive.ics.uci.edu/ml/machine-learning-databases/00381/PRSA_data_2010.1.1-2014.12.31.csv",
        "sep": ",",
    },
    {
        "seed_key": "wine_quality_red",
        "name": "UCI Wine Quality — Vinho Verde Red, Portugal",
        "description": (
            "1,599 red Vinho Verde wine samples from northern Portugal. "
            "11 physicochemical inputs (acidity, pH, sulphates, alcohol) "
            "with quality score 0–10 from blind tastings."
        ),
        "source": "UCI Machine Learning Repository",
        "source_url": "https://archive.ics.uci.edu/ml/datasets/wine+quality",
        "domain": "food",
        "url": "https://archive.ics.uci.edu/ml/machine-learning-databases/wine-quality/winequality-red.csv",
        "sep": ";",
    },
    {
        "seed_key": "wine_quality_white",
        "name": "UCI Wine Quality — Vinho Verde White, Portugal",
        "description": (
            "4,898 white Vinho Verde wine samples from northern Portugal. "
            "Same 11 physicochemical features as the red dataset. "
            "Useful for cross-variety comparison."
        ),
        "source": "UCI Machine Learning Repository",
        "source_url": "https://archive.ics.uci.edu/ml/datasets/wine+quality",
        "domain": "food",
        "url": "https://archive.ics.uci.edu/ml/machine-learning-databases/wine-quality/winequality-white.csv",
        "sep": ";",
    },
    {
        "seed_key": "student_performance_maths",
        "name": "UCI Student Performance — Portugal Maths",
        "description": (
            "395 students from two Portuguese secondary schools. 33 attributes: "
            "demographics, social factors, study time, absences, alcohol "
            "consumption, parental education, and three period grades (G1, G2, G3)."
        ),
        "source": "UCI Machine Learning Repository",
        "source_url": "https://archive.ics.uci.edu/ml/datasets/student+performance",
        "domain": "education",
        "url": "https://archive.ics.uci.edu/ml/machine-learning-databases/00320/student.zip",
        "zip_member": "student-mat.csv",
        "sep": ";",
    },
    {
        "seed_key": "student_performance_portuguese",
        "name": "UCI Student Performance — Portugal Portuguese Language",
        "description": (
            "649 students from two Portuguese secondary schools. Same 33 "
            "attributes as the Maths dataset but for the Portuguese language "
            "course. Larger sample, different grade distribution."
        ),
        "source": "UCI Machine Learning Repository",
        "source_url": "https://archive.ics.uci.edu/ml/datasets/student+performance",
        "domain": "education",
        "url": "https://archive.ics.uci.edu/ml/machine-learning-databases/00320/student.zip",
        "zip_member": "student-por.csv",
        "sep": ";",
    },
    {
        "seed_key": "usgs_earthquakes",
        "name": "USGS Global Earthquakes M5.5+ (2010–2023)",
        "description": (
            "All significant seismic events worldwide from the USGS catalog. "
            "Columns: time, latitude, longitude, depth (km), magnitude, "
            "magnitude type, place description, and event type."
        ),
        "source": "USGS Earthquake Hazards Program",
        "source_url": "https://earthquake.usgs.gov/fdsnws/event/1/",
        "domain": "geoscience",
        "url": (
            "https://earthquake.usgs.gov/fdsnws/event/1/query"
            "?format=csv&starttime=2010-01-01&endtime=2023-12-31&minmagnitude=5.5"
        ),
        "sep": ",",
    },
    {
        "seed_key": "heart_disease_cleveland",
        "name": "UCI Heart Disease — Cleveland Clinic Foundation",
        "description": (
            "303 patient records from the Cleveland Clinic. 13 clinical "
            "attributes: age, sex, chest pain type, resting BP, cholesterol, "
            "fasting blood sugar, ECG results, max heart rate, and more. "
            "Target: presence of heart disease (0–4)."
        ),
        "source": "UCI Machine Learning Repository",
        "source_url": "https://archive.ics.uci.edu/ml/datasets/heart+disease",
        "domain": "healthcare",
        "url": "https://archive.ics.uci.edu/ml/machine-learning-databases/heart-disease/processed.cleveland.data",
        "sep": ",",
        "header": [
            "age", "sex", "cp", "trestbps", "chol", "fbs", "restecg",
            "thalach", "exang", "oldpeak", "slope", "ca", "thal", "target",
        ],
    },
]


# ── Download ──────────────────────────────────────────────────────────────────

def fetch_df(ds: dict) -> pd.DataFrame:
    print(f"    ↓  {ds['url'][:90]}")
    r = requests.get(ds["url"], timeout=120)
    r.raise_for_status()

    sep     = ds.get("sep", ",")
    header  = ds.get("header")
    decimal = ds.get("decimal", ".")

    if "zip_member" in ds:
        with zipfile.ZipFile(io.BytesIO(r.content)) as z:
            with z.open(ds["zip_member"]) as f:
                raw = f.read()
        return pd.read_csv(
            io.BytesIO(raw), sep=sep, decimal=decimal,
            names=header, encoding="latin-1", on_bad_lines="skip",
        )

    return pd.read_csv(
        io.StringIO(r.text), sep=sep, decimal=decimal,
        names=header, encoding="latin-1", on_bad_lines="skip",
    )


def clean_df(df: pd.DataFrame) -> pd.DataFrame:
    df = df.dropna(how="all").dropna(axis=1, how="all")
    # Drop unnamed trailing columns from semicolon-terminated CSVs
    df = df.loc[:, ~df.columns.str.match(r"^Unnamed")]
    return df.reset_index(drop=True)


# ── Main ──────────────────────────────────────────────────────────────────────

async def seed() -> None:
    from sqlalchemy import select, text
    from app.db.session import AsyncSessionLocal
    from app.db.duckdb import get_write_conn
    from app.core.config import settings
    from app.services.duckdb_ingest import ingest_dataframe
    from app.services.parser import _column_schema, _detect_outliers
    import pyarrow as pa

    # Ensure seed_datasets catalogue table exists in Postgres
    async with AsyncSessionLocal() as db:
        await db.execute(text("""
            CREATE TABLE IF NOT EXISTS seed_datasets (
                id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                seed_key      VARCHAR(128) UNIQUE NOT NULL,
                name          TEXT NOT NULL,
                description   TEXT,
                source        TEXT,
                source_url    TEXT,
                domain        VARCHAR(64),
                duckdb_table  VARCHAR(128) NOT NULL,
                row_count     INTEGER,
                column_count  INTEGER,
                schema        JSONB,
                stats         JSONB,
                file_size_mb  NUMERIC(8,2),
                created_at    TIMESTAMP DEFAULT NOW()
            )
        """))
        await db.commit()

    get_write_conn().close()  # warm DuckDB connection

    print(f"\n DataVis — Global Dataset Seeder")
    print(f" DuckDB : {Path(settings.DUCKDB_PATH).resolve()}\n")

    async with AsyncSessionLocal() as db:
        for ds in DATASETS:
            print(f"{'─'*64}")
            print(f"  {ds['name']}")

            # Skip if already seeded
            existing = await db.execute(
                text("SELECT id FROM seed_datasets WHERE seed_key = :k"),
                {"k": ds["seed_key"]},
            )
            if existing.scalar_one_or_none():
                print(f"    ↷  Already seeded — skipping")
                continue

            try:
                # 1. Download
                df = fetch_df(ds)
                df = clean_df(df)
                mb = df.memory_usage(deep=True).sum() / 1_048_576
                print(f"    rows={len(df):,}  cols={len(df.columns)}  ~{mb:.1f} MB")

                # 2. Ingest into DuckDB — table name uses seed_key not a uuid
                #    so it's human-readable and stable
                duckdb_table = f"seed_{ds['seed_key']}"
                from app.db.duckdb import _lock, get_write_conn as _duck
                import duckdb
                with _lock:
                    conn = _duck()
                    try:
                        conn.execute(f'DROP TABLE IF EXISTS "{duckdb_table}"')
                        conn.execute(f'CREATE TABLE "{duckdb_table}" AS SELECT * FROM df')
                        row_count = conn.execute(
                            f'SELECT COUNT(*) FROM "{duckdb_table}"'
                        ).fetchone()[0]
                    finally:
                        conn.close()
                print(f"    ✓ DuckDB  → {duckdb_table}  ({row_count:,} rows confirmed)")

                # 3. Build schema + stats (same as parser.py)
                table = pa.Table.from_pandas(df, preserve_index=False)
                column_schemas = [
                    _column_schema(df[col], table.schema.field(col))
                    for col in table.column_names
                ]
                total_cells   = len(df) * len(df.columns)
                total_missing = int(df.isna().sum().sum())
                outliers      = _detect_outliers(df, column_schemas)
                stats = {
                    "total_missing":   total_missing,
                    "missing_pct":     round(total_missing / total_cells * 100, 2) if total_cells else 0.0,
                    "outlier_columns": outliers,
                    "duplicate_rows":  int(df.duplicated().sum()),
                }

                # 4. Write catalogue row to Postgres
                import json
                await db.execute(text("""
                    INSERT INTO seed_datasets
                        (seed_key, name, description, source, source_url,
                         domain, duckdb_table, row_count, column_count,
                         schema, stats, file_size_mb)
                    VALUES
                        (:seed_key, :name, :description, :source, :source_url,
                         :domain, :duckdb_table, :row_count, :column_count,
                         :schema, :stats, :file_size_mb)
                """), {
                    "seed_key":     ds["seed_key"],
                    "name":         ds["name"],
                    "description":  ds["description"],
                    "source":       ds["source"],
                    "source_url":   ds["source_url"],
                    "domain":       ds["domain"],
                    "duckdb_table": duckdb_table,
                    "row_count":    row_count,
                    "column_count": len(df.columns),
                    "schema":       json.dumps([c.model_dump() for c in column_schemas]),
                    "stats":        json.dumps(stats),
                    "file_size_mb": round(mb, 2),
                })
                await db.commit()
                print(f"    ✓ Postgres → seed_datasets catalogue updated")

            except Exception as exc:
                import traceback
                print(f"    ✗ FAILED: {exc}")
                traceback.print_exc()
                await db.rollback()

    print(f"\n{'─'*64}")
    print("Seeding complete. Run this script again safely — already-seeded")
    print("datasets are skipped via seed_key uniqueness check.")


if __name__ == "__main__":
    asyncio.run(seed())