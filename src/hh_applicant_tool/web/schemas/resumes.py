"""Resume schemas."""

from datetime import datetime

from pydantic import BaseModel


class ResumeStatus(BaseModel):
    """Resume status."""

    id: str
    name: str


class ResumeCounters(BaseModel):
    """Resume view counters."""

    total_views: int = 0
    new_views: int = 0


class Resume(BaseModel):
    """Resume information."""

    id: str
    title: str
    url: str | None = None
    alternate_url: str | None = None
    status: ResumeStatus | None = None
    can_publish_or_update: bool = False
    total_views: int = 0
    new_views: int = 0
    created_at: datetime | None = None
    updated_at: datetime | None = None


class ResumePublishRequest(BaseModel):
    """Request to publish/update a resume."""

    resume_id: str


class ResumePublishResponse(BaseModel):
    """Response after publishing a resume."""

    success: bool
    message: str
    resume_id: str


class ResumePublishAllResponse(BaseModel):
    """Response after publishing all resumes."""

    success: bool
    published: list[str]
    failed: list[str]
    message: str
