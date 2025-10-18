"""FastAPI server entrypoint for the worker (UDS only).

Exposes versioned HTTP endpoints for desktop mode over Unix domain sockets.
No TCP ports are opened in desktop mode.
"""

from __future__ import annotations

import asyncio
import sys
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from typing import Any

import uvicorn
from fastapi import FastAPI, Query
from pydantic import BaseModel, ConfigDict, Field

from .temporal import StateAtArgs, state_at


class StateAtResponse(BaseModel):
    """HTTP response model for Temporal.StateAt.

    Uses camelCase field aliases for JSON compatibility while keeping
    snake_case attribute names in Python.
    """

    model_config = ConfigDict(populate_by_name=True)

    as_of: str = Field(alias="asOf", serialization_alias="asOf")
    scenario: str | None
    confidence: float | None
    nodes: int
    edges: int


@asynccontextmanager
async def lifespan(_: FastAPI) -> AsyncIterator[None]:  # pragma: no cover - simple banner
    """Startup/shutdown hooks.

    Prints a simple readiness marker on startup.
    """
    print("READY", flush=True)
    yield


app = FastAPI(title="Aideon Praxis Worker RPC", version="0.1.0", lifespan=lifespan)


class HealthResponse(BaseModel):
    """Simple readiness/health response."""

    status: str = "ok"


@app.get("/health", response_model=HealthResponse)
async def health() -> HealthResponse:  # pragma: no cover - trivial
    """Return health status for readiness checks."""
    return HealthResponse()


# Startup banner handled in lifespan above


@app.get("/api/v1/state_at", response_model=StateAtResponse)
async def http_state_at(
    as_of: str = Query(..., alias="as_of"),
    scenario: str | None = Query(None),
    confidence: float | None = Query(None),
) -> dict[str, Any]:
    """Handle the Temporal.StateAt query over HTTP.

    Parameters mirror the worker CLI/JSON-RPC API.
    """
    args = StateAtArgs(as_of=as_of, scenario=scenario, confidence=confidence)
    return state_at(args)


def main(argv: list[str] | None = None) -> int:
    """Run the Uvicorn server bound to a UDS path.

    Expects `--uds <path>` in argv. Returns non-zero on errors.
    """
    argv = argv or sys.argv[1:]
    # very small args parser: --uds <path>
    uds_path: str | None = None
    if "--uds" in argv:
        idx = argv.index("--uds")
        if idx + 1 < len(argv):
            uds_path = argv[idx + 1]
    if not uds_path:
        print("--uds <path> is required", file=sys.stderr)
        return 2

    config = uvicorn.Config(app=app, uds=uds_path, log_level="error")
    server = uvicorn.Server(config)
    try:
        asyncio.run(server.serve())
    except KeyboardInterrupt:  # pragma: no cover
        return 130
    return 0


if __name__ == "__main__":  # pragma: no cover
    raise SystemExit(main())
