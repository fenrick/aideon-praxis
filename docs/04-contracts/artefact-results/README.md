# Artefact Results

The typed output shapes a renderer receives when Praxis executes an artefact at a viewpoint. This area binds the engine that produces a result to the renderer that displays it: the common envelope every result carries, and the per-form payload each [form](../../03-design/artefacts/forms.md) shapes that envelope into. A practitioner building or auditing a renderer reads this area to know what crosses the boundary, without reading the engine.

The execution that produces these shapes is [Praxis artefact execution](../../05-modules/praxis/artefact-execution.md); the durable decisions behind it are [ADR-0033](../../06-adrs/ADR-0033-artefact-execution-model.md). Result provenance and result state use the unified vocabulary of the [Documentation Standard §9](../../02-standards/DOCUMENTATION-STANDARD.md) and are not redefined here.

---

## The grouping is by form, not family

An [artefact family](../../03-design/artefacts/families.md) fixes the _question_; a [form](../../03-design/artefacts/forms.md) fixes the _presentation shape_, and it is the form — not the family — that determines the output payload a renderer receives. The same application-portfolio family can return a **catalogue** payload or a **map** payload. This area is therefore organised by the six controlled forms — **view, catalogue, matrix, map, report, page** ([`CONTEXT.md`](../../../CONTEXT.md)) — one file per form's output shape.

---

## Core invariant

A result is **data, not instructions** ([artefact execution boundary](../../01-architecture/boundary/artefact-execution-boundary.md)). The renderer interprets the payload; it never runs logic shipped in it, never resolves the twin, and never re-derives an element's [content classification](../../03-design/artefacts/content-classification.md). Rust owns the wire shape and TypeScript consumes generated types ([contracts](../README.md)); a result field exists because a Rust struct declares it.

---

## The common envelope

Every artefact result, regardless of form, carries the same envelope. The per-form files add only the `body`.

```json
{
  "artefactId": "stable artefact identity",
  "form": "view | catalogue | matrix | map | report | page",
  "viewpoint": {
    "validAsOf": "2026-06-11",
    "assertedAsOf": "latest",
    "layer": "actual",
    "scenario": "base",
    "scope": "type=Application"
  },
  "resultState": ["fresh"],
  "coverage": null,
  "integrity": { "score": 0.82, "gateThreshold": 0.6, "bounded": false },
  "body": {
    /* form-specific — see the per-form files */
  }
}
```

| Field         | Type           | Description                                                                                                                                                                  |
| ------------- | -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `artefactId`  | string         | The stable identity of the executed artefact definition.                                                                                                                     |
| `form`        | enum           | One of the six forms; selects the `body` shape.                                                                                                                              |
| `viewpoint`   | object         | The full frame the result was executed at — carried so every surface can name what produced it ([viewpoint shape](../temporal-and-scenario/viewpoint-shape.md)).             |
| `resultState` | enum[]         | Zero or more [result states](../../02-standards/DOCUMENTATION-STANDARD.md) (§9): `fresh`, `stale`, `rebuilding`, `partialBounded`, `inProgress`, `awaitingReview`, `failed`. |
| `coverage`    | object \| null | Present when `resultState` includes `partialBounded` or `failed`; states which bound was hit (`depth`, `fanout`, `size`, `time`) and what was reached. `null` when complete. |
| `integrity`   | object         | The result-level integrity score, its gate threshold, and whether the gate marked it bounded ([ADR-0020](../../06-adrs/ADR-0020-integrity-scoring-model.md)).                |
| `body`        | object         | The form-specific payload defined in the per-form files.                                                                                                                     |

Two cross-cutting shapes recur inside every `body` and are defined once here:

- **`classification`** — every element-bearing field carries one of `asserted`, `inferred`, `generated` ([content classification](../../03-design/artefacts/content-classification.md)), set by Praxis, never by the renderer.
- **`page`** — list-shaped bodies (catalogue, and the row sets inside report and page) carry a pagination block: `{ "offset": int, "pageSize": int, "total": int | null, "hasMore": bool }`. `total` is `null` when computing it would itself exceed a bound. Pagination is a complete result delivered in pages and is **not** the same as `partialBounded`, which means coverage is incomplete by design.

---

## Contents

| #   | File                                         | The form's output shape                             |
| --- | -------------------------------------------- | --------------------------------------------------- |
| 1   | [view-result.md](./view-result.md)           | Nodes, edges, and a layout-free diagram spec.       |
| 2   | [catalogue-result.md](./catalogue-result.md) | Paginated rows of typed entities with their slots.  |
| 3   | [matrix-result.md](./matrix-result.md)       | Sparse rows × columns with per-cell relationships.  |
| 4   | [map-result.md](./map-result.md)             | A positioned topological layout over structure.     |
| 5   | [report-result.md](./report-result.md)       | Ordered sections of narrative, tables, and signals. |
| 6   | [page-result.md](./page-result.md)           | A composed surface assembling other result bodies.  |

---

## Versioning and compatibility

The envelope and every `body` follow the contract layer's rules: a shape change is a versioned, drift-checked event, not a silent edit ([versioning and compatibility](../ipc/versioning-and-compatibility.md), [generated-schema discipline](../ipc/generated-schema-discipline.md)). A failed execution returns the [RFC 9457 error envelope](../ipc/error-envelope.md), not a malformed result.

## References & standards

_Normative:_

- **JSON Schema 2020-12** — the validation schemas generated from the Rust source ([contracts](../README.md)).
- **RFC 9457**, Problem Details — the envelope a failed execution surfaces through ([ADR-0016](../../06-adrs/ADR-0016-error-envelope-rfc9457.md)).

_Informative:_

- The Open Group — **ArchiMate 3.2** — the relationship and element semantics the bodies carry.

Recorded in the [standards register](../../02-standards/STANDARDS-REGISTER.md).

## Related documents

| Document                                                                                     | What it covers                                           |
| -------------------------------------------------------------------------------------------- | -------------------------------------------------------- |
| [ADR-0033](../../06-adrs/ADR-0033-artefact-execution-model.md)                               | The execution model these shapes are the output of.      |
| [Praxis — artefact execution](../../05-modules/praxis/artefact-execution.md)                 | How the engine produces these shapes.                    |
| [Artefacts — forms](../../03-design/artefacts/forms.md)                                      | The six forms this area is organised by.                 |
| [Artefact execution boundary](../../01-architecture/boundary/artefact-execution-boundary.md) | Why a result is data, not instructions.                  |
| [Projection and invalidation](../projection-and-invalidation/README.md)                      | The freshness and staleness model `resultState` follows. |
