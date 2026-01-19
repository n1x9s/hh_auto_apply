"""Vacancies router."""

import logging
from typing import Annotated

from fastapi import APIRouter, HTTPException, Query

from hh_applicant_tool.api.errors import ApiError

from ..dependencies import ApiClientDep, StorageDep, ToolDep
from ..schemas.common import PaginatedResponse
from ..schemas.vacancies import (
    AutoApplyProgress,
    AutoApplyRequest,
    AutoApplyResponse,
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


@router.post("/auto-apply", response_model=AutoApplyResponse)
async def auto_apply(
    request: AutoApplyRequest,
    api_client: ApiClientDep,
    tool: ToolDep,
    storage: StorageDep,
) -> AutoApplyResponse:
    """Auto-apply to similar vacancies for resume(s).

    Scans similar vacancies and automatically applies to those that:
    - Don't have tests
    - Are not archived
    - Don't redirect to external sites
    - Haven't been applied to yet
    """
    results: list[AutoApplyProgress] = []
    applied_count = 0
    skipped_count = 0
    failed_count = 0

    try:
        # Get resumes
        resumes_response = api_client.get("/resumes/mine")
        resumes = resumes_response.get("items", [])

        # Filter by resume_id if specified
        if request.resume_id:
            resumes = [r for r in resumes if r["id"] == request.resume_id]

        # Only published resumes
        resumes = [r for r in resumes if r.get("status", {}).get("id") == "published"]

        if not resumes:
            return AutoApplyResponse(
                success=False,
                applied_count=0,
                skipped_count=0,
                failed_count=0,
                results=[],
                message="Нет опубликованных резюме",
            )

        # Default message templates
        default_messages = [
            "Здравствуйте! Меня заинтересовала ваша вакансия. Хотелось бы обсудить возможность сотрудничества.",
            "Добрый день! Прошу рассмотреть мою кандидатуру на данную вакансию.",
        ]

        for resume in resumes:
            resume_id = resume["id"]

            # Get similar vacancies
            for page in range(request.total_pages):
                try:
                    response = api_client.get(
                        f"/resumes/{resume_id}/similar_vacancies",
                        page=page,
                        per_page=request.per_page,
                    )
                    vacancies = response.get("items", [])

                    if not vacancies:
                        break

                    for vacancy in vacancies:
                        vacancy_id = vacancy.get("id")
                        vacancy_name = vacancy.get("name", "")
                        vacancy_url = vacancy.get("alternate_url")
                        employer = vacancy.get("employer", {})
                        employer_name = employer.get("name", "")

                        # Skip if has test
                        if vacancy.get("has_test"):
                            results.append(
                                AutoApplyProgress(
                                    vacancy_id=vacancy_id,
                                    vacancy_name=vacancy_name,
                                    vacancy_url=vacancy_url,
                                    employer_name=employer_name,
                                    status="skipped",
                                    reason="Вакансия с тестом",
                                )
                            )
                            skipped_count += 1
                            continue

                        # Skip if archived
                        if vacancy.get("archived"):
                            results.append(
                                AutoApplyProgress(
                                    vacancy_id=vacancy_id,
                                    vacancy_name=vacancy_name,
                                    vacancy_url=vacancy_url,
                                    employer_name=employer_name,
                                    status="skipped",
                                    reason="Вакансия в архиве",
                                )
                            )
                            skipped_count += 1
                            continue

                        # Skip if has redirect
                        if vacancy.get("response_url"):
                            results.append(
                                AutoApplyProgress(
                                    vacancy_id=vacancy_id,
                                    vacancy_name=vacancy_name,
                                    vacancy_url=vacancy_url,
                                    employer_name=employer_name,
                                    status="skipped",
                                    reason="Перенаправление на внешний сайт",
                                )
                            )
                            skipped_count += 1
                            continue

                        # Skip if already applied
                        relations = vacancy.get("relations", [])
                        if relations:
                            results.append(
                                AutoApplyProgress(
                                    vacancy_id=vacancy_id,
                                    vacancy_name=vacancy_name,
                                    vacancy_url=vacancy_url,
                                    employer_name=employer_name,
                                    status="skipped",
                                    reason="Уже откликались",
                                )
                            )
                            skipped_count += 1
                            continue

                        # Dry run - don't actually apply
                        if request.dry_run:
                            results.append(
                                AutoApplyProgress(
                                    vacancy_id=vacancy_id,
                                    vacancy_name=vacancy_name,
                                    vacancy_url=vacancy_url,
                                    employer_name=employer_name,
                                    status="applied",
                                    reason="Тестовый режим (dry run)",
                                )
                            )
                            applied_count += 1
                            continue

                        # Prepare message
                        message = ""
                        if vacancy.get("response_letter_required"):
                            if request.message_template:
                                message = request.message_template
                            else:
                                import random

                                message = random.choice(default_messages)

                        # Apply
                        try:
                            params = {
                                "resume_id": resume_id,
                                "vacancy_id": vacancy_id,
                            }
                            if message:
                                params["message"] = message

                            api_client.post("/negotiations", **params)
                            results.append(
                                AutoApplyProgress(
                                    vacancy_id=vacancy_id,
                                    vacancy_name=vacancy_name,
                                    vacancy_url=vacancy_url,
                                    employer_name=employer_name,
                                    status="applied",
                                    reason=None,
                                )
                            )
                            applied_count += 1
                        except ApiError as e:
                            error_str = str(e)
                            if "limit" in error_str.lower():
                                # Rate limit reached, stop
                                results.append(
                                    AutoApplyProgress(
                                        vacancy_id=vacancy_id,
                                        vacancy_name=vacancy_name,
                                        vacancy_url=vacancy_url,
                                        employer_name=employer_name,
                                        status="failed",
                                        reason="Достигнут лимит откликов",
                                    )
                                )
                                failed_count += 1
                                return AutoApplyResponse(
                                    success=applied_count > 0,
                                    applied_count=applied_count,
                                    skipped_count=skipped_count,
                                    failed_count=failed_count,
                                    results=results,
                                    message=f"Достигнут лимит откликов. Отправлено: {applied_count}",
                                )
                            results.append(
                                AutoApplyProgress(
                                    vacancy_id=vacancy_id,
                                    vacancy_name=vacancy_name,
                                    vacancy_url=vacancy_url,
                                    employer_name=employer_name,
                                    status="failed",
                                    reason=error_str,
                                )
                            )
                            failed_count += 1

                    # Check if more pages
                    if page >= response.get("pages", 0) - 1:
                        break

                except ApiError as e:
                    logger.warning("Error getting similar vacancies: %s", e)
                    break

        return AutoApplyResponse(
            success=applied_count > 0,
            applied_count=applied_count,
            skipped_count=skipped_count,
            failed_count=failed_count,
            results=results,
            message=f"Отправлено откликов: {applied_count}, пропущено: {skipped_count}, ошибок: {failed_count}",
        )

    except ApiError as e:
        raise HTTPException(status_code=e.status_code, detail=str(e))
    except Exception as e:
        logger.exception("Auto-apply failed")
        raise HTTPException(status_code=500, detail=str(e))
