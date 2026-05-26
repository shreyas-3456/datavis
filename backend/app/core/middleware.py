import time
import uuid
from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
from app.core.logger import http_logger, request_id_var

METHOD_COLORS = {
    "GET":    "\033[32m",
    "POST":   "\033[34m",
    "PUT":    "\033[33m",
    "PATCH":  "\033[35m",
    "DELETE": "\033[31m",
}
RESET = "\033[0m"
DIM   = "\033[2m"

class LoggingMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        request_id = str(uuid.uuid4())[:8]
        request_id_var.set(request_id)
        start = time.perf_counter()

        method_color = METHOD_COLORS.get(request.method, "")
        method = f"{method_color}{request.method:<7}{RESET}"

        http_logger.info(
            f"→  {method}  {request.url.path}",
            extra={"event": "req_in", "ip": request.client.host if request.client else "?"}
        )

        try:
            response: Response = await call_next(request)
            ms = round((time.perf_counter() - start) * 1000, 2)

            status = response.status_code
            if status >= 500:
                status_color = "\033[31m"
            elif status >= 400:
                status_color = "\033[33m"
            else:
                status_color = "\033[32m"

            status_str = f"{status_color}{status}{RESET}"
            ms_str = f"{DIM}{ms}ms{RESET}"

            log_fn = http_logger.warning if status >= 400 else http_logger.info
            log_fn(
                f"←  {method}  {request.url.path}  {status_str}  {ms_str}",
                extra={"event": "req_out", "status": status, "ms": ms}
            )

            response.headers["X-Request-ID"] = request_id
            response.headers["X-Response-Time"] = f"{ms}ms"
            return response

        except Exception as exc:
            ms = round((time.perf_counter() - start) * 1000, 2)
            http_logger.error(
                f"💥 {method}  {request.url.path}  FAILED  {DIM}{ms}ms{RESET}",
                extra={"event": "req_error", "error": str(exc), "ms": ms},
                exc_info=True
            )
            raise