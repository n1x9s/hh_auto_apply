"""Vacancy schemas."""

from datetime import datetime

from pydantic import BaseModel

from .common import Area, Salary


class Employer(BaseModel):
    """Employer brief info."""

    id: int
    name: str
    trusted: bool = False
    alternate_url: str | None = None
    logo_urls: dict | None = None


class VacancyBrief(BaseModel):
    """Brief vacancy information for lists."""

    id: int
    name: str
    area: Area | None = None
    salary: Salary | None = None
    employer: Employer | None = None
    alternate_url: str | None = None
    published_at: datetime | None = None
    created_at: datetime | None = None
    remote: bool = False
    experience: str | None = None
    has_test: bool = False
    response_letter_required: bool = False


class Vacancy(VacancyBrief):
    """Full vacancy information."""

    description: str | None = None
    key_skills: list[dict] | None = None
    branded_description: str | None = None
    schedule: dict | None = None
    employment: dict | None = None
    professional_roles: list[dict] | None = None


class VacancySearchParams(BaseModel):
    """Parameters for vacancy search."""

    text: str | None = None
    area: int | None = None
    salary: int | None = None
    currency: str = "RUR"
    experience: str | None = None
    employment: str | None = None
    schedule: str | None = None
    order_by: str = "relevance"
    page: int = 0
    per_page: int = 20


class VacancySimilarParams(BaseModel):
    """Parameters for similar vacancies search."""

    resume_id: str
    page: int = 0
    per_page: int = 20


class VacancyApplyRequest(BaseModel):
    """Request to apply to a vacancy."""

    vacancy_id: int
    resume_id: str
    message: str | None = None


class VacancyApplyResponse(BaseModel):
    """Response after applying to a vacancy."""

    success: bool
    message: str
    negotiation_id: int | None = None


class VacancyApplyBatchRequest(BaseModel):
    """Request for batch apply to vacancies."""

    vacancy_ids: list[int]
    resume_id: str
    message: str | None = None
    use_ai_message: bool = False


class VacancyApplyBatchResponse(BaseModel):
    """Response after batch apply."""

    success: bool
    applied: list[int]
    failed: list[dict]
    message: str
