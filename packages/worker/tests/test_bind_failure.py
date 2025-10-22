import pytest


@pytest.mark.skip(reason="Bind-failure simulation to be implemented (see issue #72)")
def test_worker_exits_nonzero_on_bind_failure() -> None:
    """Placeholder: simulate a taken UDS path and assert non-zero exit + helpful error.

    Plan:
    - Pre-create a UNIX socket path (or directory) at a temp location.
    - Launch the worker pointing to that path.
    - Capture exit code and stderr; assert non-zero with actionable message.
    """
    assert True
