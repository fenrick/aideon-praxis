# Boundary Thesis

The five irreducible propositions every design decision in Aideon Desktop defers to, and the precedence rule that holds the documentation and the code in agreement. An architect should be able to test any proposed change against these five sentences before reading anything else.

---

## Documentation precedence

Documentation is authoritative. Where code and these documents disagree, the code is brought to match the documents. Documentation changes to match code only when the intended architecture has genuinely changed — recorded, in that case, as an [ADR](../../06-adrs/ADRS.md). A confident sentence in code that contradicts this layer is a defect in the code, not in the document.

---

## The five propositions

1. **The portable workspace folder is canonical authority.** Operations, schema-as-data, and content-addressed blobs live in the [workspace](../../../CONTEXT.md) folder. Temporal facts, and every other structure — every index, projection, search sidecar, and the runtime database — are derived and rebuildable from those files alone (a fact is resolved from operations on read). This is fixed by **[ADR-0001](../../06-adrs/ADR-0001-workspace-is-canonical-authority.md)** (Portable workspace is the canonical authority).

2. **The renderer is disposable UI.** It is safe to restart, replace, or refactor without losing model correctness. It holds no durable truth and reconstructs nothing canonical on its own.

3. **Rust owns all side effects.** Filesystem access, workspace IO, blob ingestion, indexing, export and import, sync application, and job orchestration are Rust responsibilities, enforced at the Tauri capability boundary. This is fixed by **[ADR-0006](../../06-adrs/ADR-0006-tauri-trust-boundary-and-typed-ipc.md)** (Tauri trust boundary and typed IPC).

4. **Engines are replaceable behind traits.** Praxis, Mneme, Metis, Chrona, and Continuum expose typed contracts; an implementation may be swapped without touching the renderer or the IPC surface. The storage engine in particular sits behind a trait — fixed by **[ADR-0004](../../06-adrs/ADR-0004-storage-engine-abstraction.md)** (Storage-engine abstraction). The planned engines (Lexis, Pylon, Sophia, Kerux) occupy the same boundary, behind the taxonomy fixed by **[ADR-0011](../../06-adrs/ADR-0011-module-taxonomy-and-boundaries.md)** (Module taxonomy and boundaries).

5. **Time context is not optional.** Every read and write carries explicit valid time, asserted time, a layer, and an optional scenario overlay. No module assumes "current state only." This is fixed by **[ADR-0009](../../06-adrs/ADR-0009-temporal-model-valid-interval-layer-policy-viewpoint.md)** (Temporal model: valid-interval, layer-as-policy, viewpoint), and the query frame that carries the context is the **Viewpoint** as defined in [`CONTEXT.md`](../../../CONTEXT.md).

These five propositions are mutually reinforcing. Proposition 1 is the reason proposition 2 is safe: because the renderer holds no canonical truth, discarding it loses nothing. Proposition 3 is the mechanism that protects proposition 1: because only Rust touches the filesystem, the canonical files cannot be corrupted from the untrusted side. Proposition 4 keeps proposition 1 portable: because the storage engine is behind a trait, the canonical format does not bind to any one database. Proposition 5 is the discipline that makes proposition 1 meaningful: a canonical op log without time context would not be a twin, only a current-state store.

---

## The trade-off named

This boundary closes a door. Because the renderer may not hold canonical truth or touch the filesystem, no feature can be built purely in the front end that needs durable model state — it must round-trip through a typed command to the host, and that command must exist before the feature can ship. This costs a contract per capability and forbids the quick local hack. The architecture accepts that cost in exchange for a single trust boundary, a portable workspace, and a renderer that can be rebuilt or replaced without risk to the model.

---

## How to use the thesis

Before proposing a change, test it against each proposition:

- Does it put durable truth anywhere but the canonical workspace? (Violates 1.)
- Does it make the renderer load-bearing for correctness? (Violates 2.)
- Does it perform a side effect outside Rust, or outside a declared capability? (Violates 3.)
- Does it couple a layer to a concrete engine implementation rather than its trait? (Violates 4.)
- Does it read or write without a complete time context? (Violates 5.)

A change that fails any test is either redesigned or raised as an ADR that consciously amends the thesis.

---

## Related documents

| Document                                                             | What it covers                                                 |
| -------------------------------------------------------------------- | -------------------------------------------------------------- |
| [`canonical-vs-derived.md`](./canonical-vs-derived.md)               | The deciding rule that operationalises proposition 1.          |
| [`layers-and-responsibilities.md`](./layers-and-responsibilities.md) | The allowed/forbidden detail behind propositions 2 and 3.      |
| [`dependency-rules.md`](./dependency-rules.md)                       | The replaceability and acyclicity detail behind proposition 4. |
| [`time-first-rule.md`](./time-first-rule.md)                         | The time-context detail behind proposition 5.                  |
| [`../../06-adrs/ADRS.md`](../../06-adrs/ADRS.md)                     | The decisions that fix all five propositions.                  |
