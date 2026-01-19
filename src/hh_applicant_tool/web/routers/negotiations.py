"""Negotiations (chats) router."""

import logging
from typing import Annotated

from fastapi import APIRouter, HTTPException, Query

from hh_applicant_tool.api.errors import ApiError

from ..dependencies import ApiClientDep, StorageDep, ToolDep
from ..schemas.common import PaginatedResponse
from ..schemas.negotiations import (
    Message,
    MessageListResponse,
    Negotiation,
    NegotiationBrief,
    NegotiationDeleteResponse,
    NegotiationState,
    SendMessageRequest,
    SendMessageResponse,
)

router = APIRouter()
logger = logging.getLogger(__name__)


def _negotiation_to_brief(data: dict) -> NegotiationBrief:
    """Convert negotiation dict to brief schema."""
    state = data.get("state", {})
    vacancy = data.get("vacancy", {})
    employer = vacancy.get("employer", {})
    salary = vacancy.get("salary")
    area = vacancy.get("area")

    return NegotiationBrief(
        id=data.get("id"),
        state=(
            NegotiationState(id=state.get("id", ""), name=state.get("name", ""))
            if state
            else None
        ),
        vacancy={
            "id": vacancy.get("id"),
            "name": vacancy.get("name", ""),
            "area": {"id": area["id"], "name": area["name"]} if area else None,
            "salary": (
                {
                    "from": salary.get("from"),
                    "to": salary.get("to"),
                    "currency": salary.get("currency"),
                }
                if salary
                else None
            ),
            "employer": (
                {
                    "id": employer.get("id"),
                    "name": employer.get("name", ""),
                    "trusted": employer.get("trusted", False),
                    "alternate_url": employer.get("alternate_url"),
                }
                if employer
                else None
            ),
            "alternate_url": vacancy.get("alternate_url"),
        }
        if vacancy
        else None,
        created_at=data.get("created_at"),
        updated_at=data.get("updated_at"),
        has_updates=data.get("has_updates", False),
        url=data.get("url"),
    )


@router.get("", response_model=PaginatedResponse[NegotiationBrief])
async def list_negotiations(
    tool: ToolDep,
    api_client: ApiClientDep,
    storage: StorageDep,
    status: Annotated[str | None, Query()] = None,
    page: Annotated[int, Query(ge=0)] = 0,
    per_page: Annotated[int, Query(ge=1, le=100)] = 20,
    order_by: Annotated[str, Query()] = "updated_at",
) -> PaginatedResponse[NegotiationBrief]:
    """Get list of negotiations (job applications/chats)."""
    try:
        params = {
            "page": page,
            "per_page": per_page,
            "order_by": order_by,
        }
        if status:
            params["status"] = status

        response = api_client.get("/negotiations", **params)
        items = response.get("items", [])
        found = response.get("found", 0)
        pages = response.get("pages", 0)

        # Save to storage
        from hh_applicant_tool.storage.models.negotiation import NegotiationModel

        models = [NegotiationModel.from_api(n) for n in items]
        storage.negotiations.save_batch(models)

        return PaginatedResponse(
            items=[_negotiation_to_brief(n) for n in items],
            total=found,
            page=page,
            per_page=per_page,
            pages=pages,
        )
    except ApiError as e:
        raise HTTPException(status_code=e.status_code, detail=str(e))
    except Exception as e:
        logger.exception("Failed to list negotiations")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{negotiation_id}", response_model=Negotiation)
async def get_negotiation(
    negotiation_id: int, api_client: ApiClientDep
) -> Negotiation:
    """Get detailed negotiation information."""
    try:
        data = api_client.get(f"/negotiations/{negotiation_id}")
        brief = _negotiation_to_brief(data)

        return Negotiation(
            **brief.model_dump(),
            resume_id=data.get("resume", {}).get("id"),
            messages_url=data.get("messages_url"),
        )
    except ApiError as e:
        raise HTTPException(status_code=e.status_code, detail=str(e))
    except Exception as e:
        logger.exception("Failed to get negotiation")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{negotiation_id}/messages", response_model=MessageListResponse)
async def get_messages(
    negotiation_id: int, api_client: ApiClientDep
) -> MessageListResponse:
    """Get messages in a negotiation chat."""
    try:
        response = api_client.get(f"/negotiations/{negotiation_id}/messages")
        items = response.get("items", [])

        messages = [
            Message(
                id=m.get("id", ""),
                text=m.get("text", ""),
                created_at=m.get("created_at"),
                author=m.get("author"),
                read=m.get("read", False),
                state=m.get("state"),
                address=m.get("address"),
            )
            for m in items
        ]

        return MessageListResponse(
            messages=messages,
            found=response.get("found", len(messages)),
        )
    except ApiError as e:
        raise HTTPException(status_code=e.status_code, detail=str(e))
    except Exception as e:
        logger.exception("Failed to get messages")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{negotiation_id}/messages", response_model=SendMessageResponse)
async def send_message(
    negotiation_id: int,
    request: SendMessageRequest,
    api_client: ApiClientDep,
) -> SendMessageResponse:
    """Send a message in a negotiation chat."""
    try:
        api_client.post(
            f"/negotiations/{negotiation_id}/messages",
            message=request.message,
        )
        return SendMessageResponse(
            success=True,
            message="Message sent successfully",
        )
    except ApiError as e:
        raise HTTPException(status_code=e.status_code, detail=str(e))
    except Exception as e:
        logger.exception("Failed to send message")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{negotiation_id}", response_model=NegotiationDeleteResponse)
async def delete_negotiation(
    negotiation_id: int, api_client: ApiClientDep
) -> NegotiationDeleteResponse:
    """Cancel/delete a negotiation (withdraw application)."""
    try:
        api_client.delete(f"/negotiations/active/{negotiation_id}")
        return NegotiationDeleteResponse(
            success=True,
            message="Negotiation cancelled successfully",
        )
    except ApiError as e:
        raise HTTPException(status_code=e.status_code, detail=str(e))
    except Exception as e:
        logger.exception("Failed to delete negotiation")
        raise HTTPException(status_code=500, detail=str(e))
