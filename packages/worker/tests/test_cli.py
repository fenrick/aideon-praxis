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
JSONRPC_NOT_FOUND_ID = 3
JSONRPC_INVALID_PARAMS_ID = 4
ERR_METHOD_NOT_FOUND = -32601
ERR_INVALID_PARAMS = -32602
ERR_PARSE_ERROR = -32700


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


def test_jsonrpc_method_not_found():
    outputs = run_cli_lines(
        [
            f'{{"jsonrpc":"2.0","id":{JSONRPC_NOT_FOUND_ID},"method":"unknown_method"}}',
        ]
    )
    assert outputs[0] == "READY"
    resp = json.loads(outputs[1])
    assert resp["jsonrpc"] == "2.0" and resp["id"] == JSONRPC_NOT_FOUND_ID
    assert resp["error"]["code"] == ERR_METHOD_NOT_FOUND


def test_jsonrpc_invalid_params_missing_asof():
    outputs = run_cli_lines(
        [
            f'{{"jsonrpc":"2.0","id":{JSONRPC_INVALID_PARAMS_ID},"method":"state_at","params":{{}}}}',
        ]
    )
    assert outputs[0] == "READY"
    resp = json.loads(outputs[1])
    assert resp["jsonrpc"] == "2.0" and resp["id"] == JSONRPC_INVALID_PARAMS_ID
    assert resp["error"]["code"] == ERR_INVALID_PARAMS


def test_jsonrpc_parse_error():
    # send malformed JSON as JSON-RPC
    outputs = run_cli_lines(['{"jsonrpc"'])
    assert outputs[0] == "READY"
    resp = json.loads(outputs[1])
    assert resp["jsonrpc"] == "2.0" and resp["id"] is None
    assert resp["error"]["code"] == ERR_PARSE_ERROR


def test_jsonrpc_notifications_are_silent():
    # Notifications: requests without an 'id' MUST NOT elicit a response
    outputs = run_cli_lines(
        [
            '{"jsonrpc":"2.0","method":"ping"}',
            '{"jsonrpc":"2.0","method":"state_at","params":{"asOf":"2025-01-01"}}',
            '{"jsonrpc":"2.0","method":"unknown"}',
        ]
    )
    # Only the initial READY line should be printed
    assert outputs == ["READY"]
