# Aideon Desktop — Documentation

Aideon Desktop is a **desktop-first, local-first, time-first digital-twin modelling
application**. It runs as a Tauri v2 shell (a WebView renderer over a Rust core) and
separates **meaning** (Praxis), **storage** (Mneme), and **runtime** so the UI stays
stable while engines evolve behind typed boundaries.

> **The one idea everything rests on.**
> The canonical project is a **portable workspace folder** — append-only operation
> segments (`model/ops`), schema-as-data (`model/schema`), and immutable content-addressed
> blobs (`objects/sha256`). The runtime database is a **derived cache** under
> `.aideon/runtime/`: delete it and rebuild it from the canonical files with no data loss.
> Operations and temporal facts are canonical; effective graphs, indexes, and projections
> are derived. See [`../03-design/DESKTOP-FIRST-WORKSPACE.md`](../03-design/DESKTOP-FIRST-WORKSPACE.md)
> and [`../06-adrs/ADR-0001-workspace-is-canonical-authority.md`](../06-adrs/ADR-0001-workspace-is-canonical-authority.md).

## Layers

| Folder | Contents |
|---|---|
| [`01-architecture/`](../01-architecture/) | System shape, boundary rules, module dependency map, C4. |
| [`02-standards/`](../02-standards/) | Design governance, ADR format, coding standards, testing, security, getting started. |
| [`03-design/`](../03-design/) | Product behaviour, the workspace thesis, UX contract, design system, artefacts & viewpoints, metamodel packages, signal surfaces, analytics. |
| [`04-contracts/`](../04-contracts/) | Typed IPC contracts, temporal & scenario context, projection & invalidation, accepted-work & events. |
| [`05-modules/`](../05-modules/) | Per-module design: `mneme`, `praxis`, `metis`, `chrona`, `continuum`, `host`. |
| [`06-adrs/`](../06-adrs/) | Architecture decisions — start at [`ADRS.md`](../06-adrs/ADRS.md). |

## Common entry points

- **Architecture & boundaries** → [`01-architecture/ARCHITECTURE-BOUNDARY.md`](../01-architecture/ARCHITECTURE-BOUNDARY.md), [`MODULE-DEPENDENCY-MAP.md`](../01-architecture/MODULE-DEPENDENCY-MAP.md).
- **The product design spine** → [`03-design/DESIGN.md`](../03-design/DESIGN.md), then [`UX-DESIGN.md`](../03-design/UX-DESIGN.md) and [`ARTEFACTS-AND-VIEWPOINTS.md`](../03-design/ARTEFACTS-AND-VIEWPOINTS.md).
- **Storage & the temporal model** → [`05-modules/mneme/`](../05-modules/mneme/README.md), [`04-contracts/TEMPORAL-AND-SCENARIO-CONTEXT.md`](../04-contracts/TEMPORAL-AND-SCENARIO-CONTEXT.md).
- **The IPC boundary** → [`04-contracts/CONTRACTS-AND-SCHEMAS.md`](../04-contracts/CONTRACTS-AND-SCHEMAS.md), [`05-modules/host/README.md`](../05-modules/host/README.md).
- **Making a durable decision** → [`02-standards/DESIGN-GOVERNANCE.md`](../02-standards/DESIGN-GOVERNANCE.md), then write an ADR per [`02-standards/ADR-FORMAT.md`](../02-standards/ADR-FORMAT.md).

## How the docs relate

Design lineage flows downward and each layer realises the one above it:

```
01-architecture  →  boundaries & module graph
02-standards     →  how decisions are made and code is held to standard
03-design        →  what the product is and how it behaves
04-contracts     →  the typed shapes that bind renderer ↔ core ↔ engines
05-modules       →  how each engine expresses the design
06-adrs          →  the decisions that fix the invariants
```
