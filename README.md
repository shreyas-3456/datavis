# DataVis Platform 📊✨

DataVis Platform is a high-performance, premium web application built for seamless data exploration, parsing, analytics, and interactive visualization. Designed with a modern decoupled architecture, it leverages **FastAPI** on the backend, **Next.js (React/TypeScript)** on the frontend, and a specialized double-storage engine pairing **PostgreSQL** (for relational metadata) with **DuckDB** (for ultra-fast, vectorized analytics queries on massive datasets).

---

## 🏗️ System Design & Architecture

The system is designed to handle large file uploads asynchronously, parse them in a robust background process, and immediately expose them to an interactive visualization engine powered by SQL.

### Architecture Diagram

```text
┌────────────────────────────────────────────────────────────────────────┐
│                        SYSTEM DESIGN & DATA FLOW                       │
└────────────────────────────────────────────────────────────────────────┘

              ┌──────────────────────────────────────┐
              │             Web Browser              │
              │  (Next.js / React / D3.js UI)     │
              └──────────────────┬───────────────────┘
                                 │
                                 │ HTTP API Requests
                                 ▼
              ┌──────────────────────────────────────┐
              │           FastAPI Server             │ (API Gateway & Web Host)
              │       (app.api.v1.api_router)        │
              └──────┬────────────────────────┬──────┘
                     │                        │
        1. Upload &  │                        │ 3. Run Analytics
        Metadata Save│                        │    Queries (SQL)
                     ▼                        ▼
      ┌─────────────────────────┐  ┌─────────────────────────┐
      │     PostgreSQL DB       │  │      DuckDB Engine      │ (Vectorized Columnar
      │  (Relational Metadata)  │  │ (analytics.duckdb File) │  Analytics Database)
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
      │   (File Upload Bucket)  │  CSV/Excel/JSON files)
      └─────────────────────────┘
```

### Architectural Components

1. **Frontend Tier (Next.js & React)**:
   - Modern, highly responsive user interface featuring drag-and-drop dataset upload zones (`DatasetDropzone`), dataset preview tools (`DatasetPreviewDrawer`), and a robust visualization sandbox (`VisualizationBuilder`).
   - Performs state management and triggers backend API requests using modern asynchronous hooks.

2. **Web / API Gateway Tier (FastAPI)**:
   - Single entrypoint exposing secure endpoints for User Authentication, Dataset Metadata Operations, and analytical query execution.
   - Employs an async context lifespan to boot up essential database connectors and orchestrate local worker processes.

3. **Message Broker & Task Queue (Redis + Celery)**:
   - Redis manages the job queues, acting as a broker between FastAPI and Celery.
   - Celery asynchronously consumes heavy file parsing tasks, preventing HTTP request blocking.

4. **Double Storage Layer**:
   - **PostgreSQL**: Stores persistent operational metadata (Users, Roles, Dataset status, Metadata, schemas, stats, and configurations).
   - **AWS S3 Bucket**: Stores the raw uploaded files securely with support for presigned URLs.
   - **DuckDB**: Embedded in-process columnar database. Once Celery parses a file into a Pandas DataFrame, it registers the frame directly into DuckDB as a permanent, index-free table. Subsequent dynamic chart queries bypass Postgres completely and run directly against DuckDB using extremely fast vectorized execution.

---

## 🔄 End-to-End Data Pipeline

```
  ┌──────────────┐      ┌───────────────┐      ┌──────────────┐      ┌──────────────┐
  │ 1. Upload    │ ───> │ 2. Enqueue    │ ───> │ 3. Parse     │ ───> │ 4. Ingest    │
  │ File to S3   │      │ Celery Task   │      │ CSV/Excel    │      │ to DuckDB    │
  └──────────────┘      └───────────────┘      └──────────────┘      └──────────────┘
                                                                            │
  ┌──────────────┐      ┌───────────────┐      ┌──────────────┐             │
  │ 7. Render UI │ <─── │ 6. Execute    │ <─── │ 5. Dynamic   │ <───────────┘
  │ Charts       │      │ DuckDB Query  │      │ API Request  │
  └──────────────┘      └───────────────┘      └──────────────┘
```

