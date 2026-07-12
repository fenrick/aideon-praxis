# Vocabulary

Where the product's words are defined. This layer does not own a glossary; the single source of truth for every domain
term is the root glossary, [`CONTEXT.md`](../../CONTEXT.md). Every document here uses those terms exactly and avoids the
terms the glossary marks `_Avoid_` ([Documentation Standard §3](../02-standards/DOCUMENTATION-STANDARD.md)).

This file exists only to point a reader at the canonical definitions and to restate the conclusions of the distinctions
that matter most for the product layer — not to fork them.

## The distinctions that shape this layer

| Distinction                                                            | Conclusion (full definition in [`CONTEXT.md`](../../CONTEXT.md))                                                                                                                                                                                                                                      |
| ---------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Artefact** vs **Artefact result** vs **Artefact family** vs **Form** | An _Artefact_ is a reusable, versioned definition; an _Artefact result_ is one execution at one viewpoint; an _Artefact family_ is the question-shaped grouping; a _Form_ is the presentation shape (view/catalogue/matrix/map/report/page). The chain is **Artefact + Viewpoint → Artefact result**. |
| **Viewpoint**                                                          | The complete bitemporal query frame — as-of valid time, as-of asserted time, layer or layer policy, scenario, scope. It is _not_ the ISO/IEC/IEEE 42010 architecture viewpoint; when citing 42010 write "architecture viewpoint (42010)". The product-layer grouping is an _Artefact family_.         |
| **Content classification** — Asserted / Inferred / Generated           | The "what kind of claim" axis, distinct from provenance (origin) and confidence (quality). Asserted is controlled truth; Inferred is derived and traceable; Generated is a suggestion until accepted.                                                                                                 |
| **twin** / **workspace** / **snapshot**                                | The _twin_ is the whole resolvable organisation; the _workspace_ is the portable container; a _snapshot_ is the twin resolved at one viewpoint.                                                                                                                                                       |
| **entity** / **relationship** vs **node** / **edge**                   | Entity and relationship are the domain terms; node and edge are reserved for the graph projection (storage, validation, traversal, layout, canvas).                                                                                                                                                   |
| **operation** vs **fact** vs **Change Event**                          | An _operation_ is the canonical append-only mutation; a _fact_ is the derived temporal claim; a _Change Event_ is the user-facing authoring object that compiles into operations.                                                                                                                     |
| **layer** vs **scenario** vs **scope**                                 | _Layer_ answers "what kind of claim" (plan/actual/forecast…); _scenario_ is an alternate world; _scope_ is the composable "which part".                                                                                                                                                               |

## The rule

Where a product document needs a term for flow, it restates the conclusion and links the definition; it never re-defines
the term. If a surface or a module appears to need a new domain term, that term is added to
[`CONTEXT.md`](../../CONTEXT.md) first, then used here.

## Related documents

| Document                                                               | What it covers                                        |
| ---------------------------------------------------------------------- | ----------------------------------------------------- |
| [`CONTEXT.md`](../../CONTEXT.md)                                       | The canonical domain glossary — the source of truth.  |
| [Documentation Standard §3](../02-standards/DOCUMENTATION-STANDARD.md) | The vocabulary rules and the reserved-name collision. |
| [artefacts/what-is-an-artefact.md](./artefacts/what-is-an-artefact.md) | The artefact distinctions applied in the product.     |
