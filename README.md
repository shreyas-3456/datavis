# Project README

## System Design & Data Flow

This document describes the architecture of the data ingestion, storage, and analytics pipeline.

---

## Architecture Overview

```
┌────────────────────────────────────────────────────────────────────────┐
│                        SYSTEM DESIGN & DATA FLOW                       │
└────────────────────────────────────────────────────────────────────────┘
              ┌──────────────────────────────────────┐
              │             Web Browser              │
              │     (Next.js / React / D3.js UI)     │
              └──────────────┬───────────────────────┘
                             │
                             │ HTTP API Requests
                             ▼
              ┌──────────────────────────────────────┐
              │           Nginx → FastAPI            │  (API Gateway & Web Host)
              │       (app.api.v1.api_router)        │
              └──────┬────────────────────────┬──────┘
                     │                        │
        1. Upload &  │                        │ 3. Run Analytics
        Metadata Save│                        │    Queries (SQL)
                     ▼                        ▼
      ┌─────────────────────────┐  ┌─────────────────────────┐
      │     PostgreSQL DB       │  │      DuckDB Engine      │ (Vectorized Columnar
      │  (Relational Metadata)  │  │ (analytics.duckdb file) │  Analytics Database)
      └─────────────────────────┘  └────────────▲────────────┘
                     │                          │
                     │ 2. Enqueue task          │ 5. Writes permanent
                     ▼                          │    analytical table
      ┌─────────────────────────┐               │    ("ds_<dataset_id>")
      │     Redis Message       │               │
      │         Broker          │               │
      └──────────────┬──────────┘               │
                     │                          │
                     │ Pull job                 │
                     ▼                          │
      ┌─────────────────────────┐               │
      │      Celery Worker      │───────────────┘
      │   (Background Parser)   │ 4. Read & process
      └──────────────┬──────────┘    (Pandas / S3)
                     │
                     │ Read / Write Files
                     ▼
      ┌─────────────────────────┐
      │     AWS S3 Storage      │ (Object storage for original
      │   (File Upload Bucket)  │  CSV / Excel / JSON files)
      └─────────────────────────┘

              ┌ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┐
              ⤴  Direct S3 Upload (presigned URL)
              │  Browser → S3 (bypasses Nginx  │
                 and FastAPI entirely)
              └ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┘
```

---

## Key Flows

### 1. Decoupled Ingestion

File uploads are fully decoupled from the API server to keep the upload path fast and scalable.

1. The browser requests a **presigned S3 URL** via `Nginx → FastAPI`.
2. The browser uploads the file **directly to S3**, completely bypassing Nginx and FastAPI — no file data ever passes through the application servers.
3. FastAPI saves upload metadata to **PostgreSQL** and enqueues a processing job in **Redis**.
4. A **Celery worker** picks up the job, reads the raw file from S3, and parses it using Pandas.
5. The worker writes the processed data as a permanent analytical table (`ds_<dataset_id>`) into **DuckDB**, then goes idle.

### 2. Hybrid Data Query

Queries are routed to the appropriate store based on their nature:

- **Metadata queries** (file info, user records, dataset registry) → **PostgreSQL** via FastAPI.
- **Analytical queries** (aggregations, filters, column scans) → **DuckDB** directly, achieving sub-12ms vectorized query speeds over columnar storage.

---

## Component Reference

| Component | Role |
|---|---|
| **Next.js / React / D3.js** | Frontend UI and data visualizations |
| **Nginx** | Reverse proxy and TLS termination |
| **FastAPI** | REST API gateway (`app.api.v1.api_router`) |
| **PostgreSQL** | Relational store for metadata and user records |
| **DuckDB** (`analytics.duckdb`) | Columnar OLAP engine for fast analytical queries |
| **Redis** | Message broker for the Celery task queue |
| **Celery Worker** | Background job processor (file parsing via Pandas) |
| **AWS S3** | Object storage for raw uploaded files (CSV, Excel, JSON) |

---

## Design Decisions

**Direct-to-S3 upload via presigned URLs** — Keeps large file payloads off the application servers entirely, improving throughput and reducing API server memory pressure.

**Redis + Celery for async processing** — Decouples upload acknowledgement from the (potentially slow) parse-and-ingest step. The API returns immediately; the worker catches up asynchronously.

**DuckDB for analytics** — Vectorized columnar execution delivers sub-12ms query latency on analytical workloads without the overhead of a full OLAP cluster. Each dataset is stored as a dedicated table (`ds_<dataset_id>`) inside a single `analytics.duckdb` file.

**Hybrid PostgreSQL + DuckDB** — PostgreSQL handles transactional metadata with full ACID guarantees; DuckDB handles analytical reads. This separates concerns cleanly and lets each engine do what it does best.
