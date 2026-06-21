# Roadmap and build sequence

What "done" means for Aideon, what the minimum viable product is, and the order the modules are built in. For a reader who needs to know what to build first, what each milestone must prove before the next begins, and why the sequence is shaped the way it is. This is the roadmap the module-introducing ADRs (0012–0015, 0028–0032) refer to when they say a module "joins the roadmap".

> **Honest state.** This is design intent. The implemented set today is the seven engines in the [module map](../03-design/module-map.md) (Praxis, Mneme, Metis, Chrona, Continuum, Host, Engine); the nine planned modules are design intent until their crate exists. The milestones below are **capability gates, not dates** — each is defined by what must be demonstrably true before the next begins, so the sequence holds regardless of calendar.

---

## The minimum viable product

The MVP is the smallest build that delivers the product's one idea: a **desktop-first, local-first, time-first digital twin** a single architect can author, time-travel, and reason over, with no server and no account.

An MVP build satisfies all of:

- **A workspace is a portable folder.** Create, open, and close a workspace whose canonical state is append-only operations + schema-as-data + content-addressed blobs; the runtime database is a rebuildable cache ([ADR-0001](../06-adrs/ADR-0001-workspace-is-canonical-authority.md), [ADR-0002](../06-adrs/ADR-0002-portable-workspace-format.md)).
- **Meaning is authored against a metamodel.** A user creates entities and relationships that validate against the seed metamodel ([metamodel/](../03-design/metamodel/README.md)); invalid writes are rejected at the boundary, not stored.
- **Every read is time-and-scenario qualified.** The same query answered at two `as-of` points, or in two scenarios, returns the resolved effective state for that viewpoint ([temporal-and-scenario/](../04-contracts/temporal-and-scenario/README.md)).
- **At least one artefact renders.** A view or catalogue executes against the twin and renders deterministically, with integrity surfaced ([artefacts/](../03-design/artefacts/README.md)).
- **The boundary holds.** Renderer reaches engines only through typed IPC; no renderer HTTP, no open ports in desktop mode ([host/](../05-modules/host/README.md)).

What the MVP explicitly excludes: collaboration/sync, AI assistance, connectors and automated discovery, governance/RBAC, and reporting/publishing. Each is a later milestone owned by a planned module. The MVP is single-user, offline, and authored by hand.

---

## Build sequence

The order is fixed by the acyclic engine dependency graph ([module-dependency-map](../01-architecture/module-dependency-map.md), axiom 6 of [design-axioms](../03-design/design-axioms.md)): a module is built only after everything it depends on can carry it. Foundation before meaning, meaning before time and analytics, the single-user core before anything multi-user or assistive.

| Milestone | Theme                 | Modules                               | Exit criteria (what must be true to start the next)                                                                                                                                                                                                                                                                              |
| --------- | --------------------- | ------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **M0**    | Foundation            | Host, Mneme, Engine                   | A portable workspace opens and round-trips: delete the runtime cache and rebuild it from canonical files with equivalent projections ([ADR-0001](../06-adrs/ADR-0001-workspace-is-canonical-authority.md), [ADR-0027](../06-adrs/ADR-0027-projection-consistency-model.md)). Typed IPC and capabilities enforced; no open ports. |
| **M1**    | Meaning               | Praxis                                | A user authors entities/relationships that validate against the metamodel; invalid writes rejected at the boundary; metamodel compiles deterministically and is stored as data ([metamodel-ownership](../05-modules/praxis/metamodel-ownership.md)).                                                                             |
| **M2**    | Time                  | Chrona                                | `state-at` and `diff` resolve correctly across valid time, asserted time, layers, and scenarios for the seed dataset ([resolution-rules](../04-contracts/temporal-and-scenario/resolution-rules.md)).                                                                                                                            |
| **M3**    | Artefacts + analytics | Praxis (artefact execution), Metis    | One artefact of each implemented family renders from the twin; bounded centrality/impact run within their documented limits and report Bounded honestly ([algorithms-and-bounds](../05-modules/metis/algorithms-and-bounds.md)). **End of MVP.**                                                                                 |
| **M4**    | Interchange           | Pylon, Continuum                      | Deterministic, reviewable import (ArchiMate Open Exchange, CSV/Excel) lands facts through the op log; durable jobs survive restart with idempotent replay ([deterministic-reviewable-import](../05-modules/pylon/deterministic-reviewable-import.md), [ADR-0018](../06-adrs/ADR-0018-idempotency-and-deduplication.md)).         |
| **M5**    | Reach                 | Lexis, Kerux, Sophia                  | Viewpoint-aware search; deterministic reporting/publishing with redaction by default; AI assistance behind guardrails with all output classified Generated ([ADR-0014](../06-adrs/ADR-0014-ai-assistance-and-generated-provenance-sophia.md)).                                                                                   |
| **M6**    | Scale-out             | Koinon, Themis, Aegis, Skopos, Kairos | Multi-user sync with convergent merge ([ADR-0005](../06-adrs/ADR-0005-sync-and-conflict-model.md)); identity/RBAC/approvals/audit; continuous reality-sync into the `actual` layer; investment/portfolio planning.                                                                                                               |

The full ordering within a milestone follows each module's dependency edges; a planned module's README states the boundary it will occupy and the ADR that introduces it ([module-map](../03-design/module-map.md), planned modules).

Each MVP milestone has an executable **build contract** under [`build-contracts/`](../build-contracts/README.md) — [M0](../build-contracts/M0-foundation.md), [M1](../build-contracts/M1-meaning.md), [M2](../build-contracts/M2-time.md), [M3](../build-contracts/M3-artefacts.md) — pinning its exact schemas, fixtures, and exit tests, joined by the [golden journey](../build-contracts/golden-journey.md). Open conflicts, contradictions, and coverage gaps across the milestones are tracked in the [defect register](../build-contracts/defect-register.md).

> **Accepted-work two-tier split (defect D1).** Continuum (M4) owns the full accepted-work orchestration, but a **minimal accepted-work core** (host-local job runner + readiness/`RunEvent` events + backpressure) is owned by **M0**, because M0's workspace rebuild must run as accepted work. M4 supersedes the core without changing the `AcceptedJob`/`RunEvent` contract. Continuum's row below is the orchestration tier, not the M0 core.

---

## How a milestone is judged complete

A milestone is complete when its exit criteria are demonstrable on the seed dataset ([`baseline.yaml`](../data/base/baseline.yaml)) and held by tests, not when its code merely compiles. Each criterion above maps to an assertion: a workspace round-trip test (M0), a metamodel-validation rejection test (M1), a resolution golden test (M2), an artefact render + a Bounded-analytics test (M3), and so on. The Definition of Done in [`CONTRIBUTING.md`](../../CONTRIBUTING.md) governs each merge within a milestone; this roadmap governs the order of the milestones themselves.

---

## Related documents

| Document                                                             | What it covers                                                    |
| -------------------------------------------------------------------- | ----------------------------------------------------------------- |
| [Module map](../03-design/module-map.md)                             | The implemented-vs-planned split and per-module ownership.        |
| [Module delivery order](../03-design/module-delivery-order.md)       | The dependency-driven ordering rationale for the planned modules. |
| [Module dependency map](../01-architecture/module-dependency-map.md) | The authoritative acyclic engine graph the sequence rests on.     |
| [ADR-0011](../06-adrs/ADR-0011-module-taxonomy-and-boundaries.md)    | The module taxonomy and the earns-its-own-module test.            |
| [CONTRIBUTING.md](../../CONTRIBUTING.md)                             | The per-change Definition of Done within each milestone.          |
