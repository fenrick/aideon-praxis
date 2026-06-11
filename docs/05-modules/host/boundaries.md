# Boundaries

What the host depends on and what may never depend on it. For a reader checking whether a proposed dependency is allowed.

The full crate graph is the [module dependency map](../../01-architecture/module-dependency-map.md); the directions in prose are [dependency rules](../../01-architecture/boundary/dependency-rules.md). This file is the host-facing view.

---

## The host is the composition root

The host (`aideon_desktop`) sits at the top of the dependency graph: it depends on the engines, and the engines do not depend on it ([dependency rules](../../01-architecture/boundary/dependency-rules.md)). It reaches the engines through the [engine harness](../engine/README.md), depending on the harness's **traits**, not on any engine's concrete type ([engine wiring](./engine-wiring.md)).

| The host depends on      | Why                                                     |
| ------------------------ | ------------------------------------------------------- |
| `aideon_engine` (traits) | The harness it programmes against to reach every engine |
| Tauri runtime, plugins   | Windowing, IPC, events, capabilities                    |
| Generated DTO types      | The wire shapes shared with the renderer                |

---

## What may never depend on the host

- **No engine → host.** A module never depends on `aideon_desktop`. An engine that imported the host would invert the composition direction and create the `continuum → desktop → continuum` class of cycle ([module dependency map](../../01-architecture/module-dependency-map.md)).
- **No engine → renderer.** The host owns event publication; an engine does not reach the renderer ([event bus](./event-bus.md)).
- **No engine → Tauri or WebView APIs.** Engines are pure domain crates, testable without the host runtime.
- **No renderer → engine or storage crate directly.** The renderer depends only on the host's IPC surface — Tauri commands and events, no Rust crate import, no local HTTP ([process and trust boundary](./process-and-trust-boundary.md)).

The renderer's only dependency is the host IPC surface; the host's only path to the engines is the harness. These two facts together are what make the host the single trust boundary and the single composition root.

---

## The acyclic rule from the host's side

> The host depends on modules; modules do not depend on the host. The engine graph below the host is acyclic ([ADR-0011](../../06-adrs/ADR-0011-module-taxonomy-and-boundaries.md)).

The host is the place cross-engine work is composed, precisely so engines never call one another ([engine wiring](./engine-wiring.md)). Cargo rejects a dependency cycle at build time, and the crate split keeps shared contracts below their consumers, so the rule holds by construction ([dependency rules](../../01-architecture/boundary/dependency-rules.md)).

The trade-off: every cross-engine workflow costs a composition in the host rather than a direct engine call. The architecture accepts that because it is what keeps each engine independently testable and replaceable, and the host the one auditable seam where side effects happen.

---

## Related documents

| Document                                                                | What it covers                                            |
| ----------------------------------------------------------------------- | --------------------------------------------------------- |
| [Module dependency map](../../01-architecture/module-dependency-map.md) | The full crate graph and allowed/forbidden edges.         |
| [Dependency rules](../../01-architecture/boundary/dependency-rules.md)  | The dependency directions and the acyclic invariant.      |
| [Engine harness](../engine/README.md)                                   | The traits the host depends on to reach engines.          |
| [Engine wiring](./engine-wiring.md)                                     | How the host composes engines through the harness.        |
| [Process and trust boundary](./process-and-trust-boundary.md)           | The renderer's single dependency on the host IPC surface. |
| [ADR-0011](../../06-adrs/ADR-0011-module-taxonomy-and-boundaries.md)    | Module taxonomy and the host-as-composition-root rule.    |
