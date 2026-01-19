"""Vacancies router."""

import logging
from typing import Annotated

from fastapi import APIRouter, HTTPException, Query

from hh_applicant_tool.api.errors import ApiError

from ..dependencies import ApiClientDep, StorageDep, ToolDep
from ..schemas.common import PaginatedResponse
from ..schemas.vacancies import (
    Vacancy,
    VacancyApplyBatchRequest,
    VacancyApplyBatchResponse,
    VacancyApplyRequest,
    VacancyApplyResponse,
    VacancyBrief,
)

router = APIRouter()
logger = logging.getLogger(__name__)


def _vacancy_to_brief(data: dict) -> VacancyBrief:
    """Convert vacancy dict to brief schema."""
    salary = data.get("salary")
    area = data.get("area")
    employer = data.get("employer")
    schedule = data.get("schedule", {})

    return VacancyBrief(
        id=data.get("id"),
        name=data.get("name", ""),
        area={"id": area["id"], "name": area["name"]} if area else None,
        salary=(
            {
                "from": salary.get("from"),
                "to": salary.get("to"),
                "currency": salary.get("currency"),
                "gross": salary.get("gross"),
            }
            if salary
            else None
        ),
        employer=(
            {
                "id": employer.get("id"),
                "name": employer.get("name", ""),
                "trusted": employer.get("trusted", False),
                "alternate_url": employer.get("alternate_url"),
                "logo_urls": employer.get("logo_urls"),
            }
            if employer
            else None
        ),
        alternate_url=data.get("alternate_url"),
        published_at=data.get("published_at"),
        created_at=data.get("created_at"),
        remote=schedule.get("id") == "remote" if schedule else False,
        experience=data.get("experience", {}).get("id"),
        has_test=data.get("has_test", False),
        response_letter_required=data.get("response_letter_required", False),
    )


@router.get("/search", response_model=PaginatedResponse[VacancyBrief])
async def search_vacancies(
    api_client: ApiClientDep,
    text: Annotated[str | None, Query()] = None,
    area: Annotated[int | None, Query()] = None,
    salary: Annotated[int | None, Query()] = None,
    currency: Annotated[str, Query()] = "RUR",
    experience: Annotated[str | None, Query()] = None,
    employment: Annotated[str | None, Query()] = None,
    schedule: Annotated[str | None, Query()] = None,
    order_by: Annotated[str, Query()] = "relevance",
    page: Annotated[int, Query(ge=0)] = 0,
    per_page: Annotated[int, Query(ge=1, le=100)] = 20,
) -> PaginatedResponse[VacancyBrief]:
    """Search vacancies with filters."""
    try:
        params = {
            "page": page,
            "per_page": per_page,
            "order_by": order_by,
        }
        if text:
            params["text"] = text
        if area:
            params["area"] = area
        if salary:
            params["salary"] = salary
            params["currency"] = currency
        if experience:
            params["experience"] = experience
        if employment:
            params["employment"] = employment
        if schedule:
            params["schedule"] = schedule

        response = api_client.get("/vacancies", **params)
        items = response.get("items", [])
        found = response.get("found", 0)
        pages = response.get("pages", 0)

        return PaginatedResponse(
            items=[_vacancy_to_brief(v) for v in items],
            total=found,
            page=page,
            per_page=per_page,
            pages=pages,
        )
    except ApiError as e:
        raise HTTPException(status_code=e.status_code, detail=str(e))
    except Exception as e:
        logger.exception("Failed to search vacancies")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/similar/{resume_id}", response_model=PaginatedResponse[VacancyBrief])
async def get_similar_vacancies(
    resume_id: str,
    api_client: ApiClientDep,
    page: Annotated[int, Query(ge=0)] = 0,
    per_page: Annotated[int, Query(ge=1, le=100)] = 20,
) -> PaginatedResponse[VacancyBrief]:
    """Get vacancies similar to a resume."""
    try:
        response = api_client.get(
            f"/resumes/{resume_id}/similar_vacancies",
            page=page,
            per_page=per_page,
        )
        items = response.get("items", [])
        found = response.get("found", 0)
        pages = response.get("pages", 0)

        return PaginatedResponse(
            items=[_vacancy_to_brief(v) for v in items],
            total=found,
            page=page,
            per_page=per_page,
            pages=pages,
        )
    except ApiError as e:
        raise HTTPException(status_code=e.status_code, detail=str(e))
    except Exception as e:
        logger.exception("Failed to get similar vacancies")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{vacancy_id}", response_model=Vacancy)
async def get_vacancy(vacancy_id: int, api_client: ApiClientDep) -> Vacancy:
    """Get detailed vacancy information."""
    try:
        data = api_client.get(f"/vacancies/{vacancy_id}")
        brief = _vacancy_to_brief(data)

        return Vacancy(
            **brief.model_dump(),
            description=data.get("description"),
            key_skills=data.get("key_skills"),
            branded_description=data.get("branded_description"),
            schedule=data.get("schedule"),
            employment=data.get("employment"),
            professional_roles=data.get("professional_roles"),
        )
    except ApiError as e:
        raise HTTPException(status_code=e.status_code, detail=str(e))
    except Exception as e:
        logger.exception("Failed to get vacancy")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{vacancy_id}/apply", response_model=VacancyApplyResponse)
async def apply_to_vacancy(
    vacancy_id: int,
    request: VacancyApplyRequest,
    api_client: ApiClientDep,
    storage: StorageDep,
) -> VacancyApplyResponse:
    """Apply to a vacancy."""
    try:
        params = {
            "vacancy_id": vacancy_id,
            "resume_id": request.resume_id,
        }
        if request.message:
            params["message"] = request.message

        response = api_client.post("/negotiations", **params)
        negotiation_id = response.get("id")

        return VacancyApplyResponse(
            success=True,
            message="Applied successfully",
            negotiation_id=negotiation_id,
        )
    except ApiError as e:
        error_msg = str(e)
        if "already_applied" in error_msg.lower():
            return VacancyApplyResponse(
                success=False,
                message="Already applied to this vacancy",
                negotiation_id=None,
            )
        raise HTTPException(status_code=e.status_code, detail=error_msg)
    except Exception as e:
        logger.exception("Failed to apply to vacancy")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/apply-batch", response_model=VacancyApplyBatchResponse)
async def apply_batch(
    request: VacancyApplyBatchRequest,
    api_client: ApiClientDep,
    tool: ToolDep,
) -> VacancyApplyBatchResponse:
    """Apply to multiple vacancies at once."""
    applied = []
    failed = []

    for vacancy_id in request.vacancy_ids:
        try:
            params = {
                "vacancy_id": vacancy_id,
                "resume_id": request.resume_id,
            }
            if request.message:
                params["message"] = request.message

            api_client.post("/negotiations", **params)
            applied.append(vacancy_id)
        except ApiError as e:
            failed.append({"vacancy_id": vacancy_id, "error": str(e)})
        except Exception as e:
            failed.append({"vacancy_id": vacancy_id, "error": str(e)})

    return VacancyApplyBatchResponse(
        success=len(applied) > 0,
        applied=applied,
        failed=failed,
        message=f"Applied to {len(applied)} vacancies, {len(failed)} failed",
    )
