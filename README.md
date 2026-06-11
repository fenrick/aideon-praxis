# Aideon

<p align="center">
  <img src="public/brand/logo-horizontal.png" alt="Aideon" width="440" />
</p>

Aideon is a **desktop-first, local-first, time-first digital-twin** application, built with **Tauri v2** (Rust core) and **Next.js** (React renderer). It separates **meaning**, **storage**, and **runtime** so the UI stays stable while the engines evolve behind typed boundaries.

## What makes it different

- **Time-first facts** — valid time + asserted time, Plan/Actual layers, scenario overlays.
- **Workspace is canonical** — the portable workspace folder (append-only ops + schema-as-data
  - content-addressed blobs) is the source of truth; the runtime database is a derived, rebuildable cache.
- **Artefact-driven UX** — views, catalogues, matrices, maps, reports, and pages, executed at an explicit time and scenario.
- **Host is the security boundary** — the renderer is untrusted; all side effects flow through typed Tauri IPC. No renderer filesystem access, no local HTTP server.

## Quickstart

```bash
pnpm install
pnpm tauri dev      # run the app (starts the Next dev server, then the Tauri shell)
pnpm tauri build    # build a distributable
```

Frontend-only and Rust-only workflows:

```bash
pnpm dev            # Next dev server on :1420
pnpm build          # static export to ./out
pnpm typecheck      # tsc --noEmit
pnpm test           # vitest
pnpm run host:check # cargo check (Rust workspace)
pnpm run host:test  # cargo test
```

## Project structure

```text
.
├── app/            # Next.js routes (App Router)
├── src/            # renderer source — design system, workspaces, adapters, DTOs
├── public/         # static assets (brand logos; fonts are self-hosted via @fontsource)
├── src-tauri/      # Tauri host crate — IPC, capabilities, window/jobs, tauri.conf.json
├── crates/         # Rust engine crates (Cargo workspace members)
├── docs/           # numbered documentation tree (see below)
└── tests/          # unit (vitest) + e2e / webdriver
```

The Tauri CLI runs zero-config from the repo root: `src-tauri/` is the default crate location, and the frontend is wired through `frontendDist` / `devUrl` / `beforeDevCommand` in `src-tauri/tauri.conf.json`.

## Modules

| Module | Path | Responsibility |
| --- | --- | --- |
| Renderer | `app/`, `src/` | React renderer, design system, workspace surfaces, IPC adapters, DTOs. |
| Host | `src-tauri/` | Tauri runtime, IPC, capabilities, jobs, workspace lifecycle. |
| Praxis | `crates/praxis` | Metamodel, task APIs, artefact execution, integrity, analytics orchestration. |
| Mneme | `crates/mneme`, `crates/mneme_core`, `crates/mneme_store` | Op log, bi-temporal facts, schema-as-data, projections, embedded store. |
| Metis | `crates/metis` | Analytics algorithms and ranking jobs. |
| Chrona | `crates/chrona` | Time/scenario interpretation and temporal UX primitives. |
| Continuum | `crates/continuum` | Orchestration, scheduling, connectors (local durable executor). |

Tauri is confined to `src-tauri/`; the engine crates are host-agnostic and depend only on each other and shared contracts (`src-tauri → crates/*`, one direction).

## Documentation

Docs use a numbered tree — **start at [`docs/00-index/README.md`](docs/00-index/README.md).**

- Desktop-first thesis: [`docs/03-design/DESKTOP-FIRST-WORKSPACE.md`](docs/03-design/DESKTOP-FIRST-WORKSPACE.md)
- Architecture decisions: [`docs/06-adrs/ADRS.md`](docs/06-adrs/ADRS.md) — the canonical authority is the portable workspace, not a database file ([ADR-0001](docs/06-adrs/ADR-0001-workspace-is-canonical-authority.md)).
- Boundaries: [`docs/01-architecture/ARCHITECTURE-BOUNDARY.md`](docs/01-architecture/ARCHITECTURE-BOUNDARY.md) and the [module dependency map](docs/01-architecture/MODULE-DEPENDENCY-MAP.md).
- Design spine: [`docs/03-design/DESIGN.md`](docs/03-design/DESIGN.md) · UX contract: [`docs/03-design/UX-DESIGN.md`](docs/03-design/UX-DESIGN.md).
- Per-module design under [`docs/05-modules/`](docs/05-modules/), with deeper notes in each `crates/*/DESIGN.md`.
- Contracts: [`docs/04-contracts/`](docs/04-contracts/) — typed IPC, temporal & scenario context, projection & invalidation, accepted-work & events.

See [`docs/02-standards/GETTING-STARTED.md`](docs/02-standards/GETTING-STARTED.md) for setup and [`CONTRIBUTING.md`](CONTRIBUTING.md) for contribution guidelines.
