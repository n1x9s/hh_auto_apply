"""Dependency injection for FastAPI."""

from functools import lru_cache
from typing import TYPE_CHECKING, Annotated, Generator

from fastapi import Depends, HTTPException, Request

if TYPE_CHECKING:
    from hh_applicant_tool.api.client import ApiClient
    from hh_applicant_tool.main import HHApplicantTool
    from hh_applicant_tool.storage.facade import StorageFacade


def get_tool(request: Request) -> "HHApplicantTool":
    """Get HHApplicantTool instance from app state."""
    tool = getattr(request.app.state, "tool", None)
    if tool is None:
        raise HTTPException(
            status_code=500,
            detail="Tool not initialized",
        )
    return tool


def get_api_client(
    tool: Annotated["HHApplicantTool", Depends(get_tool)],
) -> "ApiClient":
    """Get authenticated ApiClient."""
    try:
        return tool.api_client
    except Exception as e:
        raise HTTPException(
            status_code=401,
            detail=f"Not authenticated: {e}",
        )


def get_storage(
    tool: Annotated["HHApplicantTool", Depends(get_tool)],
) -> "StorageFacade":
    """Get StorageFacade instance."""
    return tool.storage


def get_config(
    tool: Annotated["HHApplicantTool", Depends(get_tool)],
) -> dict:
    """Get configuration dictionary."""
    return tool.config


ToolDep = Annotated["HHApplicantTool", Depends(get_tool)]
ApiClientDep = Annotated["ApiClient", Depends(get_api_client)]
StorageDep = Annotated["StorageFacade", Depends(get_storage)]
ConfigDep = Annotated[dict, Depends(get_config)]
