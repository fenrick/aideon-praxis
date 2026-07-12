# Boundaries

What Metis depends on, what depends on it, and the acyclic rule. For a reader checking whether a proposed dependency is
allowed.

The full crate graph is the [module dependency map](../../01-architecture/module-dependency-map.md); the directions and
the acyclic invariant in prose are [dependency rules](../../01-architecture/boundary/dependency-rules.md). This file is
the Metis-facing view.

> The `metis` crate is currently a placeholder ([README](./README.md)); the boundary rules below are normative and
> constrain the implementation when it lands.

---

## What Metis depends on

| Dependency                | Why                                                                               | Allowed surface                                                                                  |
| ------------------------- | --------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| `aideon_mneme`            | Reads bounded, filtered graph projections and snapshots — the deterministic input | The published storage facade traits only ([determinism and bounds](./determinism-and-bounds.md)) |
| `aideon_praxis` contracts | Consumes semantic request DTOs and scope definitions                              | Contract/DTO types only, never the rule engine or metamodel publisher                            |

Metis never accesses persistence internals directly and never imports a Praxis or Mneme implementation detail.

---

## What Metis does _not_ depend on

- **Not Praxis or Mneme internals.** Contract types only; no coupling to the rule engine, metamodel publisher, or
  storage adapters ([module dependency map](../../01-architecture/module-dependency-map.md)).
- **Not Chrona or Continuum.** No lateral engine dependency. A job that runs as accepted work is composed by Continuum
  _through the host_, not by a Metis→Continuum import ([accepted-work execution](./accepted-work-execution.md)).
- **Not the host (`aideon_desktop`), the renderer, the `engine` harness, or any Tauri/WebView API.** Modules never
  depend on the host or the harness; the renderer has no Rust crate access
  ([dependency rules](../../01-architecture/boundary/dependency-rules.md)).

The crate exposes only traits, typed structs, and deterministic helpers; all algorithm implementations are testable
without I/O.

---

## What depends on Metis

The dependency graph is strictly one-directional: **neither Praxis nor Mneme depends on Metis.**

```text
Metis
  └─ reads snapshots and projections via Mneme traits
  └─ reads semantic context via Praxis contract types
  └─ emits results via accepted-work and event contracts
  └─ no Tauri, no UI, no direct DB access
```

The host composes Metis behind its trait via the [engine harness](../engine/README.md); Continuum (contracts only)
enqueues Metis jobs; Praxis frames the questions Metis answers and presents the results, but does so through host
composition, not a direct import. Kairos (planned) consumes the change-magnitude vector Metis computes
([impact and change magnitude](./impact-and-change-magnitude.md)).

---

## The acyclic rule

> No engine depends on another engine, and the graph is acyclic
> ([ADR-0011](../../06-adrs/ADR-0011-module-taxonomy-and-boundaries.md)).

Forbidden cycles involving Metis include `praxis → metis → praxis` and `metis → chrona → metis`
([module dependency map](../../01-architecture/module-dependency-map.md)). When Metis and another engine need a shared
type, it drops to a lower neutral contract crate rather than creating a lateral import. Cargo rejects a dependency cycle
at build time, so the rule is enforced mechanically.

The trade-off: Metis cannot call Praxis to re-resolve the twin mid-computation — it works from the projection it was
given. The architecture accepts that constraint in exchange for an engine that is independently testable and a graph
that stays acyclic by construction.

---

## Related documents

| Document                                                                | What it covers                                                  |
| ----------------------------------------------------------------------- | --------------------------------------------------------------- |
| [Module dependency map](../../01-architecture/module-dependency-map.md) | The full crate graph, allowed/forbidden edges, and enforcement. |
| [Dependency rules](../../01-architecture/boundary/dependency-rules.md)  | The dependency directions and the acyclic invariant in prose.   |
| [ADR-0011](../../06-adrs/ADR-0011-module-taxonomy-and-boundaries.md)    | Module taxonomy and the no-engine-to-engine rule.               |
| [Engine harness](../engine/README.md)                                   | The crate that composes Metis behind its trait for the host.    |
| [Accepted-work execution](./accepted-work-execution.md)                 | Why Continuum composes Metis jobs through the host.             |
