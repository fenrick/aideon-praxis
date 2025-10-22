# Worker (Python sidecar)

Parent: #95 · Sub-issue: #103

This package contains the analytics/time-slicing worker used by the desktop app.
It runs as a supervised sidecar over UDS/Named Pipes (no TCP ports in desktop mode).

## Build a local binary (optional)

- Requires Python 3.13 and `uv` (for dev) or system Python with `pyinstaller`.
- From repo root, run:

```
yarn worker:bundle
```

This uses `scripts/build-worker-binary.mjs` to invoke PyInstaller and copies the
result into `packages/app/extra/worker/` for local dev packaging.

## CLI

Entrypoint: `packages/worker/src/aideon_worker/cli.py`

- Prints `READY` when started.
- Accepts line-based commands:
  - `ping` → `pong`
  - `state_at {json}` → JSON result
- Also supports JSON-RPC 2.0 on stdin/stdout.

## Security

- Desktop mode: no open TCP ports; communication over UDS/Named Pipes only.
- PII: exports must apply redaction in upstream paths; tests cover this where applicable.
