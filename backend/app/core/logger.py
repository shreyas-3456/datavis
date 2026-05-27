import logging
import sys
import time
from contextvars import ContextVar
from typing import Optional
from datetime import datetime

request_id_var: ContextVar[Optional[str]] = ContextVar("request_id", default=None)

# ── ANSI Colors ────────────────────────────────────────────────────────────────
RESET   = "\033[0m"
BOLD    = "\033[1m"
DIM     = "\033[2m"

BLACK   = "\033[30m"
RED     = "\033[31m"
GREEN   = "\033[32m"
YELLOW  = "\033[33m"
BLUE    = "\033[34m"
MAGENTA = "\033[35m"
CYAN    = "\033[36m"
WHITE   = "\033[37m"

BG_RED    = "\033[41m"
BG_GREEN  = "\033[42m"
BG_YELLOW = "\033[43m"
BG_BLUE   = "\033[44m"

LEVEL_STYLES = {
    "DEBUG":    f"{DIM}{CYAN}",
    "INFO":     f"{GREEN}",
    "WARNING":  f"{YELLOW}",
    "ERROR":    f"{RED}{BOLD}",
    "CRITICAL": f"{BG_RED}{WHITE}{BOLD}",
}

LEVEL_ICONS = {
    "DEBUG":    "·",
    "INFO":     "✓",
    "WARNING":  "⚠",
    "ERROR":    "✗",
    "CRITICAL": "☠",
}

LOGGER_COLORS = {
    "datavis.app":    BLUE,
    "datavis.db":     MAGENTA,
    "datavis.auth":   CYAN,
    "datavis.http":   GREEN,
    "datavis.worker": YELLOW,
}

class PrettyConsoleFormatter(logging.Formatter):
    def format(self, record: logging.LogRecord) -> str:
        now        = datetime.utcnow().strftime("%H:%M:%S")
        level      = record.levelname
        icon       = LEVEL_ICONS.get(level, "·")
        lvl_color  = LEVEL_STYLES.get(level, "")
        name_color = LOGGER_COLORS.get(record.name, WHITE)
        request_id = request_id = request_id_var.get()
        short_name = record.name.split(".")[-1].upper()
        location = f"{record.filename}:{record.lineno}"

        # Header line
        time_part   = f"{DIM}{now}{RESET}"
        level_part  = f"{lvl_color}{icon} {level:<8}{RESET}"
        name_part   = f"{name_color}{BOLD}{short_name:<7}{RESET}"
        rid_part    = (
                        f"{DIM}[{request_id}]{RESET}"
                        if request_id
                        else f"{DIM}{location}{RESET}"
                    )

        # Message
        msg = record.getMessage()
        msg_color = lvl_color if level in ("ERROR", "CRITICAL", "WARNING") else WHITE
        msg_part = f"{msg_color}{msg}{RESET}"

        # Extra fields (event, duration, etc.)
        extras = []
        skip = {"message", "request_id", "event", "alert"}
        for k, v in record.__dict__.items():
            if k.startswith("_") or k in skip or k in logging.LogRecord.__dict__:
                continue
            if k in ("args", "exc_info", "exc_text", "stack_info", "msg",
                     "levelname", "levelno", "pathname", "filename",
                     "module", "funcName", "created", "msecs", "relativeCreated",
                     "thread", "threadName", "processName", "process", "lineno", "name"):
                continue
            extras.append(f"{DIM}{k}{RESET}={CYAN}{v}{RESET}")

        event = getattr(record, "event", None)
        event_part = f"  {DIM}→ {YELLOW}{event}{RESET}" if event else ""
        extras_part = f"  {' '.join(extras)}" if extras else ""

        line = f"{time_part}  {level_part}  {name_part}  {rid_part}  {msg_part}{event_part}{extras_part}"

        # Exception
        if record.exc_info:
            line += f"\n{RED}{self.formatException(record.exc_info)}{RESET}"

        return line


class RequestIdFilter(logging.Filter):
    def filter(self, record):
        record.request_id = request_id_var.get() or "system"
        return True


def setup_logger(name: str) -> logging.Logger:
    logger = logging.getLogger(name)
    logger.setLevel(logging.DEBUG)
    logger.handlers.clear()

    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(PrettyConsoleFormatter())
    handler.addFilter(RequestIdFilter())
    logger.addHandler(handler)
    logger.propagate = False
    return logger


# ── Named loggers ──────────────────────────────────────────────────────────────
logger        = setup_logger("datavis.app")
db_logger     = setup_logger("datavis.db")
auth_logger   = setup_logger("datavis.auth")
worker_logger = setup_logger("datavis.worker")
http_logger   = setup_logger("datavis.http")