# Praxis Host – Internal Design

## Overview

Praxis Host is the Tauri-based entrypoint for the desktop app. It owns window lifecycle, OS
integration, capabilities, and the typed IPC surface for calling engine crates from React/Svelte
renderers.

## Internal structure

- Tauri app/bootstrap code and window creation.
- Command registration and routing to engine traits.
- Capability configuration and CSP (see `tauri.conf.json` and capabilities files).
- Logging and basic health checks exposed to the renderer.

## Data model and APIs

- Defines command DTOs and error types that cross the host boundary.
- Maps IPC commands to engine/facade methods (Praxis Engine, Chrona, Metis, Continuum, Mneme).

## Interactions

- Renderer ↔ Host: typed IPC commands, no HTTP.
- Host ↔ Engines: in-process trait calls in desktop mode; future remote adapters must preserve the
  same contracts.

## Constraints and invariants

- No open TCP ports in desktop mode.
- Renderer cannot bypass the typed command surface.
- PII redaction and security posture follow `docs/tauri-capabilities.md` and
  `docs/tauri-client-server-pivot.md`.

## Implementation notes

- Errors: propagate engine `PraxisError` into lightweight host codes; keep mapping in one place
  (`HostError`).
- Logging: standard `log`/`tracing` macros; avoid custom loggers.
- Async/concurrency: use `tokio` primitives; no bespoke threading.
- Paths: obtain app data dir via `tauri::path`; avoid hardcoded filesystem paths.
