"""Statistics router."""

import logging
from datetime import datetime, timedelta

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from ..dependencies import StorageDep, ToolDep

router = APIRouter()
logger = logging.getLogger(__name__)


class DashboardStats(BaseModel):
    """Dashboard statistics."""

    total_resumes: int = 0
    active_resumes: int = 0
    total_negotiations: int = 0
    active_negotiations: int = 0
    invitations: int = 0
    discarded: int = 0
    total_employers: int = 0
    blacklisted_employers: int = 0
    total_contacts: int = 0
    total_vacancies_applied: int = 0
    negotiations_today: int = 0
    negotiations_this_week: int = 0


class NegotiationsByState(BaseModel):
    """Negotiations count by state."""

    response: int = 0
    invitation: int = 0
    discard: int = 0
    hired: int = 0


class StatsOverview(BaseModel):
    """Full statistics overview."""

    dashboard: DashboardStats
    negotiations_by_state: NegotiationsByState
    recent_activity: list[dict]


@router.get("/dashboard", response_model=DashboardStats)
async def get_dashboard_stats(
    storage: StorageDep, tool: ToolDep
) -> DashboardStats:
    """Get dashboard statistics."""
    try:
        # Count resumes
        resumes = list(storage.resumes.find())
        total_resumes = len(resumes)
        active_resumes = len([r for r in resumes if r.status_id == "active"])

        # Count negotiations
        negotiations = list(storage.negotiations.find())
        total_negotiations = len(negotiations)

        # Count by state
        active_states = {"response", "invitation"}
        active_negotiations = len(
            [n for n in negotiations if n.state in active_states]
        )
        invitations = len([n for n in negotiations if n.state == "invitation"])
        discarded = len([n for n in negotiations if n.state == "discard"])

        # Count negotiations by time
        now = datetime.now()
        today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
        week_start = today_start - timedelta(days=today_start.weekday())

        negotiations_today = len(
            [
                n
                for n in negotiations
                if n.created_at and n.created_at >= today_start
            ]
        )
        negotiations_this_week = len(
            [
                n
                for n in negotiations
                if n.created_at and n.created_at >= week_start
            ]
        )

        # Count employers
        employers = list(storage.employers.find())
        total_employers = len(employers)
        blacklisted_ids = set(tool.get_blacklisted())
        blacklisted_employers = len(
            [e for e in employers if str(e.id) in blacklisted_ids]
        )

        # Count contacts
        contacts = list(storage.vacancy_contacts.find())
        total_contacts = len(contacts)

        # Count applied vacancies (from negotiations)
        vacancy_ids = set(n.vacancy_id for n in negotiations if n.vacancy_id)
        total_vacancies_applied = len(vacancy_ids)

        return DashboardStats(
            total_resumes=total_resumes,
            active_resumes=active_resumes,
            total_negotiations=total_negotiations,
            active_negotiations=active_negotiations,
            invitations=invitations,
            discarded=discarded,
            total_employers=total_employers,
            blacklisted_employers=blacklisted_employers,
            total_contacts=total_contacts,
            total_vacancies_applied=total_vacancies_applied,
            negotiations_today=negotiations_today,
            negotiations_this_week=negotiations_this_week,
        )
    except Exception as e:
        logger.exception("Failed to get dashboard stats")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/negotiations-by-state", response_model=NegotiationsByState)
async def get_negotiations_by_state(storage: StorageDep) -> NegotiationsByState:
    """Get negotiations count by state."""
    try:
        negotiations = list(storage.negotiations.find())

        return NegotiationsByState(
            response=len([n for n in negotiations if n.state == "response"]),
            invitation=len([n for n in negotiations if n.state == "invitation"]),
            discard=len([n for n in negotiations if n.state == "discard"]),
            hired=len([n for n in negotiations if n.state == "hired"]),
        )
    except Exception as e:
        logger.exception("Failed to get negotiations by state")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/overview", response_model=StatsOverview)
async def get_stats_overview(
    storage: StorageDep, tool: ToolDep
) -> StatsOverview:
    """Get full statistics overview."""
    try:
        dashboard = await get_dashboard_stats(storage, tool)
        by_state = await get_negotiations_by_state(storage)

        # Get recent activity (last 10 negotiations)
        negotiations = list(storage.negotiations.find())
        negotiations.sort(
            key=lambda n: n.created_at or datetime.min, reverse=True
        )
        recent = negotiations[:10]

        recent_activity = [
            {
                "id": n.id,
                "state": n.state,
                "vacancy_id": n.vacancy_id,
                "created_at": (
                    n.created_at.isoformat() if n.created_at else None
                ),
            }
            for n in recent
        ]

        return StatsOverview(
            dashboard=dashboard,
            negotiations_by_state=by_state,
            recent_activity=recent_activity,
        )
    except Exception as e:
        logger.exception("Failed to get stats overview")
        raise HTTPException(status_code=500, detail=str(e))
