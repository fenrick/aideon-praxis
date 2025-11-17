# Praxis DTOs – Aideon Suite module

## Purpose

Praxis DTOs defines shared TypeScript data-transfer objects used across Praxis Canvas, Praxis
Desktop, and host/worker adapters. It keeps IPC and worker contracts consistent and strongly typed.

## Responsibilities

- Define DTOs for temporal state/diff snapshots, meta-model documents, and analytics/job payloads.
- Provide type-safe shapes for Praxis adapters (`@aideon/PraxisAdapters`) and React components.
- Keep frontend-facing types aligned with Rust DTOs from Mneme/Praxis Engine.

## Relationships

- **Depends on:** TypeScript toolchain and shared linting/typecheck setup.
- **Used by:** Praxis Canvas, Praxis Desktop, Praxis Adapters, and tests/fixtures.

## Running and testing

- Build DTOs: `pnpm --filter @aideon/PraxisDtos run build`
- Tests (if present): `pnpm --filter @aideon/PraxisDtos test`

DTOs are also typechecked as part of the suite-wide command: `pnpm run node:typecheck`.

## Design and architecture

For suite-wide schema and meta-model design, see `docs/DESIGN.md`, `docs/meta/README.md`, and
`docs/data/README.md`. If this package gains additional logic (codegen, versioning), extend
documentation in `app/PraxisDtos/DESIGN.md`.
