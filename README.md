# DataVis Platform — Handoff Prompt

## Project Overview
DataVis Platform is a full-stack data exploration app with a marketing site, authenticated dashboard, dataset ingestion, and the start of a DuckDB-backed analytics layer.

- Frontend: Next.js App Router, TypeScript, React 19, Tailwind CSS 4
- Backend: FastAPI, SQLAlchemy async, Pydantic v2
- Primary database: PostgreSQL
- Analytics store: DuckDB
- Client state: Redux Toolkit and TanStack React Query
- Auth: JWT cookies plus Google OAuth
- Infra pieces already present: Redis, Celery dependencies, Alembic, SMTP email

## Current Product Surface

### Marketing site
- Landing page at `frontend/app/page.tsx`
- Extra marketing pages under `frontend/app/(marketing)/`
- Shared marketing layout and animated sections via `components/marketing/*`

### Authentication
- Email/password signup and login
- Google OAuth redirect flow through FastAPI
- Logout
- Forgot-password email flow
- Reset-password token flow
- `/auth/me` current-user endpoint
- Route protection in Next.js middleware for dashboard pages
- Auth cookies are persisted by Next.js server actions, not directly by browser-side API code

### Dashboard shell
- Protected dashboard layout in `frontend/app/dashboard/layout.tsx`
- Shared shell UI in `frontend/components/layout/`
- Sidebar, topbar, and authenticated user context

### Dataset management
- Upload CSV, Excel, and JSON files
- Per-user dataset list
- Dataset detail fetch
- Dataset preview fetch
- Dataset delete
- Client-side upload UI, cards, and preview drawer in `frontend/components/datasets/`
- React Query hooks for list, detail, preview, upload, and delete

### Sample datasets
- Dashboard datasets page now supports two acquisition paths:
  - upload your own file
  - browse shared sample datasets
- `SeedDatasetBrowser` provides search, domain filters, and “add to my datasets” actions
- Backend includes seed-linking support so a user can attach a shared seeded DuckDB dataset to their own dataset catalogue entry

### DuckDB analytics groundwork
- Shared DuckDB connection at `backend/app/db/duckdb.py`
- Dataset model now includes `duckdb_table`
- Upload flow is being extended so uploaded datasets are ingested into DuckDB and Postgres stores metadata
- One-time seed script at `backend/seed.py` downloads real-world datasets, creates permanent DuckDB tables, and stores seed catalogue metadata in Postgres

## Architecture And Request Flow

### Frontend request pattern
Browser components do not call FastAPI directly for app data. The standard flow is:

`client component -> Next.js server action -> serverRequest() -> FastAPI`

Key files:
- `frontend/lib/api/server.ts`
- `frontend/lib/actions/auth.actions.ts`
- `frontend/lib/actions/dataset.actions.ts`
- `frontend/lib/actions/seed.actions.ts`

`serverRequest()` forwards the app's auth cookies to the backend and returns `{ data, error, status, headers }` instead of throwing. Server actions use small `unwrap()` helpers to convert that into typed return values or thrown errors.

### Auth flow
- FastAPI sets `access_token` and `refresh_token` cookies on login/signup/OAuth callback
- Next.js server actions mirror those cookies into the frontend app domain after auth calls
- Dashboard layout calls `getMe()` server-side before rendering protected routes
- `frontend/middleware.ts` redirects unauthenticated users away from protected routes

### Dataset flow
- Uploads hit `POST /api/v1/datasets/`
- Backend saves the file under `UPLOAD_DIR/<user_id>/...`
- Parser extracts schema, stats, and preview-ready metadata
- Dataset records live in Postgres
- The newer in-progress path also ingests uploaded data into DuckDB and stores the resulting `duckdb_table` on the dataset row

### Seed dataset flow
- Seed catalogue data lives globally in a Postgres `seed_datasets` table
- Permanent shared tables live in DuckDB
- A user links a seed dataset, which creates a normal `datasets` row for that user pointing at the shared `duckdb_table`

## Important Backend Modules

### API
- `backend/app/api/v1/endpoints/auth.py`
- `backend/app/api/v1/endpoints/dataset.py`
- `backend/app/api/v1/endpoints/seed.py`

### Services
- `backend/app/services/auth.py`
- `backend/app/services/user.py`
- `backend/app/services/parser.py`
- `backend/app/services/dataset.py`
- `backend/app/services/duckdb_ingest.py`

### Persistence
- Postgres ORM models in `backend/app/models/`
- Async SQLAlchemy session in `backend/app/db/session.py`
- DuckDB connection lifecycle in `backend/app/db/duckdb.py`
- App startup warms Postgres metadata and DuckDB connection in `backend/app/main.py`

## Important Frontend Modules

### Layout and auth
- `frontend/app/layout.tsx`
- `frontend/app/dashboard/layout.tsx`
- `frontend/middleware.ts`
- `frontend/components/layout/DashboardShell.tsx`

