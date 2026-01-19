"""Authentication schemas."""

from datetime import datetime

from pydantic import BaseModel


class AuthStatus(BaseModel):
    """Authentication status response."""

    authenticated: bool
    access_token_expires: datetime | None = None
    refresh_token_expires: datetime | None = None


class UserInfo(BaseModel):
    """Current user information from HH API."""

    id: str
    first_name: str
    last_name: str
    middle_name: str | None = None
    email: str | None = None
    phone: str | None = None
    is_employer: bool = False
    is_applicant: bool = True
    is_anonymous: bool = False


class TokenRefreshRequest(BaseModel):
    """Request to refresh token."""

    force: bool = False


class TokenRefreshResponse(BaseModel):
    """Response after token refresh."""

    success: bool
    message: str
    access_token_expires: datetime | None = None
