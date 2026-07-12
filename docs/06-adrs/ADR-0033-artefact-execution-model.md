# ADR-0033: Artefact Execution Model

- Status: Accepted
- Date: 2026-06-16
- Depends-On: ADR-0009, ADR-0027
- Relates-To: ADR-0006, ADR-0020, ADR-0021, ADR-0014

## Context

The artefact is the primary product of Aideon Desktop ([artefacts design](../03-design/artefacts/README.md)), and the
chain `Artefact + Viewpoint → Artefact result` is canonical ([`CONTEXT.md`](../../CONTEXT.md)). The design record
describes _what_ an artefact is, its [contract](../03-design/artefacts/the-contract.md), its
[forms](../03-design/artefacts/forms.md), and its [families](../03-design/artefacts/families.md); the Praxis module
describes the [execution mechanics](../05-modules/praxis/artefact-execution.md). What no single decision has fixed is
the durable shape of execution: how an artefact _definition_ is stored, how its input parameters bind to a
[viewpoint](../../CONTEXT.md), whether an artefact may cause a side effect, how a result's
[content classification](../03-design/artefacts/content-classification.md) is established, and how a cached result is
invalidated and how it fails.

Those questions are durable because they fix a seam many layers depend on. The renderer renders results and never
traverses ([artefact execution boundary](../01-architecture/boundary/artefact-execution-boundary.md)); the
[output contracts](../04-contracts/artefact-results/README.md) the renderer consumes are derived from this model;
integrity scores ([ADR-0020](./ADR-0020-integrity-scoring-model.md)) and the cache freshness model
([ADR-0027](./ADR-0027-projection-consistency-model.md)) both attach to it. Recording it once prevents three independent
re-inventions — one in the engine, one in the contract layer, one in the UI.

The temporal frame is fixed by [ADR-0009](./ADR-0009-temporal-model-valid-interval-layer-policy-viewpoint.md) (valid
interval, layer policy, viewpoint); the cache consistency guarantee is fixed by
[ADR-0027](./ADR-0027-projection-consistency-model.md); the trust boundary that decides where execution runs is fixed by
[ADR-0006](./ADR-0006-tauri-trust-boundary-and-typed-ipc.md). This ADR composes those, it does not restate them.

## Governance Framing

- **Decision type:** Stable seam (the artefact-definition shape and the execution contract its results carry) +
  invariant (an artefact is a read-only projection of the twin; its result classification is established by Praxis,
  never by the renderer; a result that hits a bound is Partial / Bounded, never silently truncated).
- **Known future pressure:** action artefacts that propose writes; more forms and families; richer parameter types
  (multi-select scopes, parameterised metrics); LLM-seeded definitions from Sophia; larger twins raising the cost of
  bounded traversal.
- **What stays stable:** the definition is stored as time-valid content in Mneme; parameters bind to a viewpoint at
  execution; results carry per-element content classification and result state; the renderer receives data, never logic.
- **What is provisional:** the parameter type set, the per-form size bounds, and the default page size — tunable by a
  later recorded decision, not silently.
- **What is deferred:** **action artefacts** (an artefact that, on execution, _proposes_ a Change Event rather than only
  reading) — the boundary is reserved here but the mechanism is design intent, not built; richer parameter binding
  (cascading, dependent parameters); cross-workspace artefacts.
- **Why hard to reverse:** the stored-definition shape is time-valid content that past viewpoints resolve against
  ([determinism](../05-modules/praxis/artefact-execution.md)); the result contract is consumed by every renderer surface
  and by the [output schemas](../04-contracts/artefact-results/README.md); changing either is a versioned,
  cross-boundary event ([contracts](../04-contracts/README.md)).

## Decision

- **The artefact definition is time-valid content stored in Mneme.** An artefact is a declared, reusable definition —
  purpose, audience, [family](../03-design/artefacts/families.md), [form](../03-design/artefacts/forms.md), default
  scope, inclusion rules, declared parameters, and output expectations
  ([what an artefact is](../03-design/artefacts/what-is-an-artefact.md)). It is stored as time-valid properties through
  the canonical op log, exactly as any other modelled content, so that a past viewpoint resolves _the definition as it
  was_ alongside _the data as it was_. The definition is not renderer state and not a file beside the binary; it lives
  behind the [storage boundary](../05-modules/host/process-and-trust-boundary.md). This is what makes "view as-of last
  quarter" reproduce both the question and the answer of that quarter.

