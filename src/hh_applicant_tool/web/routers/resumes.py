"""Resumes router."""

import logging

from fastapi import APIRouter, HTTPException

from hh_applicant_tool.api.errors import ApiError

from ..dependencies import ApiClientDep, StorageDep, ToolDep
from ..schemas.resumes import (
    Resume,
    ResumePublishAllResponse,
    ResumePublishResponse,
    ResumeStatus,
)

router = APIRouter()
logger = logging.getLogger(__name__)


def _resume_to_schema(resume_data: dict) -> Resume:
    """Convert resume data to schema."""
    status_data = resume_data.get("status", {})
    counters = resume_data.get("counters", {})

    return Resume(
        id=resume_data.get("id", ""),
        title=resume_data.get("title", ""),
        url=resume_data.get("url"),
        alternate_url=resume_data.get("alternate_url"),
        status=(
            ResumeStatus(
                id=status_data.get("id", ""),
                name=status_data.get("name", ""),
            )
            if status_data
            else None
        ),
        can_publish_or_update=resume_data.get("can_publish_or_update", False),
        total_views=counters.get("total_views", 0),
        new_views=counters.get("new_views", 0),
        created_at=resume_data.get("created_at"),
        updated_at=resume_data.get("updated_at"),
    )


@router.get("", response_model=list[Resume])
async def list_resumes(tool: ToolDep, storage: StorageDep) -> list[Resume]:
    """Get list of user resumes."""
    try:
        resumes = tool.get_resumes()

        # Save to storage
        from hh_applicant_tool.storage.models.resume import ResumeModel

        models = [ResumeModel.from_api(r) for r in resumes]
        storage.resumes.save_batch(models)

        return [_resume_to_schema(r) for r in resumes]
    except ApiError as e:
        raise HTTPException(status_code=e.status_code, detail=str(e))
    except Exception as e:
        logger.exception("Failed to list resumes")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{resume_id}/publish", response_model=ResumePublishResponse)
async def publish_resume(
    resume_id: str, api_client: ApiClientDep
) -> ResumePublishResponse:
    """Publish/update a resume to raise it in search results."""
    try:
        api_client.post(f"/resumes/{resume_id}/publish")
        return ResumePublishResponse(
            success=True,
            message="Resume published successfully",
            resume_id=resume_id,
        )
    except ApiError as e:
        if "too_early" in str(e).lower():
            return ResumePublishResponse(
                success=False,
                message="Too early to update resume",
                resume_id=resume_id,
            )
        raise HTTPException(status_code=e.status_code, detail=str(e))
    except Exception as e:
        logger.exception("Failed to publish resume")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/publish-all", response_model=ResumePublishAllResponse)
async def publish_all_resumes(
    tool: ToolDep, api_client: ApiClientDep
) -> ResumePublishAllResponse:
    """Publish all resumes that can be updated."""
    published = []
    failed = []

    try:
        resumes = tool.get_resumes()

        for resume in resumes:
            resume_id = resume.get("id")
            if not resume_id:
                continue

            if not resume.get("can_publish_or_update", False):
                failed.append(resume_id)
                continue

            try:
                api_client.post(f"/resumes/{resume_id}/publish")
                published.append(resume_id)
            except ApiError as e:
                logger.warning(f"Failed to publish resume {resume_id}: {e}")
                failed.append(resume_id)

        return ResumePublishAllResponse(
            success=len(published) > 0,
            published=published,
            failed=failed,
            message=f"Published {len(published)} resumes, {len(failed)} failed",
        )
    except ApiError as e:
        raise HTTPException(status_code=e.status_code, detail=str(e))
    except Exception as e:
        logger.exception("Failed to publish all resumes")
        raise HTTPException(status_code=500, detail=str(e))
