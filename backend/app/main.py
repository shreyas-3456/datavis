from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.sessions import SessionMiddleware
from app.core.config import settings
from app.core.logger import logger
from app.core.middleware import LoggingMiddleware
from app.api.v1.api import router as api_router
from app.db.session import engine
from app.db.base import Base


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    logger.info("⚡ Starting up...", extra={"event": "startup"})
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    logger.info("✅ Database tables ready", extra={"event": "db_ready"})
    logger.info("🚀 Server is live", extra={"event": "server_live"})

    yield

    # Shutdown
    logger.info("🛑 Shutting down...", extra={"event": "shutdown"})
    await engine.dispose()
    logger.info("✅ DB connections closed", extra={"event": "db_closed"})

def create_app() -> FastAPI:
    app = FastAPI(
        title=settings.APP_NAME,
        version=settings.APP_VERSION,
        debug=settings.DEBUG,
        lifespan=lifespan,
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=[settings.FRONTEND_URL],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    app.add_middleware(SessionMiddleware, secret_key=settings.SECRET_KEY)
    app.add_middleware(LoggingMiddleware)

    app.include_router(api_router, prefix="/api/v1")

    @app.get("/health")
    async def health():
        return {"status": "ok", "version": settings.APP_VERSION}

    return app

app = create_app()