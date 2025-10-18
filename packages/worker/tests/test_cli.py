import io
import json
from contextlib import redirect_stdout

from aideon_worker import cli


def run_cli_lines(lines: list[str]) -> list[str]:
    # Simulate stdin by patching sys.stdin temporarily
    out = io.StringIO()
    # Feed lines with trailing newlines as the worker loop expects
    input_stream = io.StringIO("\n".join(lines) + "\n")
    # Monkeypatch within the module under test
    cli.sys.stdin = input_stream  # type: ignore[attr-defined]
    with redirect_stdout(out):
        cli.main()
    # splitlines keeps order; first line is READY
    return out.getvalue().strip().splitlines()


def test_cli_ping_and_state_at():
    outputs = run_cli_lines(["ping", 'state_at {"asOf":"2025-01-01"}'])
    assert outputs[0] == "READY"
    assert outputs[1] == "pong"
    payload = json.loads(outputs[2])
    assert payload["asOf"] == "2025-01-01"
    assert payload["nodes"] == 0 and payload["edges"] == 0


def test_cli_unknown_and_invalid_json():
    # Unknown command yields error JSON
    out1 = run_cli_lines(["unknown"])
    assert out1[-1].startswith("{") and "unknown command" in out1[-1]

    # Invalid JSON handled gracefully
    out2 = run_cli_lines(["state_at not-a-json"])
    assert out2[-1].startswith("{") and "error" in out2[-1]


JSONRPC_PING_ID = 1
JSONRPC_STATE_ID = 2


def test_jsonrpc_ping_and_state_at():
    outputs = run_cli_lines(
        [
            f'{{"jsonrpc":"2.0","id":{JSONRPC_PING_ID},"method":"ping"}}',
            f'{{"jsonrpc":"2.0","id":{JSONRPC_STATE_ID},"method":"state_at","params":{{"asOf":"2025-01-01"}}}}',
        ]
    )
    assert outputs[0] == "READY"
    # JSON-RPC ping
    pong = json.loads(outputs[1])
    assert pong["jsonrpc"] == "2.0" and pong["id"] == JSONRPC_PING_ID and pong["result"] == "pong"
    # JSON-RPC state_at
    resp = json.loads(outputs[2])
    assert resp["jsonrpc"] == "2.0" and resp["id"] == JSONRPC_STATE_ID
    result = resp["result"]
    assert result["asOf"] == "2025-01-01" and result["nodes"] == 0 and result["edges"] == 0
