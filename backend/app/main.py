from contextlib import asynccontextmanager
import subprocess
import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.sessions import SessionMiddleware
from app.core.config import settings
from app.core.logger import logger
from app.core.middleware import LoggingMiddleware
from app.api.v1.api import router as api_router
from app.db.session import engine
from app.db.base import Base

_celery_process: subprocess.Popen | None = None


def _check_s3() -> None:
    """Verify S3 bucket is accessible at startup. Hard-fails if not."""
    import boto3
    from botocore.exceptions import BotoCoreError, ClientError
    try:
        client = boto3.client(
            "s3",
            region_name=settings.AWS_REGION,
            aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
            aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
        )
        client.head_bucket(Bucket=settings.S3_BUCKET)
        logger.info(
            f"✅ S3 connected — bucket '{settings.S3_BUCKET}' ({settings.AWS_REGION})",
            extra={"event": "s3_ready"},
        )
    except ClientError as exc:
        code = exc.response["Error"]["Code"]
        logger.error(
            f"❌ S3 bucket check failed [{code}]: {exc}",
            extra={"event": "s3_error"},
        )
        raise RuntimeError(f"S3 bucket '{settings.S3_BUCKET}' not accessible: {code}") from exc
    except BotoCoreError as exc:
        logger.error(f"❌ S3 connection error: {exc}", extra={"event": "s3_error"})
        raise RuntimeError(f"S3 connection failed: {exc}") from exc


@asynccontextmanager
async def lifespan(app: FastAPI):
    global _celery_process

    logger.info("⚡ Starting up...", extra={"event": "startup"})

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    logger.info("✅ Database tables ready", extra={"event": "db_ready"})

    _check_s3()

    # Start Celery worker as a subprocess
    backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    _celery_process = subprocess.Popen(
        [
            "celery",
            "-A", "app.worker.celery_app",
            "worker",
            "--loglevel=info",
            "--concurrency=1",
        ],
        cwd=backend_dir,
    )
    logger.info(
        f"✅ Celery worker started (PID {_celery_process.pid})",
        extra={"event": "celery_ready"},
    )

    logger.info("🚀 Server is live", extra={"event": "server_live"})
    yield

    logger.info("🛑 Shutting down...", extra={"event": "shutdown"})

    if _celery_process and _celery_process.poll() is None:
        _celery_process.terminate()
        try:
            _celery_process.wait(timeout=10)
        except subprocess.TimeoutExpired:
            _celery_process.kill()
        logger.info("✅ Celery worker stopped", extra={"event": "celery_stopped"})

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