### Dataset UI
- `frontend/app/dashboard/datasets/page.tsx`
- `frontend/components/datasets/DatasetDropzone.tsx`
- `frontend/components/datasets/DatasetCard.tsx`
- `frontend/components/datasets/DatasetPreviewDrawer.tsx`
- `frontend/components/datasets/SeedDatasetBrowser.tsx`

### Data access
- `frontend/lib/api/datasets.ts`
- `frontend/lib/actions/dataset.actions.ts`
- `frontend/lib/actions/seed.actions.ts`
- `frontend/lib/hooks/useDatasets.ts`
- `frontend/lib/hooks/useSeeds.ts`

## Current Backend Endpoints

### Auth
- `POST /api/v1/auth/signup`
- `POST /api/v1/auth/login`
- `POST /api/v1/auth/logout`
- `POST /api/v1/auth/refresh`
- `POST /api/v1/auth/forgot-password`
- `POST /api/v1/auth/reset-password`
- `GET /api/v1/auth/google`
- `GET /api/v1/auth/google/callback`
- `GET /api/v1/auth/me`

### Datasets
- `POST /api/v1/datasets/`
- `GET /api/v1/datasets/`
- `GET /api/v1/datasets/{dataset_id}`
- `GET /api/v1/datasets/{dataset_id}/preview`
- `DELETE /api/v1/datasets/{dataset_id}`

### Seeds
- `POST /api/v1/{seed_key}/link`

Note: the frontend seed browser expects a seed catalogue listing action as well. The current worktree contains the browser, hook, and link endpoint, but the list endpoint is not present in `backend/app/api/v1/endpoints/seed.py` yet.

## Data Model Notes

### `Dataset`
The dataset row is the key bridge between product UX and storage backends.

Current fields include:
- ownership and identity: `id`, `user_id`, `name`
- file metadata: `original_filename`, `file_path`, `file_size`, `file_type`
- processing status: `status`, `error_message`
- parsed metadata: `row_count`, `column_count`, `schema`, `stats`
- analytics bridge: `duckdb_table`
- timestamps: `created_at`, `updated_at`

### `seed_datasets`
This is not an ORM model yet. It is created and populated by `backend/seed.py` as a shared catalogue of curated datasets that users can attach to their own workspace.

## Local Development

### Backend
```bash
cd backend
docker compose up -d
source venv/bin/activate
uvicorn app.main:app --reload --port 8000
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

## Environment Variables

### Backend `.env`
```env
SECRET_KEY=
DATABASE_URL=postgresql+asyncpg://postgres:password@localhost:5432/datavis
SYNC_DATABASE_URL=postgresql://postgres:password@localhost:5432/datavis
REDIS_URL=redis://localhost:6379/0
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=http://localhost:8000/api/v1/auth/google/callback
FRONTEND_URL=http://localhost:3000
MAIL_USERNAME=
MAIL_PASSWORD=
MAIL_FROM=
DUCKDB_PATH=data/analytics.duckdb
DUCKDB_READ_ONLY=false
UPLOAD_DIR=uploads
```

### Frontend `.env.local`
```env
NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1
INTERNAL_API_URL=http://localhost:8000/api/v1
NEXTAUTH_SECRET=
NEXTAUTH_URL=http://localhost:3000
NEXT_PUBLIC_GOOGLE_CLIENT_ID=
```

## Handoff Notes For The Next Engineer

### What is solid
- Auth flow is implemented end to end
- Protected dashboard shell is in place
- Dataset upload/list/preview/delete flow exists
- Frontend follows a consistent server-action boundary for backend calls
- DuckDB integration and seed-catalogue direction are established

### What is in progress
- `backend/app/services/dataset.py` currently contains duplicated `upload_dataset()` logic from an in-progress DuckDB ingestion refactor
- Seed linking exists, but the seed catalogue list endpoint expected by the frontend is missing from the checked-in backend route file
- Alembic is present and there is a migration for `duckdb_table`, but startup still relies on `Base.metadata.create_all()` as well

### Reasonable next steps
1. Finish the dataset service refactor so upload has one canonical path: save file, parse, ingest to DuckDB, persist metadata, clean up on failure.
2. Add `GET /api/v1/seeds/` to return the seed catalogue consumed by `SeedDatasetBrowser`.
3. Ensure dataset deletion also drops its DuckDB table when appropriate.
4. Add query endpoints on top of `duckdb_table` for actual analytics and visualization workflows.
5. Decide whether `seed_datasets` should remain raw SQL managed or become a first-class ORM model.

## Short Summary
If you are picking this up fresh: treat the app as an authenticated dataset workspace built on Next.js and FastAPI, where Postgres owns users and dataset metadata, while DuckDB is becoming the execution layer for uploaded and seeded analytical datasets. The main product work now is to finish the DuckDB-backed dataset lifecycle and build query and visualization features on top of it.
