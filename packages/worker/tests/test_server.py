from typing import Any

from fastapi.testclient import TestClient

from aideon_worker.server import app, main


def client() -> TestClient:
    return TestClient(app)


def test_health_ok() -> None:
    with client() as c:
        resp = c.get("/health")
        assert resp.status_code == 200
        assert resp.json() == {"status": "ok"}


def test_state_at_ok() -> None:
    with client() as c:
        resp = c.get("/api/v1/state_at", params={"as_of": "2025-01-01"})
        assert resp.status_code == 200
        data: dict[str, Any] = resp.json()
        # Response uses camelCase alias
        assert data["asOf"] == "2025-01-01"
        assert data["nodes"] == 0 and data["edges"] == 0


def test_state_at_missing_asof_returns_422() -> None:
    with client() as c:
        resp = c.get("/api/v1/state_at")
        assert resp.status_code == 422


def test_state_at_invalid_confidence_returns_422() -> None:
    with client() as c:
        resp = c.get(
            "/api/v1/state_at",
            params={"as_of": "2025-01-01", "confidence": "not-a-number"},
        )
        assert resp.status_code == 422


def test_main_requires_uds_path() -> None:
    # Running without --uds should exit with code 2 and print error
    assert main([]) == 2


def test_main_runs_with_uds_and_exits_zero(monkeypatch) -> None:  # type: ignore[no-untyped-def]
    called = {"ran": False}

    def fake_run(coro):  # type: ignore[no-untyped-def]
        called["ran"] = True

    # Patch asyncio.run so we don't actually start a server
    import aideon_worker.server as srv

    monkeypatch.setattr(srv.asyncio, "run", fake_run)  # type: ignore[arg-type]
    # Provide a dummy UDS path; server won't actually bind due to fake_run
    # Use a harmless path; server won't bind because run() is patched
    code = main(["--uds", ".aideon-test.sock"])
    assert code == 0 and called["ran"] is True
