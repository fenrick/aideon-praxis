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

from .temporal import StateAtArgs, state_at


def main() -> int:
    print("READY", flush=True)
    for line in sys.stdin:
        msg = line.strip()
        if not msg:
            continue
        if msg == "ping":
            print("pong", flush=True)
            continue
        # naive protocol: "state_at {json}"
        if msg.startswith("state_at "):
            payload = msg[len("state_at ") :]
            try:
                data = json.loads(payload)
                res = state_at(StateAtArgs(**data))
                print(json.dumps(res), flush=True)
            except Exception as exc:  # noqa: BLE001
                print(json.dumps({"error": str(exc)}), flush=True)
            continue
        print(json.dumps({"error": "unknown command"}), flush=True)
    return 0


if __name__ == "__main__":  # pragma: no cover
    raise SystemExit(main())
