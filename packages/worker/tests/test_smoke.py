from aideon_worker import temporal


def test_state_at_stub_returns_shape():
    out = temporal.state_at(temporal.StateAtArgs(as_of="2025-01-01"))
    assert set(out.keys()) == {"asOf", "scenario", "confidence", "nodes", "edges"}
    assert out["asOf"] == "2025-01-01"
