"""Settings router (database settings)."""

import logging
from typing import Any

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from ..dependencies import StorageDep

router = APIRouter()
logger = logging.getLogger(__name__)


class Setting(BaseModel):
    """Setting key-value pair."""

    key: str
    value: Any


class SettingUpdateRequest(BaseModel):
    """Request to update a setting."""

    value: Any


class SettingResponse(BaseModel):
    """Response after setting operation."""

    success: bool
    message: str


@router.get("", response_model=list[Setting])
async def list_settings(storage: StorageDep) -> list[Setting]:
    """Get all settings from database."""
    try:
        settings = list(storage.settings.find())
        return [Setting(key=s.key, value=s.value) for s in settings]
    except Exception as e:
        logger.exception("Failed to list settings")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{key}", response_model=Setting)
async def get_setting(key: str, storage: StorageDep) -> Setting:
    """Get a specific setting by key."""
    try:
        setting = storage.settings.get(key)
        if setting is None:
            raise HTTPException(status_code=404, detail="Setting not found")
        return Setting(key=setting.key, value=setting.value)
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Failed to get setting")
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/{key}", response_model=SettingResponse)
async def update_setting(
    key: str,
    request: SettingUpdateRequest,
    storage: StorageDep,
) -> SettingResponse:
    """Update or create a setting."""
    try:
        from hh_applicant_tool.storage.models.setting import SettingModel

        setting = SettingModel(key=key, value=request.value)
        storage.settings.save(setting)

        return SettingResponse(
            success=True,
            message=f"Setting '{key}' updated successfully",
        )
    except Exception as e:
        logger.exception("Failed to update setting")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{key}", response_model=SettingResponse)
async def delete_setting(key: str, storage: StorageDep) -> SettingResponse:
    """Delete a setting."""
    try:
        setting = storage.settings.get(key)
        if setting is None:
            raise HTTPException(status_code=404, detail="Setting not found")

        storage.settings.delete(key)

        return SettingResponse(
            success=True,
            message=f"Setting '{key}' deleted successfully",
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Failed to delete setting")
        raise HTTPException(status_code=500, detail=str(e))
