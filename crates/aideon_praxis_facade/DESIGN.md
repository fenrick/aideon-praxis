# Praxis Facade – Design

## Purpose & scope

Praxis Facade offers a cohesive Rust API that orchestrates Praxis Engine, Mneme Core, Chrona, and
Metis so callers (host/server/CLI) can use higher-level operations without wiring details.

## Allowed dependencies / frameworks

- Rust 2024 with workspace defaults.
- `tokio` for async orchestration, `serde`/`serde_json` for DTOs, `thiserror` for error handling,
  `tracing` + `log` facade for observability.
- Depends on engine/analytics/persistence crates through their public traits; no direct DB drivers
  or renderer bindings.

## Anti-goals

- No UI/Tauri code and no renderer-facing APIs.
- No persistence internals; storage stays behind Mneme traits.
- Avoid duplicating logic that belongs in Engine/Chrona/Metis—compose them instead.

## Public surface

- High-level functions/traits that bundle common workflows (e.g., commit-and-materialise,
  state/diff queries with policy guards, multi-engine analytics orchestration).
- DTOs that align with host IPC contracts while keeping implementation details private.

## Evergreen notes

- Fold any host-side orchestration fragments into this crate to keep IPC handlers thin.
- Replace legacy pass-through wrappers with focused, well-named use-case APIs.
