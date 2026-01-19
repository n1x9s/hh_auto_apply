"""Employers router."""

import logging
from typing import Annotated

from fastapi import APIRouter, HTTPException, Query

from hh_applicant_tool.api.errors import ApiError

from ..dependencies import ApiClientDep, ConfigDep, StorageDep, ToolDep
from ..schemas.common import PaginatedResponse
from ..schemas.employers import BlacklistRequest, BlacklistResponse, EmployerFull

router = APIRouter()
logger = logging.getLogger(__name__)


@router.get("", response_model=PaginatedResponse[EmployerFull])
async def list_employers(
    storage: StorageDep,
    tool: ToolDep,
    search: Annotated[str | None, Query()] = None,
    blacklisted: Annotated[bool | None, Query()] = None,
    page: Annotated[int, Query(ge=0)] = 0,
    per_page: Annotated[int, Query(ge=1, le=100)] = 20,
) -> PaginatedResponse[EmployerFull]:
    """Get list of employers from local database."""
    try:
        # Get blacklisted employer IDs
        blacklisted_ids = set(tool.get_blacklisted())

        # Query from storage
        filters = {}
        if search:
            filters["name__like"] = f"%{search}%"

        employers = list(storage.employers.find(**filters))

        # Filter by blacklist status if specified
        if blacklisted is not None:
            employers = [
                e
                for e in employers
                if (str(e.id) in blacklisted_ids) == blacklisted
            ]

        # Pagination
        total = len(employers)
        start = page * per_page
        end = start + per_page
        paginated = employers[start:end]

        items = [
            EmployerFull(
                id=e.id,
                name=e.name,
                type=e.type,
                description=e.description,
                site_url=e.site_url,
                alternate_url=e.alternate_url,
                area={"id": e.area_id, "name": e.area_name}
                if e.area_id
                else None,
                trusted=getattr(e, "trusted", False),
                blacklisted=str(e.id) in blacklisted_ids,
            )
            for e in paginated
        ]

        return PaginatedResponse(
            items=items,
            total=total,
            page=page,
            per_page=per_page,
            pages=(total + per_page - 1) // per_page,
        )
    except Exception as e:
        logger.exception("Failed to list employers")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{employer_id}", response_model=EmployerFull)
async def get_employer(
    employer_id: int,
    api_client: ApiClientDep,
    storage: StorageDep,
    tool: ToolDep,
) -> EmployerFull:
    """Get detailed employer information."""
    try:
        # First try to get from API
        data = api_client.get(f"/employers/{employer_id}")
        area = data.get("area", {})
        blacklisted_ids = set(tool.get_blacklisted())

        return EmployerFull(
            id=data.get("id"),
            name=data.get("name", ""),
            type=data.get("type"),
            description=data.get("description"),
            site_url=data.get("site_url"),
            alternate_url=data.get("alternate_url"),
            area={"id": area.get("id"), "name": area.get("name")}
            if area
            else None,
            trusted=data.get("trusted", False),
            blacklisted=str(employer_id) in blacklisted_ids,
            vacancies_url=data.get("vacancies_url"),
        )
    except ApiError as e:
        raise HTTPException(status_code=e.status_code, detail=str(e))
    except Exception as e:
        logger.exception("Failed to get employer")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/blacklist", response_model=BlacklistResponse)
async def add_to_blacklist(
    request: BlacklistRequest,
    tool: ToolDep,
    config: ConfigDep,
) -> BlacklistResponse:
    """Add an employer to the blacklist."""
    try:
        blacklist = config.get("blacklist", [])

        employer_id_str = str(request.employer_id)
        if employer_id_str not in blacklist:
            blacklist.append(employer_id_str)
            tool.config["blacklist"] = blacklist
            tool.config.save()

        return BlacklistResponse(
            success=True,
            message=f"Employer {request.employer_id} added to blacklist",
        )
    except Exception as e:
        logger.exception("Failed to add to blacklist")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/blacklist/{employer_id}", response_model=BlacklistResponse)
async def remove_from_blacklist(
    employer_id: int,
    tool: ToolDep,
    config: ConfigDep,
) -> BlacklistResponse:
    """Remove an employer from the blacklist."""
    try:
        blacklist = config.get("blacklist", [])

        employer_id_str = str(employer_id)
        if employer_id_str in blacklist:
            blacklist.remove(employer_id_str)
            tool.config["blacklist"] = blacklist
            tool.config.save()

        return BlacklistResponse(
            success=True,
            message=f"Employer {employer_id} removed from blacklist",
        )
    except Exception as e:
        logger.exception("Failed to remove from blacklist")
        raise HTTPException(status_code=500, detail=str(e))
