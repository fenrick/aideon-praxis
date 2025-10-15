from aideon_worker.temporal import StateAtArgs, state_at


def test_state_at_returns_expected_shape():
    args = StateAtArgs(as_of="2025-01-01", scenario=None, confidence=None)
    res = state_at(args)
    assert res["asOf"] == "2025-01-01"
    assert res["nodes"] == 0 and res["edges"] == 0
