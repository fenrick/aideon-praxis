# Aideon Suite

Aideon Suite is a **time-first digital twin platform** delivered as a secure, offline-first desktop
application. It separates **meaning**, **storage**, and **runtime**, so the UI stays stable while
engines evolve behind typed boundaries.

## What makes it different

- **Time-first facts**: valid time + asserted time, Plan/Actual layers, scenario overlays.
- **Artefact-driven UX**: views, catalogues, matrices, maps, reports/pages.
- **Desktop as platform**: typed IPC, job orchestration, least privilege, no renderer HTTP.

## Modules

| Name                   | Path                | Responsibility                                                                |
| ---------------------- | ------------------- | ----------------------------------------------------------------------------- |
| Aideon Desktop         | `app/AideonDesktop` | React renderer, design system, workspace surfaces, adapters, DTOs.            |
| Aideon Host            | `crates/desktop`    | Tauri runtime, IPC, capabilities, jobs, workspace lifecycle.                  |
| Praxis Engine          | `crates/praxis`     | Metamodel, task APIs, artefact execution, integrity, analytics orchestration. |
| Mneme Core             | `crates/mneme`      | Op log, bi-temporal facts, schema-as-data, projections, processing.           |
| Metis Analytics        | `crates/metis`      | Analytics algorithms and ranking jobs.                                        |
| Chrona Visualisation   | `crates/chrona`     | Time/scenario UX primitives and temporal helpers.                             |
| Continuum Orchestrator | `crates/continuum`  | Orchestration, scheduling, connectors.                                        |

## Documentation

Docs use a numbered tree. **Start at [`docs/00-index/README.md`](docs/00-index/README.md).**

- Desktop-first thesis: [`docs/03-design/DESKTOP-FIRST-WORKSPACE.md`](docs/03-design/DESKTOP-FIRST-WORKSPACE.md)
- Architecture decisions: [`docs/06-adrs/ADRS.md`](docs/06-adrs/ADRS.md) — the canonical
  authority is the **portable workspace**, not a database file (see
  [ADR-0001](docs/06-adrs/ADR-0001-workspace-is-canonical-authority.md)).
- Boundaries: [`docs/01-architecture/ARCHITECTURE-BOUNDARY.md`](docs/01-architecture/ARCHITECTURE-BOUNDARY.md)
- Suite overview: [`docs/03-design/DESIGN.md`](docs/03-design/DESIGN.md) ·
  UX contract: [`docs/03-design/UX-DESIGN.md`](docs/03-design/UX-DESIGN.md)
- Module design: per-module docs under [`docs/05-modules/`](docs/05-modules/)
  (`mneme`, `praxis`, `metis`, `chrona`, `continuum`, `host`), with deeper crate notes in
  each `crates/*/DESIGN.md`.
- Contracts: [`docs/04-contracts/`](docs/04-contracts/) — typed IPC, temporal & scenario
  context, projection & invalidation, accepted-work & events.

## Getting started

See [`docs/02-standards/GETTING-STARTED.md`](docs/02-standards/GETTING-STARTED.md).
For available scripts, use `pnpm -w run`.