1. **Upload & Stage**: The user drops a CSV or Excel sheet into the dropzone. The file is uploaded to the S3 bucket, and a dataset entry is created in PostgreSQL with `status = "pending"`.
2. **Task Delegation**: FastAPI triggers the background celery task `process_dataset(dataset_id)` and returns a success response to the client immediately.
3. **Parse & Analyze**: The Celery worker fetches the file from S3, loads it with Pandas, detects the schema types, calculates detailed metrics (row count, column counts, missing values, statistics), and writes the dataframe into DuckDB as a permanent table indexed by `ds_<dataset_uuid>`.
4. **Ready State**: The worker updates the status in Postgres to `"ready"`.
5. **Interactive Exploration**: The frontend receives the `"ready"` status and allows the user to explore the data. When the user filters or changes aggregation axes, the client sends a query representation to FastAPI.
6. **Vectorized Querying**: FastAPI maps the request, sanitizes the query, runs SQL directly on the local DuckDB database, and responds in milliseconds.

---

## 🛠️ Tech Stack

### Backend
* **Language:** Python 3.10+
* **Framework:** FastAPI
* **Background Processing:** Celery + Redis
* **Databases:** PostgreSQL (via SQLAlchemy asyncpg), DuckDB (Vectorized OLAP)
* **Storage:** Boto3 (AWS S3)
* **Migrations:** Alembic

### Frontend
* **Framework:** Next.js (App Router), React 18, TypeScript
* **Styling:** TailwindCSS
* **State Management:** Zustand
* **Visualizations:** D3.js / Recharts

---

## 📁 Repository Directory Structure

```text
datavis-platform/
├── README.md               # Root comprehensive documentation & architectural guide
├── backend/                # FastAPI and Celery backend application
│   ├── alembic/            # Database migration environment
│   ├── app/                # Main Python application package
│   │   ├── api/            # API endpoints (auth, dataset, users)
│   │   ├── core/           # Config settings, logging, middleware
│   │   ├── db/             # DB sessions (PostgreSQL, DuckDB connections)
│   │   ├── models/         # SQLAlchemy models (User, Dataset)
│   │   ├── schemas/        # Pydantic schemas
│   │   ├── services/       # Core service files (ingestion, parsing, auth)
│   │   ├── worker/         # Celery application initialization and tasks
│   │   └── main.py         # App entrypoint and lifecycle events
│   ├── docker-compose.yml  # Docker Compose config for local services (Postgres, Redis)
│   └── requirements.txt    # Python package dependencies
│
└── frontend/               # Next.js and Tailwind CSS frontend application
    ├── app/                # Next.js App Router structure & page endpoints
    ├── components/         # Reusable React components
    │   ├── auth/           # Login, Register, Profile components
    │   ├── dashboard/      # Main dashboard home & Visualization Builder
    │   ├── datasets/       # Upload dropzones, preview drawers, seed datasets
    │   └── ui/             # Reusable primitive UI buttons, inputs, etc.
    ├── lib/                # Utility helpers (API clients, formatting tools)
    ├── store/              # Zustand global state hooks
    └── package.json        # Frontend NPM script definitions & dependencies
```

---

## 🚀 Getting Started

### Prerequisites
Make sure you have the following installed on your host system:
* **Docker** & **Docker Compose**
* **Python 3.10+** (with `pip` and virtual environment support)
* **Node.js 18+** & **npm**

### Step 1: Spin up local Infrastructure Services
Start PostgreSQL and Redis container infrastructure in the background:
```bash
cd backend
docker-compose up -d
```

### Step 2: Configure Backend Environment
Copy the env template and fill out the details:
```bash
cp .env.example .env
```
Ensure your database connections and AWS keys or local equivalents are filled in.

### Step 3: Run Backend Migrations & Seeding
Create your virtual environment, install python dependencies, apply database migrations, and run seeds:
```bash
# Set up virtual environment
python3 -m venv venv
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Run migrations to initialize PostgreSQL schemas
alembic upgrade head

# Seed base application/datasets
python seed.py
```

### Step 4: Run the Backend & Celery Worker
Start the FastAPI server:
```bash
uvicorn app.main:app --reload --port 8000
```
> **Note:** The FastAPI lifespan context automatically fires up the Celery worker process as a subprocess. If you prefer running it independently, see `app/main.py`.

### Step 5: Boot Up the Frontend Application
Navigate into the frontend directory, install dependencies, and start the development server:
```bash
cd ../frontend
npm install
npm run dev
```

Open `http://localhost:3000` in your web browser to access the interactive data visualization playground!
