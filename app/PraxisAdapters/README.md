# @aideon/PraxisAdapters – Aideon Suite module

## Purpose

Praxis Adapters defines the TypeScript interfaces and contracts that form the UI boundary for graph,
storage, and worker access. Implementations are backend-agnostic and must not introduce backend
specifics into the renderer boundary.

## Responsibilities

- Provide `GraphAdapter`/`MutableGraphAdapter` for time-sliced graph access.
- Surface meta-model information via `MetaModelProvider` so UIs can build forms dynamically.
- Define `StorageAdapter` for snapshot persistence.
- Define `WorkerClient` and related job DTOs for analytics and temporal jobs.
- Offer utilities like `ensureIsoDateTime` to normalise timestamp inputs.

## Relationships

- **Depends on:** TypeScript toolchain, `@aideon/PraxisDtos` for shared DTOs.
- **Used by:** Praxis Canvas, Praxis Desktop, host/worker adapter implementations.

## Running and testing

- Typecheck (suite-wide): `pnpm run node:typecheck`
- Tests (suite-wide, including adapters): `pnpm run node:test`

In module-specific tests, provide stub/fake implementations (e.g. `DevelopmentMemoryGraph`) to
exercise UI flows without a real backend.

## Design and architecture

Praxis Adapters encode the adapter pattern described in `Architecture-Boundary.md` for Graph,
Storage, and Worker boundaries. For suite-wide schema and meta-model details, see `docs/DESIGN.md`
and `docs/meta/README.md`.

## Related global docs

- Suite design and meta-model: `docs/DESIGN.md`, `docs/meta/README.md`
- Architecture and layering: `Architecture-Boundary.md`
- Coding standards: `docs/CODING_STANDARDS.md`
