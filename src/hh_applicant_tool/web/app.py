"""FastAPI application factory."""

import logging
from contextlib import asynccontextmanager
from pathlib import Path
from typing import TYPE_CHECKING

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles

from .routers import (
    auth,
    config,
    contacts,
    employers,
    negotiations,
    resumes,
    settings,
    stats,
    vacancies,
)

if TYPE_CHECKING:
    from hh_applicant_tool.main import HHApplicantTool

logger = logging.getLogger(__name__)

STATIC_DIR = Path(__file__).parent / "static"


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan handler."""
    logger.info("Starting HH Applicant Tool Web Server")
    yield
    logger.info("Shutting down HH Applicant Tool Web Server")


def create_app(tool: "HHApplicantTool") -> FastAPI:
    """Create and configure FastAPI application.

    Args:
        tool: HHApplicantTool instance for dependency injection.

    Returns:
        Configured FastAPI application.
    """
    app = FastAPI(
        title="HH Applicant Tool API",
        description="Web API for HeadHunter job search automation",
        version="1.0.0",
        lifespan=lifespan,
    )

    # Store tool instance in app state for dependency injection
    app.state.tool = tool

    # CORS middleware for development
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # API routers
    app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
    app.include_router(resumes.router, prefix="/api/resumes", tags=["resumes"])
    app.include_router(
        vacancies.router, prefix="/api/vacancies", tags=["vacancies"]
    )
    app.include_router(
        negotiations.router, prefix="/api/negotiations", tags=["negotiations"]
    )
    app.include_router(
        employers.router, prefix="/api/employers", tags=["employers"]
    )
    app.include_router(
        contacts.router, prefix="/api/contacts", tags=["contacts"]
    )
    app.include_router(
        settings.router, prefix="/api/settings", tags=["settings"]
    )
    app.include_router(config.router, prefix="/api/config", tags=["config"])
    app.include_router(stats.router, prefix="/api/stats", tags=["stats"])

    # Serve static files if they exist (production build)
    if STATIC_DIR.exists() and (STATIC_DIR / "index.html").exists():
        # Mount assets folder
        assets_dir = STATIC_DIR / "assets"
        if assets_dir.exists():
            app.mount(
                "/assets",
                StaticFiles(directory=str(assets_dir)),
                name="assets",
            )

        @app.get("/", response_class=FileResponse)
        async def serve_index():
            """Serve the main index.html."""
            return FileResponse(STATIC_DIR / "index.html")

        @app.get("/{full_path:path}")
        async def serve_spa(full_path: str):
            """Serve SPA - return index.html for all non-API routes."""
            # Skip API routes
            if full_path.startswith("api/"):
                return JSONResponse(
                    status_code=404, content={"detail": "Not found"}
                )

            # Check if file exists in static
            file_path = STATIC_DIR / full_path
            if file_path.exists() and file_path.is_file():
                return FileResponse(file_path)

            # Return index.html for SPA routing
            return FileResponse(STATIC_DIR / "index.html")

    else:
        @app.get("/")
        async def root():
            """Root endpoint when no static files."""
            return {
                "message": "HH Applicant Tool API",
                "docs": "/docs",
                "note": "Frontend not built. Run 'npm run build' in frontend/",
            }

    return app
