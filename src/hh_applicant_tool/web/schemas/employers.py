"""Employer and contact schemas."""

from datetime import datetime

from pydantic import BaseModel

from .common import Area


class EmployerFull(BaseModel):
    """Full employer information."""

    id: int
    name: str
    type: str | None = None
    description: str | None = None
    site_url: str | None = None
    alternate_url: str | None = None
    area: Area | None = None
    trusted: bool = False
    blacklisted: bool = False
    vacancies_url: str | None = None


class EmployerListParams(BaseModel):
    """Parameters for listing employers."""

    search: str | None = None
    blacklisted: bool | None = None
    page: int = 0
    per_page: int = 20


class BlacklistRequest(BaseModel):
    """Request to add/remove employer from blacklist."""

    employer_id: int
    reason: str | None = None


class BlacklistResponse(BaseModel):
    """Response after blacklist operation."""

    success: bool
    message: str


class Contact(BaseModel):
    """Contact information."""

    id: int | None = None
    vacancy_id: int
    vacancy_name: str | None = None
    employer_id: int | None = None
    employer_name: str | None = None
    full_name: str | None = None
    email: str | None = None
    phones: list[dict] | None = None
    created_at: datetime | None = None


class ContactListParams(BaseModel):
    """Parameters for listing contacts."""

    search: str | None = None
    employer_id: int | None = None
    page: int = 0
    per_page: int = 20


class ContactExportParams(BaseModel):
    """Parameters for exporting contacts."""

    format: str = "csv"
    employer_id: int | None = None
