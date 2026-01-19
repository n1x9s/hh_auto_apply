"""Web server operation for HH Applicant Tool."""

from __future__ import annotations

import argparse
import logging
import sys
from typing import TYPE_CHECKING

from ..main import BaseNamespace, BaseOperation

if TYPE_CHECKING:
    from ..main import HHApplicantTool


logger = logging.getLogger(__package__)


class Namespace(BaseNamespace):
    host: str
    port: int
    reload: bool
    open_browser: bool


class Operation(BaseOperation):
    """Запуск веб-интерфейса"""

    __aliases__ = ("web", "server")

    def setup_parser(self, parser: argparse.ArgumentParser) -> None:
        parser.add_argument(
            "--host",
            "-H",
            default="127.0.0.1",
            help="Host to bind to (default: 127.0.0.1)",
        )
        parser.add_argument(
            "--port",
            "-p",
            type=int,
            default=8080,
            help="Port to listen on (default: 8080)",
        )
        parser.add_argument(
            "--reload",
            "-r",
            action="store_true",
            help="Enable auto-reload for development",
        )
        parser.add_argument(
            "--no-browser",
            dest="open_browser",
            action="store_false",
            default=True,
            help="Don't open browser automatically",
        )

    def run(self, tool: HHApplicantTool) -> int | None:
        try:
            import uvicorn
        except ImportError:
            print(
                "Web interface dependencies not installed.\n"
                "Install with: poetry install --extras web\n"
                "Or: pip install fastapi uvicorn[standard]",
                file=sys.stderr,
            )
            return 1

        from ..web import create_app

        app = create_app(tool)
        args: Namespace = tool.args

        url = f"http://{args.host}:{args.port}"
        print(f"Starting web server at {url}")
        print(f"API documentation: {url}/docs")
        print("Press Ctrl+C to stop")

        # Open browser if requested
        if args.open_browser:
            import webbrowser
            import threading

            def open_browser():
                import time
                time.sleep(1)  # Wait for server to start
                webbrowser.open(url)

            threading.Thread(target=open_browser, daemon=True).start()

        try:
            uvicorn.run(
                app,
                host=args.host,
                port=args.port,
                reload=args.reload,
                log_level="info",
            )
        except KeyboardInterrupt:
            print("\nShutting down...")

        return 0
