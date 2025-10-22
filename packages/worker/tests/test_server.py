from __future__ import annotations

import asyncio
import logging

import httpx

from aideon_worker.server import app


def test_ping_and_state_at(caplog: logging.LogCaptureFixture) -> None:
    async def _run() -> None:
        caplog.set_level(logging.INFO)
        transport = httpx.ASGITransport(app=app)
        async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
            r1 = await client.get("/ping")
            assert r1.status_code == 200 and r1.json()["status"] == "pong"

            r2 = await client.post("/state_at", json={"asOf": "2025-01-01"})
            assert r2.status_code == 200
            body = r2.json()
            assert body["asOf"] == "2025-01-01" and body["nodes"] == 0 and body["edges"] == 0

    asyncio.run(_run())

    # Check that some informative logs were emitted
    messages = "\n".join(rec.message for rec in caplog.records)
    assert "state_at request" in messages
    assert "state_at result" in messages
