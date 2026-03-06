"""Structured JSON logging setup."""

import logging
import sys

from app.config import settings
from app.middleware.request_id import request_id_var


class RequestIDFilter(logging.Filter):
    def filter(self, record):
        record.request_id = request_id_var.get("")
        return True


def setup_logging():
    """Configure structured logging with optional JSON format."""
    handler = logging.StreamHandler(sys.stdout)

    if settings.LOG_FORMAT == "json":
        try:
            from pythonjsonlogger import jsonlogger

            formatter = jsonlogger.JsonFormatter(
                "%(asctime)s %(name)s %(levelname)s %(message)s %(request_id)s",
                rename_fields={"asctime": "timestamp", "levelname": "level"},
            )
        except ImportError:
            formatter = logging.Formatter(
                "%(asctime)s [%(levelname)s] [%(request_id)s] %(name)s: %(message)s"
            )
    else:
        formatter = logging.Formatter(
            "%(asctime)s [%(levelname)s] [%(request_id)s] %(name)s: %(message)s"
        )

    handler.setFormatter(formatter)
    handler.addFilter(RequestIDFilter())

    root = logging.getLogger()
    root.handlers = [handler]
    root.setLevel(getattr(logging, settings.LOG_LEVEL.upper(), logging.INFO))
