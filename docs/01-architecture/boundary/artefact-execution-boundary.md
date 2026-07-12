# Artefact Execution Boundary

Where artefacts execute, what crosses the boundary to the renderer, and why the renderer never implements traversal
semantics. This file fixes the division of labour between Praxis and the renderer for the product's central output.

---

## The rule

> **Artefacts execute in Praxis, not in the renderer.** Praxis executes an [Artefact](../../../CONTEXT.md) at a
> [Viewpoint](../../../CONTEXT.md), produces an [Artefact result](../../../CONTEXT.md), and returns a UI-ready result
> and diagram spec to the host, which forwards it to the renderer. The renderer renders the result and handles
> interaction; it does not resolve the twin, traverse the graph, or apply scope and inclusion rules.

The chain is _Artefact + Viewpoint → Artefact result_, per [`CONTEXT.md`](../../../CONTEXT.md). The renderer receives
the result of that chain, never its inputs to recompute. This keeps the renderer disposable: traversal semantics live in
one place, behind a trait, and cannot drift between the engine and the UI.

---

## What crosses the boundary

- **Artefact results are data, not instructions.** A diagram spec is a data payload describing nodes, edges, and layout
  — not executable renderer code. The renderer interprets the spec; it does not run logic shipped from the host.
- **Bounded execution is mandatory.** Every artefact execution carries depth, size, fan-out, and time limits. A result
  that hit a limit is returned with the **Partial / Bounded** result state and explicit coverage, per the honest-state
  vocabulary in [`../../02-standards/DOCUMENTATION-STANDARD.md`](../../02-standards/DOCUMENTATION-STANDARD.md) §9 —
  coverage is never silently incomplete.
- **Blobs are referenced by hash.** An artefact result references blobs by their `sha256` hash; if the renderer needs
  the bytes, it requests them through a separate IPC command. Bytes are not inlined into the result.
- **Content classification rides on the result.** Each element carries its classification — Asserted, Inferred, or
  Generated — so the renderer can present honest state without re-deriving it.

---

## Why the renderer must not traverse

If the renderer reimplemented traversal or resolution, two copies of the semantics would exist — one in Praxis, one in
TypeScript — and they would diverge. The architecture forbids this for the same reason it forbids the renderer holding
canonical truth: correctness must have a single home. The renderer is the presentation of an answer, not a second engine
that computes it.

This also bounds the trust surface. A traversal in the renderer would need model data in the WebView; keeping traversal
in Praxis keeps the model behind the [security boundary](./security-constraints.md).

---

## The trade-off named

Executing artefacts host-side closes a door: the renderer cannot cheaply re-slice or re-traverse a result locally
without a round-trip. Interactive exploration that changes scope or Viewpoint costs a command and an execution. The
architecture accepts that latency cost — mitigated by bounded execution and incremental projection — in exchange for one
authoritative implementation of meaning and a renderer that cannot diverge from it.

---

## Related documents

| Document                                                                                 | What it covers                                  |
| ---------------------------------------------------------------------------------------- | ----------------------------------------------- |
| [`../../03-design/ARTEFACTS-AND-FAMILIES.md`](../../03-design/ARTEFACTS-AND-FAMILIES.md) | What an Artefact, result, family, and form are. |
| [`../../05-modules/praxis/EDGE-CATALOGUE.md`](../../05-modules/praxis/EDGE-CATALOGUE.md) | The relationship vocabulary traversal uses.     |
| [`../../05-modules/praxis/README.md`](../../05-modules/praxis/README.md)                 | Praxis: artefact execution and explainability.  |
| [`layers-and-responsibilities.md`](./layers-and-responsibilities.md)                     | The renderer's forbidden actions.               |
| [`time-first-rule.md`](./time-first-rule.md)                                             | The Viewpoint an artefact executes against.     |
