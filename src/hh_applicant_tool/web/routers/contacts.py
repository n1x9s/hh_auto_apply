"""Contacts router."""

import csv
import io
import logging
from typing import Annotated

from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import StreamingResponse

from ..dependencies import StorageDep
from ..schemas.common import PaginatedResponse
from ..schemas.employers import Contact

router = APIRouter()
logger = logging.getLogger(__name__)


@router.get("", response_model=PaginatedResponse[Contact])
async def list_contacts(
    storage: StorageDep,
    search: Annotated[str | None, Query()] = None,
    employer_id: Annotated[int | None, Query()] = None,
    page: Annotated[int, Query(ge=0)] = 0,
    per_page: Annotated[int, Query(ge=1, le=100)] = 20,
) -> PaginatedResponse[Contact]:
    """Get list of contacts from local database."""
    try:
        filters = {}
        if employer_id:
            filters["employer_id"] = employer_id

        contacts = list(storage.vacancy_contacts.find(**filters))

        # Filter by search if specified
        if search:
            search_lower = search.lower()
            contacts = [
                c
                for c in contacts
                if (c.full_name and search_lower in c.full_name.lower())
                or (c.email and search_lower in c.email.lower())
                or (
                    c.employer_name and search_lower in c.employer_name.lower()
                )
            ]

        # Pagination
        total = len(contacts)
        start = page * per_page
        end = start + per_page
        paginated = contacts[start:end]

        items = [
            Contact(
                id=getattr(c, "id", None),
                vacancy_id=c.vacancy_id,
                vacancy_name=c.vacancy_name,
                employer_id=c.employer_id,
                employer_name=c.employer_name,
                full_name=c.full_name,
                email=c.email,
                phones=c.phones if hasattr(c, "phones") else None,
                created_at=getattr(c, "created_at", None),
            )
            for c in paginated
        ]

        return PaginatedResponse(
            items=items,
            total=total,
            page=page,
            per_page=per_page,
            pages=(total + per_page - 1) // per_page,
        )
    except Exception as e:
        logger.exception("Failed to list contacts")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/export")
async def export_contacts(
    storage: StorageDep,
    format: Annotated[str, Query()] = "csv",
    employer_id: Annotated[int | None, Query()] = None,
) -> StreamingResponse:
    """Export contacts to CSV format."""
    try:
        filters = {}
        if employer_id:
            filters["employer_id"] = employer_id

        contacts = list(storage.vacancy_contacts.find(**filters))

        if format != "csv":
            raise HTTPException(
                status_code=400, detail="Only CSV format is supported"
            )

        # Create CSV in memory
        output = io.StringIO()
        writer = csv.writer(output)

        # Header
        writer.writerow(
            [
                "Vacancy ID",
                "Vacancy Name",
                "Employer ID",
                "Employer Name",
                "Full Name",
                "Email",
                "Phones",
            ]
        )

        # Data rows
        for contact in contacts:
            phones_str = ""
            if hasattr(contact, "phones") and contact.phones:
                phones_str = "; ".join(
                    [
                        p.get("formatted", p.get("number", ""))
                        for p in contact.phones
                        if isinstance(p, dict)
                    ]
                )

            writer.writerow(
                [
                    contact.vacancy_id,
                    contact.vacancy_name or "",
                    contact.employer_id or "",
                    contact.employer_name or "",
                    contact.full_name or "",
                    contact.email or "",
                    phones_str,
                ]
            )

        output.seek(0)

        return StreamingResponse(
            iter([output.getvalue()]),
            media_type="text/csv",
            headers={
                "Content-Disposition": "attachment; filename=contacts.csv"
            },
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Failed to export contacts")
        raise HTTPException(status_code=500, detail=str(e))
