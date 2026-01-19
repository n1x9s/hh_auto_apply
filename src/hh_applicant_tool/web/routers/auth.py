"""Authentication router."""

import logging
from datetime import datetime

from fastapi import APIRouter, HTTPException

from hh_applicant_tool.api.errors import ApiError

from ..dependencies import ApiClientDep, ConfigDep, ToolDep
from ..schemas.auth import AuthStatus, TokenRefreshResponse, UserInfo

router = APIRouter()
logger = logging.getLogger(__name__)


@router.get("/status", response_model=AuthStatus)
async def get_auth_status(tool: ToolDep, config: ConfigDep) -> AuthStatus:
    """Get current authentication status."""
    token_data = config.get("token", {})

    if not token_data:
        return AuthStatus(authenticated=False)

    access_expires = token_data.get("access_token_expires")
    refresh_expires = token_data.get("refresh_token_expires")

    return AuthStatus(
        authenticated=bool(token_data.get("access_token")),
        access_token_expires=(
            datetime.fromisoformat(access_expires) if access_expires else None
        ),
        refresh_token_expires=(
            datetime.fromisoformat(refresh_expires) if refresh_expires else None
        ),
    )


@router.get("/me", response_model=UserInfo)
async def get_current_user(tool: ToolDep, api_client: ApiClientDep) -> UserInfo:
    """Get current authenticated user information."""
    try:
        user_data = tool.get_me()
        return UserInfo(
            id=user_data.get("id", ""),
            first_name=user_data.get("first_name", ""),
            last_name=user_data.get("last_name", ""),
            middle_name=user_data.get("middle_name"),
            email=user_data.get("email"),
            phone=user_data.get("phone"),
            is_employer=user_data.get("is_employer", False),
            is_applicant=user_data.get("is_applicant", True),
            is_anonymous=user_data.get("is_anonymous", False),
        )
    except ApiError as e:
        raise HTTPException(status_code=e.status_code, detail=str(e))
    except Exception as e:
        logger.exception("Failed to get user info")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/refresh", response_model=TokenRefreshResponse)
async def refresh_token(
    tool: ToolDep, api_client: ApiClientDep
) -> TokenRefreshResponse:
    """Refresh the access token."""
    try:
        if api_client.is_access_expired:
            # Token will be auto-refreshed on next request
            # Force a request to trigger refresh
            tool.get_me()

        # Save updated token
        tool.save_token()

        token_data = tool.config.get("token", {})
        access_expires = token_data.get("access_token_expires")

        return TokenRefreshResponse(
            success=True,
            message="Token refreshed successfully",
            access_token_expires=(
                datetime.fromisoformat(access_expires)
                if access_expires
                else None
            ),
        )
    except ApiError as e:
        raise HTTPException(status_code=e.status_code, detail=str(e))
    except Exception as e:
        logger.exception("Failed to refresh token")
        raise HTTPException(status_code=500, detail=str(e))
