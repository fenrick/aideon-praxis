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
    asOf: str = Field(..., description="ISO date string for the time-slice")
    scenario: str | None = None
    confidence: float | None = None


class StateAtResponse(BaseModel):
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
    log.debug("worker: ping")
    return {"status": "pong"}


@app.post("/state_at", response_model=StateAtResponse)
async def state_at_route(body: StateAtRequest) -> StateAtResponse:
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
    path.parent.mkdir(parents=True, exist_ok=True)


def run_uds(sock_path: str) -> None:
    """Run uvicorn binding to a Unix domain socket (desktop mode)."""
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
