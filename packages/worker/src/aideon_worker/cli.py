"""Worker CLI entrypoint.

Implements a minimal line-based protocol over stdin/stdout to keep the
desktop app fully local and offline. No TCP ports are opened in desktop mode.

Commands:
    ping
        Health check; responds with "pong".
    state_at {json}
        Runs `Temporal.StateAt` with JSON args and prints a JSON response.
"""

from __future__ import annotations

import json
import sys
from collections.abc import Mapping
from typing import Any, NamedTuple, cast

from .temporal import StateAtArgs, state_at


def _parse_state_at_params(params: Mapping[str, Any]) -> StateAtArgs:
    """Validate and map external camelCase params to `StateAtArgs`.

    Returns a fully-typed `StateAtArgs` or raises `ValueError` on invalid input.
    """
    as_of_val = params.get("asOf")
    if not isinstance(as_of_val, str) or not as_of_val:
        raise ValueError("Invalid params: 'asOf' (str) is required")

    scenario_val = params.get("scenario")
    if scenario_val is not None and not isinstance(scenario_val, str):
        raise ValueError("Invalid params: 'scenario' must be a string if provided")

    confidence_val = params.get("confidence")
    if confidence_val is not None and not isinstance(confidence_val, int | float):
        raise ValueError("Invalid params: 'confidence' must be a number if provided")

    return StateAtArgs(
        as_of=as_of_val,
        scenario=scenario_val,
        confidence=float(confidence_val) if confidence_val is not None else None,
    )


def _jsonrpc_error(code: int, message: str, req_id: object, data: str | None = None) -> str:
    payload: dict[str, Any] = {
        "jsonrpc": "2.0",
        "id": req_id,
        "error": {"code": code, "message": message},
    }
    if data is not None:
        payload["error"]["data"] = data
    return json.dumps(payload)


def _jsonrpc_dispatch(method: str | None, params: dict[str, Any]) -> object:
    if method in ("ping", "ping.v1"):
        return "pong"
    if method in ("state_at", "temporal.state_at.v1"):
        args = _parse_state_at_params(params)
        return cast(object, state_at(args))
    raise KeyError("Method not found")


class _RpcRequest(NamedTuple):
    has_id: bool
    req_id: object
    method: str | None
    params: dict[str, Any]


def _parse_jsonrpc(msg: str) -> dict[str, Any] | None | str:
    """Parse JSON; return dict for JSON-RPC 2.0, None for not-JSON-RPC, or error string."""
    try:
        data_raw = json.loads(msg)
    except Exception as exc:  # noqa: BLE001
        return str(exc)
    if not isinstance(data_raw, dict) or data_raw.get("jsonrpc") != "2.0":
        return None
    return cast(dict[str, Any], data_raw)


def _extract_request(data: dict[str, Any]) -> _RpcRequest:
    has_id = "id" in data
    req_id: object = data.get("id")
    method = data.get("method") if isinstance(data.get("method"), str) else None
    raw_params: object = data.get("params") or {}
    params = cast(dict[str, Any], raw_params) if isinstance(raw_params, dict) else {}
    return _RpcRequest(has_id=has_id, req_id=req_id, method=method, params=params)


def _handle_notification(method: str | None, params: dict[str, Any]) -> None:
    try:
        _ = _jsonrpc_dispatch(method, params)
    except Exception as exc:  # noqa: BLE001
        _ = str(exc)


def _handle_request(method: str | None, params: dict[str, Any], req_id: object) -> str:
    try:
        result = _jsonrpc_dispatch(method, params)
        return json.dumps({"jsonrpc": "2.0", "id": req_id, "result": result})
    except ValueError as exc:
        return _jsonrpc_error(-32602, "Invalid params", req_id, str(exc))
    except KeyError:
        return _jsonrpc_error(-32601, "Method not found", req_id)
    except Exception as exc:  # noqa: BLE001
        return _jsonrpc_error(-32000, "Internal error", req_id, str(exc))


def _jsonrpc_handle(msg: str) -> str | None:
    """Handle a single JSON-RPC 2.0 message; return a JSON string or None."""
    parsed = _parse_jsonrpc(msg)
    if isinstance(parsed, str):  # parse error
        return _jsonrpc_error(-32700, "Parse error", None, parsed)
    if parsed is None:  # not JSON-RPC or wrong version
        return None
    req = _extract_request(parsed)
    if not req.has_id:  # Notification: never reply
        _handle_notification(req.method, req.params)
        return None
    return _handle_request(req.method, req.params, req.req_id)


def _handle_legacy(msg: str) -> str | None:
    if msg == "ping":
        return "pong"
    if msg.startswith("state_at "):
        payload = msg[len("state_at ") :]
        try:
            data_raw = json.loads(payload)
            mapping: dict[str, Any] = (
                cast(dict[str, Any], data_raw) if isinstance(data_raw, dict) else {}
            )
            args = _parse_state_at_params(mapping)
            res = state_at(args)
            return json.dumps(res)
        except Exception as exc:  # noqa: BLE001
            return json.dumps({"error": str(exc)})
    return json.dumps({"error": "unknown command"})


def main() -> int:
    """Run the minimal line-based worker protocol loop."""
    print("READY", flush=True)
    for line in sys.stdin:
        msg = line.strip()
        if not msg:
            continue
        if msg.startswith("{"):
            out = _jsonrpc_handle(msg)
            if out is not None:
                print(out, flush=True)
            # Never fall back to legacy for JSON-shaped input
            continue
        out = _handle_legacy(msg)
        if out is not None:
            print(out, flush=True)
    return 0


if __name__ == "__main__":  # pragma: no cover
    raise SystemExit(main())
