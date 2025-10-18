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
from typing import Any, cast

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


def _jsonrpc_handle(msg: str) -> str | None:
    """Handle a single JSON-RPC 2.0 message; return a JSON string or None.

    Accepts one JSON object per line. Unknown or invalid messages return an error.
    """
    try:
        data_raw = json.loads(msg)
    except Exception as exc:  # noqa: BLE001
        return json.dumps(
            {
                "jsonrpc": "2.0",
                "error": {"code": -32700, "message": "Parse error", "data": str(exc)},
                "id": None,
            }
        )

    if not isinstance(data_raw, dict):
        return None  # not JSON-RPC; let legacy handlers try

    data: dict[str, Any] = cast(dict[str, Any], data_raw)
    if data.get("jsonrpc") != "2.0":
        return None
    # JSON-RPC notifications are requests without an 'id' member.
    # Per spec, servers MUST NOT reply to notifications.
    has_id: bool = "id" in data
    req_id: object = data.get("id")
    method_raw: object = data.get("method")
    method: str | None = method_raw if isinstance(method_raw, str) else None
    raw_params: object = data.get("params") or {}
    params: dict[str, Any] = (
        cast(dict[str, Any], raw_params) if isinstance(raw_params, dict) else {}
    )

    # Notification: execute if applicable but do not return a response
    if not has_id:
        try:
            if method in ("ping", "ping.v1"):
                _ = "pong"  # no-op; ensure symmetric behavior
            elif method in ("state_at", "temporal.state_at.v1"):
                args = _parse_state_at_params(params)
                _ = state_at(args)
            # Unknown method or any errors are intentionally silent for notifications
        except Exception as exc:  # noqa: BLE001
            _ = str(exc)
        return None

    out: dict[str, object]
    try:
        if method in ("ping", "ping.v1"):
            out = {"jsonrpc": "2.0", "id": req_id, "result": "pong"}
        elif method in ("state_at", "temporal.state_at.v1"):
            args = _parse_state_at_params(params)
            res = state_at(args)
            out = {"jsonrpc": "2.0", "id": req_id, "result": cast(object, res)}
        else:
            out = {
                "jsonrpc": "2.0",
                "id": req_id,
                "error": {"code": -32601, "message": "Method not found"},
            }
    except ValueError as exc:
        out = {
            "jsonrpc": "2.0",
            "id": req_id,
            "error": {"code": -32602, "message": "Invalid params", "data": str(exc)},
        }
    except Exception as exc:  # noqa: BLE001
        out = {
            "jsonrpc": "2.0",
            "id": req_id,
            "error": {"code": -32000, "message": "Internal error", "data": str(exc)},
        }
    return json.dumps(out)


def main() -> int:
    """Run the minimal line-based worker protocol loop.

    Reads commands from stdin and writes responses to stdout. Keeps the
    desktop app local-first with no open TCP ports.
    """
    print("READY", flush=True)
    for line in sys.stdin:
        msg = line.strip()
        if not msg:
            continue
        # Prefer JSON-RPC if line starts with '{'
        if msg.startswith("{"):
            out = _jsonrpc_handle(msg)
            if out is not None:
                print(out, flush=True)
            # Do not fall back to legacy handlers for JSON-shaped input
            # This avoids emitting responses for JSON-RPC notifications
            # and keeps behavior strict for the JSON-RPC path.
            continue

        if msg == "ping":
            print("pong", flush=True)
            continue
        # naive protocol: "state_at {json}"
        if msg.startswith("state_at "):
            payload = msg[len("state_at ") :]
            try:
                data_raw = json.loads(payload)
                # Map and validate
                mapping: dict[str, Any] = (
                    cast(dict[str, Any], data_raw) if isinstance(data_raw, dict) else {}
                )
                args = _parse_state_at_params(mapping)
                res = state_at(args)
                print(json.dumps(res), flush=True)
            except Exception as exc:  # noqa: BLE001
                print(json.dumps({"error": str(exc)}), flush=True)
            continue
        print(json.dumps({"error": "unknown command"}), flush=True)
    return 0


if __name__ == "__main__":  # pragma: no cover
    raise SystemExit(main())
