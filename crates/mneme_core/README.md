# Mneme Core – Aideon Suite module

## Purpose

Mneme Core defines the storage-engine **domain contracts** shared by the host and engines:
identifiers, value types, error types, and trait surfaces. It is deliberately storage-backend
agnostic.

## Responsibilities

- Define Mneme domain types (IDs, value encodings, layer/time primitives).
- Define stable error types and contract-friendly error mapping.
- Define core traits used by higher-level engines and the host.

## Non-responsibilities

- No database drivers, migrations, or SQL/SeaORM integration.
- No Tauri/host IPC code.
- No renderer/UI dependencies.

## Running and testing

- Rust tests (crate only): `cargo test -p aideon_mneme_core`
- Workspace checks: `pnpm run host:lint && pnpm run host:check`

## Design and architecture

See `crates/mneme_core/DESIGN.md`.