- **Input parameters bind to a viewpoint at execution.** A definition declares parameters; an execution supplies values,
  and those values are resolved into the [viewpoint](../../CONTEXT.md) — as-of valid time, as-of asserted time, layer or
  layer policy, scenario, and scope — plus any form-specific options (filter, sort, page). The viewpoint is not a UI
  convenience: it is part of the operation contract and is carried on the result so every surface can name what produced
  it ([the contract](../03-design/artefacts/the-contract.md),
  [temporal and scenario context](../04-contracts/temporal-and-scenario/README.md)). The same definition at two
  viewpoints is two results.

- **Artefacts are read-only projections of the twin.** Executing an artefact resolves and reads the twin; it never
  writes. A "next action" offered from a result leads to task-based [editing](../03-design/artefacts/the-contract.md) or
  an [accepted-work](../04-contracts/accepted-work-and-events/README.md) operation — the human commits truth, the
  artefact does not. This keeps execution free of side effects, which is what makes a result cacheable and a re-run
  deterministic. **Action artefacts** — a future variant that, on execution, _proposes_ a Change Event rather than only
  reading — are reserved as a deferred concern (Governance Framing) and are **design intent, not built**: when
  introduced, the proposed write follows the same review path as any other suggestion
  ([intelligence and automation](../03-design/artefacts/intelligence-and-automation.md)), never a silent edit.

- **Result provenance is established by Praxis and carried per element.** Every element of a result carries its
  [content classification](../03-design/artefacts/content-classification.md) — **Asserted**, **Inferred**, or
  **Generated** ([Documentation Standard §9](../02-standards/DOCUMENTATION-STANDARD.md)) — set by Praxis from the
  supporting facts, so the renderer presents honest state without re-deriving it
  ([artefact execution boundary](../01-architecture/boundary/artefact-execution-boundary.md)). A seeded slot is
  Asserted; a roll-up or an integrity score ([ADR-0020](./ADR-0020-integrity-scoring-model.md)) is Inferred; an
  LLM-drafted narrative ([ADR-0014](./ADR-0014-ai-assistance-and-generated-provenance-sophia.md)) is Generated.
  Classification (the kind of claim) is distinct from result state (the freshness condition) and from confidence
  ([ADR-0021](./ADR-0021-confidence-and-trust-scale.md), the reliability of a derived result); a result may carry all
  three.

- **Cache invalidation follows the projection consistency model.** An artefact result is Inferred content derived from a
  snapshot; it is cacheable, keyed by artefact identity and the full viewpoint, and recomputed when a canonical input it
  depends on changes — Praxis does not invent its own freshness scheme but follows
  [ADR-0027](./ADR-0027-projection-consistency-model.md). The triggers are the same
  [invalidation events](../04-contracts/projection-and-invalidation/README.md): a write that changes a fact the result
  read invalidates the result, which is then **Stale** until recomputed, or **Rebuilding** while recomputation is in
  flight, and never silently served as fresh. The writer's own next execution observes its own effect
  (read-your-writes); a concurrent reader converges with a surfaced staleness badge.

- **Error and partial-result states are explicit and honest.** A bounded execution that hits a depth, fanout, size, or
  time limit returns what it computed marked **Partial / Bounded** with explicit coverage
  ([artefact execution](../05-modules/praxis/artefact-execution.md)); an execution that errors returns **Failed** with
  any partial coverage stated, never a clean-looking empty result. These are the
  [honest-state](../02-standards/DOCUMENTATION-STANDARD.md) result states (§9), surfaced through the
  [RFC 9457 error envelope](./ADR-0016-error-envelope-rfc9457.md) on failure. The result contract reserves the fields
  that carry coverage and state so a renderer can always show them.

## Considered Options

- **Store artefact definitions as renderer-side configuration (rejected):** simpler to ship, but a definition outside
  the op log cannot be resolved at a past viewpoint, breaks determinism, and puts a piece of model meaning outside the
  trust boundary. Storing the definition as time-valid content is what makes time-travel over the question itself
  possible.
