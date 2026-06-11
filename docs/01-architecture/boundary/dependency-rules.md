# Dependency Rules

The dependency directions between layers, the replaceability they buy, and the acyclic invariant that no engine may depend on another in a cycle. This file states the rules; the [module dependency map](../module-dependency-map.md) draws the full crate graph and shows where enforcement lives.

---

## Replaceability is the point

Every engine is replaceable because the host depends on its **published trait**, not its implementation. Swapping an implementation, replacing the storage engine, or replacing the renderer therefore does not propagate change across layers.

```text
Host (composition root)
 ├── impl MnemeStore       for SqliteMneme              ← current default
 ├── impl MnemeStore       for HostedPostgresAdapter    ← optional; never canonical
 ├── impl PraxisEngine     for DefaultPraxis
 ├── impl MetisEngine      for DefaultMetis
 ├── impl ChronaEngine     for DefaultChrona
 └── impl ContinuumExecutor for LocalContinuum
```

The storage trait is fixed by **[ADR-0004](../../06-adrs/ADR-0004-storage-engine-abstraction.md)** (Storage-engine abstraction); the hosted adapter being an engine swap rather than a UI fork is fixed by **[ADR-0001](../../06-adrs/ADR-0001-workspace-is-canonical-authority.md)**.

---

## Dependency directions

The allowed directions, top to bottom:

- **Renderer → Host** — IPC commands and events only; no Rust crate import, no local HTTP.
- **Host → Engines** — trait calls, in-process; the host is the composition root.
- **Engines → Canonical workspace** — through Mneme's storage interface only.
- **Engine → Engine contracts** — an engine may import another engine's trait and DTO types, but never its implementation internals.
- **Mneme facade → Mneme core / store** — the facade re-exports core traits and concrete adapters.

The forbidden directions:

- **No engine → host.** A module never depends on `desktop`.
- **No engine → renderer.** The host owns event publication.
- **No engine → Tauri or WebView APIs.**
- **No engine → another engine's implementation internals** — contracts only, and never in a cycle.
- **No renderer → engine or storage crate** directly.
- **Design system → any engine crate** is forbidden; the design system stays domain-free.

---

## The acyclic invariant

> **The engine dependency graph is a directed acyclic graph.** If removing a crate from the graph would leave a cycle in what remains, the graph is already wrong.

No engine→engine cycle is permitted, including the indirect ones: `praxis → metis → praxis`, `praxis → chrona → praxis`, `metis → chrona → metis`, `continuum → desktop → continuum`, `mneme_core → mneme_store → mneme_core`, and the renderer-shortcut `engine → renderer → desktop → engine`. When two modules need each other's types, the shared type drops to a lower neutral contract crate rather than creating an upward or lateral import — shared contracts sit below their consumers.

The planned engines join under the same invariant: Lexis, Pylon, Sophia, and Kerux are composed by the host and read through Mneme; none introduces a cycle. Their attachment points are in the [module dependency map](../module-dependency-map.md).

---

## How the invariant is enforced

The rule is not aspirational; it is enforced mechanically. The detail of each mechanism is in the [module dependency map](../module-dependency-map.md); in summary:

- **Cargo's own resolver rejects a dependency cycle** at build time, so any cycle introduced through `Cargo.toml` fails the build outright.
- **The crate split is the structural enforcement** — contracts that would otherwise force a lateral import live in lower neutral crates (e.g. `mneme_core`, or a dedicated contracts crate), so the temptation to add a cycle does not arise.
- **The taxonomy fixes ownership**, per **[ADR-0011](../../06-adrs/ADR-0011-module-taxonomy-and-boundaries.md)** — each capability belongs to exactly one engine, so two engines do not grow a mutual dependency by drifting into each other's responsibility.

---

## The trade-off named

Forbidding lateral engine dependencies closes a door: two engines that genuinely share logic cannot simply import each other. The cost is an extra neutral contract crate, and a small amount of indirection when a shared type must be located below both consumers. The architecture accepts that indirection in exchange for a graph that stays acyclic by construction and modules that can be reasoned about, tested, and replaced one at a time.

---

## Related documents

| Document                                                                                                       | What it covers                                                                  |
| -------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| [`../module-dependency-map.md`](../module-dependency-map.md)                                                   | The full crate dependency graph, allowed/forbidden edge table, and enforcement. |
| [`boundary-thesis.md`](./boundary-thesis.md)                                                                   | The replaceability proposition this realises.                                   |
| [`layers-and-responsibilities.md`](./layers-and-responsibilities.md)                                           | What each layer owns and may not do.                                            |
| [`../../06-adrs/ADR-0004-storage-engine-abstraction.md`](../../06-adrs/ADR-0004-storage-engine-abstraction.md) | Storage-engine abstraction.                                                     |
