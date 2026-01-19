"""Common schemas used across the API."""

from datetime import datetime
from typing import Generic, TypeVar

from pydantic import BaseModel, Field

T = TypeVar("T")


class PaginatedResponse(BaseModel, Generic[T]):
    """Generic paginated response."""

    items: list[T]
    total: int
    page: int
    per_page: int
    pages: int


class ErrorResponse(BaseModel):
    """Error response schema."""

    error: str
    detail: str | None = None


class SuccessResponse(BaseModel):
    """Generic success response."""

    success: bool = True
    message: str | None = None


class IdName(BaseModel):
    """Common id-name pair."""

    id: str | int
    name: str


class Salary(BaseModel):
    """Salary information."""

    from_: int | None = Field(default=None, alias="from")
    to: int | None = None
    currency: str | None = None
    gross: bool | None = None

    model_config = {"populate_by_name": True}


class Area(BaseModel):
    """Geographic area."""

    id: int
    name: str


class DateTimeRange(BaseModel):
    """Date range for filtering."""

    start: datetime | None = None
    end: datetime | None = None
