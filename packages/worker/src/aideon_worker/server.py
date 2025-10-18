from __future__ import annotations

import asyncio
import sys
from typing import Any

from fastapi import FastAPI, Query
from pydantic import BaseModel
import uvicorn

from .temporal import StateAtArgs, state_at


class StateAtResponse(BaseModel):
    asOf: str
    scenario: str | None
    confidence: float | None
    nodes: int
    edges: int


app = FastAPI(title="Aideon Praxis Worker RPC", version="0.1.0")


@app.on_event("startup")
async def on_startup() -> None:  # pragma: no cover - simple banner
    print("READY", flush=True)


@app.get("/api/v1/state_at", response_model=StateAtResponse)
async def http_state_at(
    as_of: str = Query(..., alias="as_of"),
    scenario: str | None = Query(None),
    confidence: float | None = Query(None),
) -> dict[str, Any]:
    args = StateAtArgs(as_of=as_of, scenario=scenario, confidence=confidence)
    return state_at(args)


def main(argv: list[str] | None = None) -> int:
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

