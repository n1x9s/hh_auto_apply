"""Config router (JSON config file)."""

import logging
from typing import Any

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from ..dependencies import ConfigDep, ToolDep

router = APIRouter()
logger = logging.getLogger(__name__)


class ConfigItem(BaseModel):
    """Config key-value pair."""

    key: str
    value: Any


class ConfigUpdateRequest(BaseModel):
    """Request to update config value."""

    value: Any


class ConfigResponse(BaseModel):
    """Response after config operation."""

    success: bool
    message: str


# Keys that should not be exposed via API
SENSITIVE_KEYS = {"token", "access_token", "refresh_token"}


def _filter_sensitive(config: dict) -> dict:
    """Filter out sensitive keys from config."""
    return {
        k: (
            "***"
            if k in SENSITIVE_KEYS or "token" in k.lower()
            else v
        )
        for k, v in config.items()
    }


@router.get("", response_model=dict)
async def get_config(config: ConfigDep) -> dict:
    """Get all configuration (sensitive values masked)."""
    try:
        return _filter_sensitive(dict(config))
    except Exception as e:
        logger.exception("Failed to get config")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{key}", response_model=ConfigItem)
async def get_config_item(key: str, config: ConfigDep) -> ConfigItem:
    """Get a specific config value."""
    try:
        if key in SENSITIVE_KEYS or "token" in key.lower():
            raise HTTPException(
                status_code=403, detail="Cannot access sensitive config"
            )

        if key not in config:
            raise HTTPException(status_code=404, detail="Config key not found")

        return ConfigItem(key=key, value=config[key])
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Failed to get config item")
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/{key}", response_model=ConfigResponse)
async def update_config(
    key: str,
    request: ConfigUpdateRequest,
    tool: ToolDep,
    config: ConfigDep,
) -> ConfigResponse:
    """Update a config value."""
    try:
        if key in SENSITIVE_KEYS or "token" in key.lower():
            raise HTTPException(
                status_code=403, detail="Cannot modify sensitive config via API"
            )

        tool.config[key] = request.value
        tool.config.save()

        return ConfigResponse(
            success=True,
            message=f"Config '{key}' updated successfully",
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Failed to update config")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{key}", response_model=ConfigResponse)
async def delete_config(
    key: str,
    tool: ToolDep,
    config: ConfigDep,
) -> ConfigResponse:
    """Delete a config key."""
    try:
        if key in SENSITIVE_KEYS or "token" in key.lower():
            raise HTTPException(
                status_code=403, detail="Cannot delete sensitive config via API"
            )

        if key not in config:
            raise HTTPException(status_code=404, detail="Config key not found")

        del tool.config[key]
        tool.config.save()

        return ConfigResponse(
            success=True,
            message=f"Config '{key}' deleted successfully",
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Failed to delete config")
        raise HTTPException(status_code=500, detail=str(e))
