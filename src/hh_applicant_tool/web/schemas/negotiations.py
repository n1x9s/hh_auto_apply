"""Negotiation (chat) schemas."""

from datetime import datetime

from pydantic import BaseModel

from .vacancies import Employer, VacancyBrief


class NegotiationState(BaseModel):
    """Negotiation state."""

    id: str
    name: str


class NegotiationBrief(BaseModel):
    """Brief negotiation info for lists."""

    id: int
    state: NegotiationState | None = None
    vacancy: VacancyBrief | None = None
    created_at: datetime | None = None
    updated_at: datetime | None = None
    has_updates: bool = False
    url: str | None = None


class Negotiation(NegotiationBrief):
    """Full negotiation information."""

    resume_id: str | None = None
    messages_url: str | None = None


class Message(BaseModel):
    """Chat message."""

    id: str
    text: str
    created_at: datetime
    author: dict | None = None
    read: bool = False
    state: dict | None = None
    address: dict | None = None


class MessageListResponse(BaseModel):
    """Response with messages list."""

    messages: list[Message]
    found: int


class SendMessageRequest(BaseModel):
    """Request to send a message."""

    message: str


class SendMessageResponse(BaseModel):
    """Response after sending a message."""

    success: bool
    message: str


class NegotiationDeleteResponse(BaseModel):
    """Response after deleting/canceling a negotiation."""

    success: bool
    message: str


class NegotiationListParams(BaseModel):
    """Parameters for listing negotiations."""

    status: str | None = None
    page: int = 0
    per_page: int = 20
    order_by: str = "updated_at"
