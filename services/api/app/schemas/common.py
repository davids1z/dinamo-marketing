"""Common / shared schemas for the Dinamo Zagreb Marketing Platform API."""

from __future__ import annotations

from datetime import date
from typing import Generic, Optional, TypeVar

from pydantic import BaseModel, ConfigDict, Field

T = TypeVar("T")


# ---------------------------------------------------------------------------
# Pagination
# ---------------------------------------------------------------------------

class PaginationParams(BaseModel):
    """Query-parameter schema for paginated list endpoints."""

    model_config = ConfigDict(from_attributes=True)

    page: int = Field(default=1, ge=1, description="Page number (1-indexed)")
    page_size: int = Field(default=20, ge=1, le=100, description="Items per page")
    sort_by: Optional[str] = Field(default=None, description="Column to sort by")
    sort_order: Optional[str] = Field(
        default="asc",
        pattern="^(asc|desc)$",
        description="Sort direction: asc or desc",
    )


class PaginatedResponse(BaseModel, Generic[T]):
    """Envelope for any paginated list response."""

    model_config = ConfigDict(from_attributes=True)

    items: list[T]
    total: int = Field(ge=0, description="Total number of records")
    page: int = Field(ge=1)
    page_size: int = Field(ge=1)


# ---------------------------------------------------------------------------
# Filters
# ---------------------------------------------------------------------------

class DateRangeFilter(BaseModel):
    """Reusable date-range filter."""

    model_config = ConfigDict(from_attributes=True)

    start_date: Optional[date] = Field(default=None, description="Inclusive start date")
    end_date: Optional[date] = Field(default=None, description="Inclusive end date")


# ---------------------------------------------------------------------------
# Generic responses
# ---------------------------------------------------------------------------

class MessageResponse(BaseModel):
    """Simple message / status response."""

    model_config = ConfigDict(from_attributes=True)

    message: str
    detail: Optional[str] = None


class HealthCheck(BaseModel):
    """Health-check response for /health endpoint."""

    model_config = ConfigDict(from_attributes=True)

    status: str = Field(description="Overall service status")
    database: str = Field(description="Database connectivity status")
    redis: str = Field(description="Redis connectivity status")
    api_clients: dict[str, str] = Field(
        default_factory=dict,
        description="Status of external API clients",
    )
