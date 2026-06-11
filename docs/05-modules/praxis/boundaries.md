# Boundaries

What Praxis depends on, what depends on Praxis, and the acyclic rule that keeps the dependency one-directional. For a reader checking whether a proposed dependency is allowed.

The full crate graph and its enforcement are in the [module dependency map](../../01-architecture/module-dependency-map.md); the directions and the acyclic invariant in prose are in [dependency rules](../../01-architecture/boundary/dependency-rules.md). This file is the Praxis-facing view.

---

## What Praxis depends on

| Dependency            | Why                                                                                                               | Allowed surface                              |
| --------------------- | ----------------------------------------------------------------------------------------------------------------- | -------------------------------------------- |
| `aideon_mneme`        | Storage: entity persistence, time-aware traversal, projection edges, op-log read/append, effective-schema queries | The published storage facade traits only     |
| Shared contract types | Temporal request/response shapes, stable identifiers, metamodel keys                                              | Neutral contract crate, below both consumers |

Praxis reads and writes the twin through Mneme's published traits; it never generates SQL, owns no database driver, and holds no canonical truth ([metamodel ownership](./metamodel-ownership.md)). The canonical store is the workspace op log ([ADR-0001](../../06-adrs/ADR-0001-workspace-is-canonical-authority.md)); Mneme's derived runtime is a rebuildable cache, not the datastore.

---

## What Praxis does _not_ depend on

- **Not Metis, Chrona, or Continuum implementations.** Praxis does not call a sibling engine's concrete type. Heavy graph computation is delegated to Metis, but the composition routes through the host, not through a Praxis→Metis import ([dependency rules](../../01-architecture/boundary/dependency-rules.md)). This is the acyclic invariant: no engine depends on another engine.
- **Not the Tauri host (`aideon_desktop`).** A module never depends on the host. The host depends on Praxis's traits, via the [engine harness](../engine/README.md), not the reverse.
- **Not the renderer or any WebView API.** Praxis returns artefact results as data; the renderer renders them ([artefact execution boundary](../../01-architecture/boundary/artefact-execution-boundary.md)).
- **Not the `engine` harness crate.** The harness composes engines; engines do not depend on the harness.

---

## What depends on Praxis

The dependency flows one direction. Consuming modules — the host command layer, Continuum (contracts only), and Metis (contracts only) — depend on Praxis; Praxis depends on none of them in return.

- The **host** routes IPC commands to Praxis's trait objects via the [engine harness](../engine/README.md).
- **Metis** may consume Praxis's semantic request DTOs and scope definitions, but never its rule-engine or metamodel-publisher internals ([module dependency map](../../01-architecture/module-dependency-map.md)).
- **Chrona** and **Continuum** may consume Praxis's contract/DTO types only.

Praxis is a stable semantic seam, not a generic middleware layer: it exposes capability traits that consuming modules implement against, and the seam is a public cross-link and contract target.

---

## The acyclic rule, stated

> No engine depends on another engine, and the engine dependency graph is acyclic ([ADR-0011](../../06-adrs/ADR-0011-module-taxonomy-and-boundaries.md)).

When Praxis and another engine genuinely share a type, the type drops to a lower neutral contract crate rather than creating a lateral import. The rule is enforced mechanically — Cargo rejects a dependency cycle at build time, and the crate split removes the temptation by placing shared contracts below their consumers ([dependency rules](../../01-architecture/boundary/dependency-rules.md)).

The trade-off: Praxis cannot `use` Metis directly to run an algorithm; it frames the question and the host composes the call. The architecture accepts that one indirection in exchange for a graph that stays acyclic by construction and engines that can be tested and replaced one at a time.

---

## Related documents

| Document                                                                | What it covers                                                  |
| ----------------------------------------------------------------------- | --------------------------------------------------------------- |
| [Module dependency map](../../01-architecture/module-dependency-map.md) | The full crate graph, allowed/forbidden edges, and enforcement. |
| [Dependency rules](../../01-architecture/boundary/dependency-rules.md)  | The dependency directions and the acyclic invariant in prose.   |
| [ADR-0011](../../06-adrs/ADR-0011-module-taxonomy-and-boundaries.md)    | Module taxonomy and the no-engine-to-engine rule.               |
| [Engine harness](../engine/README.md)                                   | The crate that composes Praxis behind its trait for the host.   |
| [Mneme module](../mneme/README.md)                                      | The storage engine Praxis depends on.                           |
