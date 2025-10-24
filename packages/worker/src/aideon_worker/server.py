"""FastAPI server for the Aideon Python worker.

This module exposes a minimal RPC surface over a Unix Domain Socket (UDS) so the
desktop host can reach the worker without opening any TCP ports. It implements a
single temporal endpoint (``/state_at``) used by the UI to validate the wiring.

Security posture:
- Desktop mode binds to a filesystem socket via UDS only (no TCP listeners).
- Payloads are small and typed; errors are returned as HTTP 400 with details.

See also AGENTS.md for the architecture and boundary guardrails.
"""

from __future__ import annotations

import asyncio
import logging
import os
import pathlib
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

import uvicorn
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field

from .temporal import StateAtArgs, state_at

log = logging.getLogger("aideon.worker")


class StateAtRequest(BaseModel):
    """Request body for ``/state_at``.

    Field names follow the public API contract used by the host and renderer.
    """

    asOf: str = Field(..., description="ISO date string for the time-slice")
    scenario: str | None = None
    confidence: float | None = None


class StateAtResponse(BaseModel):
    """Response shape for ``/state_at``.

    Mirrors :class:`StateAtRequest` and includes simple graph stats used by the
    UI while the full model lands.
    """

    asOf: str
    scenario: str | None
    confidence: float | None
    nodes: int
    edges: int


@asynccontextmanager
async def _lifespan(_: FastAPI) -> AsyncIterator[None]:  # pragma: no cover - trivial hooks
    log.info("worker: starting up")
    try:
        yield None
    finally:
        log.info("worker: shutting down")


app = FastAPI(title="Aideon Worker", version="0.1.0", lifespan=_lifespan)


@app.get("/ping")
async def ping() -> dict[str, str]:
    """Health endpoint used by the host during startup.

    Returns a simple ``{"status": "pong"}`` payload and logs at debug level.
    """
    log.debug("worker: ping")
    return {"status": "pong"}


@app.post("/state_at", response_model=StateAtResponse)
async def state_at_route(body: StateAtRequest) -> StateAtResponse:
    """Compute a time-sliced view of the graph.

    Delegates to :func:`aideon_worker.temporal.state_at` and translates any
    exceptions to ``HTTP 400`` with a concise error string.
    """
    log.info("worker: state_at request asOf=%s scenario=%s", body.asOf, body.scenario)
    try:
        args = StateAtArgs(as_of=body.asOf, scenario=body.scenario, confidence=body.confidence)
        result = state_at(args)
        log.info("worker: state_at result nodes=%s edges=%s", result["nodes"], result["edges"])
        return StateAtResponse.model_validate(result)
    except Exception as exc:  # noqa: BLE001
        log.exception("worker: state_at failed: %s", exc)
        raise HTTPException(status_code=400, detail=str(exc))


def _ensure_parent(path: pathlib.Path) -> None:
    """Ensure the parent directory exists for the provided path."""
    path.parent.mkdir(parents=True, exist_ok=True)


def run_uds(sock_path: str) -> None:
    """Run the FastAPI app bound to a Unix Domain Socket path.

    This preserves the "no open ports" guarantee in desktop mode. The host
    process communicates using Hyper + hyperlocal over the same socket.
    """
    _ensure_parent(pathlib.Path(sock_path))
    log.info("worker: binding UDS %s", sock_path)
    config = uvicorn.Config(app, uds=sock_path, log_config=None, access_log=False)
    server = uvicorn.Server(config)
    asyncio.run(server.serve())


def main() -> int:  # pragma: no cover - tiny wrapper
    logging.basicConfig(level=os.environ.get("AIDEON_WORKER_LOG", "INFO"))
    sock = os.environ.get("AIDEON_WORKER_SOCK", os.path.join(".aideon", "worker.sock"))
    run_uds(sock)
    return 0


if __name__ == "__main__":  # pragma: no cover
    raise SystemExit(main())