- **Let artefacts write directly when they carry an action (rejected for now):** would collapse read and write into one
  execution, defeating cacheability and read-your-writes, and would route a write around the accepted-work review path.
  Deferring action artefacts keeps the read model clean and the write path single.
- **Classify result provenance in the renderer from the payload (rejected):** the renderer would need model and
  derivation data in the WebView to decide Asserted vs Inferred, duplicating semantics and widening the trust surface
  ([artefact execution boundary](../01-architecture/boundary/artefact-execution-boundary.md)). Establishing
  classification in Praxis keeps one home for meaning.

## Consequences

- A renderer consuming a result never decides what kind of claim an element is, whether it is stale, or whether coverage
  is complete — it reads fields Praxis set ([output contracts](../04-contracts/artefact-results/README.md)).
- "View as-of last quarter" reproduces the quarter's definition and data together, because the definition is time-valid
  content.
- An artefact cannot have an undetected side effect, so a result is safe to cache and re-run; the cost is that
  interactive re-slicing is a round-trip and an execution
  ([artefact execution boundary](../01-architecture/boundary/artefact-execution-boundary.md)).
- Action artefacts are not available; a workflow that needs an artefact to change the model uses task-based editing or
  accepted work today, and the action-artefact mechanism is filed as a follow-up.
- A worked example: executing the "Application Portfolio Health" catalogue over the
  [baseline](../data/base/baseline.yaml) at
  `{valid: 2026-06-11, layer: actual, scenario: base, scope: type=Application}` reads `disposition` and `lifecycle` as
  **Asserted**, a health roll-up across `realises` as **Inferred**, returns the rows **Fresh**; asserting a new
  `realises` relationship invalidates the cached result, which shows **Stale** to a second window until recomputed, then
  converges to the state a full rebuild would produce ([ADR-0027](./ADR-0027-projection-consistency-model.md)).

## Follow-ups / Open Questions

- Action artefacts: the parameter and review contract for an artefact that proposes a Change Event on execution.
- The provisional parameter type set (cascading and dependent parameters; parameterised metrics).
- Per-form size-bound and default-page-size tuning as twins grow, recorded against this ADR.
- LLM-seeded artefact definitions from [Sophia](../05-modules/sophia/README.md) (planned,
  [ADR-0014](./ADR-0014-ai-assistance-and-generated-provenance-sophia.md)) — the definition stays Asserted only after
  human acceptance.

## References & standards

_Normative:_

- The Open Group — **ArchiMate 3.2** and **TOGAF Standard, 10th Edition** — the family alignment definitions ride on
  ([families](../03-design/artefacts/families.md)).
- **RFC 9457**, Problem Details — the error envelope a Failed execution surfaces through
  ([ADR-0016](./ADR-0016-error-envelope-rfc9457.md)).

_Informative:_

- Gupta & Mumick — **Maintenance of Materialized Views**, 1995 — the incremental-equals-rebuild correctness the cache
  relies on ([ADR-0027](./ADR-0027-projection-consistency-model.md)).

Recorded in the [standards register](../02-standards/STANDARDS-REGISTER.md).

## Related documents

| Document                                                                                  | What it covers                                                        |
| ----------------------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| [Praxis — artefact execution](../05-modules/praxis/artefact-execution.md)                 | The execution mechanics this ADR fixes the durable shape of.          |
| [Artefacts design](../03-design/artefacts/README.md)                                      | What an Artefact, result, family, and form are.                       |
| [Artefact results contracts](../04-contracts/artefact-results/README.md)                  | The typed output shapes derived from this model.                      |
| [Artefact execution boundary](../01-architecture/boundary/artefact-execution-boundary.md) | Why execution runs in Praxis, not the renderer.                       |
| [ADR-0009](./ADR-0009-temporal-model-valid-interval-layer-policy-viewpoint.md)            | The viewpoint parameters bind to.                                     |
| [ADR-0027](./ADR-0027-projection-consistency-model.md)                                    | The cache invalidation and consistency guarantee the result inherits. |
| [ADR-0020](./ADR-0020-integrity-scoring-model.md)                                         | The integrity score carried on a result.                              |
