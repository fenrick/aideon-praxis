# Engine wiring

How the host reaches the engines — through the engine harness, behind trait objects — and how it keeps engines isolated
from one another. For a reader who needs to know how a command gets from a handler to an engine.

The harness itself is the [engine module](../engine/README.md); its place in the crate graph is the
[module dependency map](../../01-architecture/module-dependency-map.md). This file is how the host uses it.

---

## The host is the composition root

The host composes the engines; the engines do not depend on one another
([dependency rules](../../01-architecture/boundary/dependency-rules.md)). It reaches each engine through the
[engine harness](../engine/README.md), which binds each concrete engine to its published trait and produces the trait
objects the host routes to. A handler depends on a **trait object**, never a concrete engine type — so replacing an
engine implementation changes a binding in the harness and leaves the handlers untouched
([ADR-0004](../../06-adrs/ADR-0004-storage-engine-abstraction.md)).

The host holds the engine handles in managed Tauri state (`WorkerState`). An IPC handler receives
`State<'_, WorkerState>`, reaches the correct engine through the harness-assembled trait object, validates the request
envelope, delegates to an `_inner` function, and maps errors to `HostError`
([IPC command surface](./ipc-command-surface.md)). Handlers stay thin; the domain logic is the engine's.

---

## Engine lifecycle hooks

Engines are wired at startup and torn down on shutdown through a fixed hooks sequence
([workspace lifecycle](./workspace-lifecycle.md)):

| Hook                 | When                                                               |
| -------------------- | ------------------------------------------------------------------ |
| `on_host_start`      | Host process start — assemble the harness, build the trait objects |
| `on_workspace_open`  | A workspace is opened — bind engines to its storage                |
| `on_workspace_close` | A workspace is closed — flush and release                          |
| `on_host_shutdown`   | Host process shutdown — orderly teardown                           |

The host orchestrates multi-engine workflows as a single job: the renderer sees one progress stream and one result, even
when the work crossed Praxis, Metis, and Mneme. This is the composition the acyclic rule depends on — cross-engine work
happens here, not by one engine importing another
([ADR-0011](../../06-adrs/ADR-0011-module-taxonomy-and-boundaries.md)).

---

## Bulkhead isolation between engines

The host keeps engines isolated so a fault in one does not cascade. This is a **bulkhead** discipline: each engine's
work runs within its own resource budget and failure scope, and a failure is contained to the command or job that hit it
rather than taking down the host or a sibling engine.

- A job that exhausts its budget halts itself and returns partial coverage; it does not starve other engines' jobs
  ([Metis determinism and bounds](../metis/determinism-and-bounds.md)).
- A failing engine call maps to a `HostError` and is contained to its command; the host stays up and other commands
  continue ([observability](./observability.md)).
- Because engines do not depend on one another, a fault in one cannot propagate through a direct call into another —
  there is no such call ([boundaries](./boundaries.md)).

---

## Cache coherency across engines

Each engine reads the twin through Mneme's projection traits, and the canonical truth is the single workspace op log
([ADR-0001](../../06-adrs/ADR-0001-workspace-is-canonical-authority.md)). Coherency across engines therefore rests on a
single source, not on engines synchronising private caches: a derived result — an artefact result in Praxis, an
analytics result in Metis — is recomputed when a canonical input it depends on changes
([ADR-0027](../../06-adrs/ADR-0027-projection-consistency-model.md)), and a stale derived result is presented as
**Stale** until recomputed ([Documentation Standard §9](../../02-standards/DOCUMENTATION-STANDARD.md)). The host is the
one place that knows when a write has landed, so it is the host that signals invalidation through the event bus
([event bus](./event-bus.md)) — engines do not gossip cache state to one another.

The trade-off: coherency through a single canonical source and recompute-on-change costs recomputation rather than
incremental cross-engine cache patching. The architecture accepts that cost because a shared private cache between
engines would be a coupling the acyclic rule forbids, and because recompute-from-canonical is always correct where a
patched cache can drift.

---

## Related documents

| Document                                                                | What it covers                                          |
| ----------------------------------------------------------------------- | ------------------------------------------------------- |
| [Engine harness](../engine/README.md)                                   | The crate that binds engines behind their traits.       |
| [Module dependency map](../../01-architecture/module-dependency-map.md) | The crate graph and call patterns.                      |
| [Workspace lifecycle](./workspace-lifecycle.md)                         | The lifecycle hooks engines are wired through.          |
| [ADR-0027](../../06-adrs/ADR-0027-projection-consistency-model.md)      | The recompute-on-input-change model coherency rests on. |
| [Observability](./observability.md)                                     | Error containment and circuit breaking.                 |
| [Boundaries](./boundaries.md)                                           | Why no engine depends on another or on the host.        |
