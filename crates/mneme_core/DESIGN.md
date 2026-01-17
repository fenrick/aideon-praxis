# Mneme Core – Internal Design

## Purpose & scope

Mneme Core is the **contract and domain foundation** for the Mneme storage engine. It provides the
types and trait interfaces that make higher layers portable across storage backends.

This crate exists to keep the storage contract stable while allowing the store implementation
(migrations, database wiring, performance work) to evolve independently.

## Allowed dependencies / frameworks

- Rust 2024 with workspace defaults.
- `serde` for (de)serialization of contract payloads.
- `thiserror` for typed errors.

## Constraints and invariants

- No host/runtime dependencies (no Tauri).
- No direct database access or migration code.
- Public types must be stable and forward-compatible (additive changes preferred).
- All time-first operations use explicit time context (valid time + asserted time + layer + scenario where applicable).

## Public surface (expected)

- ID and reference types used across Mneme APIs.
- Value encoding types for cross-boundary transport.
- Core trait surfaces consumed by host/engines.
- Stable error types that can be mapped into host IPC error envelopes.

## Interactions

- Consumed by `crates/mneme_store` for concrete persistence and migrations.
- Consumed by the host (`crates/desktop`) and engines that need Mneme contract types.

