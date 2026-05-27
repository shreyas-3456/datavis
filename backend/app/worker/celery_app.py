from celery import Celery
from app.core.config import settings

celery_app = Celery(
    "datavis",
    broker=settings.REDIS_URL,
    backend=settings.REDIS_URL,
)

celery_app.conf.update(
    task_serializer="json",
    result_serializer="json",
    accept_content=["json"],
    timezone="UTC",
    enable_utc=True,
    # Worker sleeps via broker heartbeat — wakes instantly on new task
    broker_transport_options={
        "visibility_timeout": 3600,  # 1 hour — requeue if worker dies mid-task
    },
    task_acks_late=True,             # ack only after task completes — safe requeue on crash
    worker_prefetch_multiplier=1,    # one task at a time per worker process
)

celery_app.autodiscover_tasks(["app.worker"])