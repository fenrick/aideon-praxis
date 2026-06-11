# Deterministic, reviewable import

How a Pylon import becomes a reviewable batch of Change Events rather than a direct write, and how deny-by-default redaction protects an export. For practitioners who must trust what an import will do before it lands, and what an export will and will not leak.

> **PLANNED.** No `aideon_pylon` crate exists; this is design intent per [ADR-0013](../../06-adrs/ADR-0013-interchange-and-interoperability-pylon.md).

## Two failure modes this design closes

Interchange has two failure modes worth naming ([ADR-0013](../../06-adrs/ADR-0013-interchange-and-interoperability-pylon.md)):

- A **non-deterministic import** produces different results on re-run, so it cannot be reviewed or trusted.
- An **export that leaks** ships sensitive content because redaction was opt-in and a flag was forgotten.

Pylon closes the first with determinism and review, the second with deny-by-default.

## Determinism makes review possible

Given the same source file, metamodel, and mapping configuration, a Pylon import produces the **same set of operations every time** ([ADR-0013](../../06-adrs/ADR-0013-interchange-and-interoperability-pylon.md)). Determinism is not an optimisation; it is what makes review meaningful. The same input yields the same diff, so a steward inspects exactly what _will_ change before accepting, and re-running an import over an unchanged source produces an **empty diff** — the determinism guarantee made observable.

## Import compiles to reviewable operations, not direct writes

A Pylon import does not write to the twin. It produces:

- a **proposed batch of operations** — what the import would change; and
- a **mapping report** — what mapped cleanly, what was ambiguous, and what was rejected.

Ambiguous or unmapped material is surfaced as `Awaiting review` ([Documentation Standard §9](../../02-standards/DOCUMENTATION-STANDARD.md)), never silently dropped or guessed ([ADR-0013](../../06-adrs/ADR-0013-interchange-and-interoperability-pylon.md)). The authoring object is a **Change Event** ([`CONTEXT.md`](../../../CONTEXT.md)): the import compiles intent and context into the operations that acceptance will apply. **Acceptance** writes those operations through the normal canonical path; imported content is **Asserted**, with import lineage as its corroboration — so a later integrity score can weigh it against human-asserted and machine-attested content ([ADR-0020](../../06-adrs/ADR-0020-integrity-scoring-model.md)). The trade-off named: a direct-write import is faster, but unreviewable and unable to surface ambiguity; the reviewable batch is the auditable path consistent with the op-log model ([ADR-0013](../../06-adrs/ADR-0013-interchange-and-interoperability-pylon.md)).

## Export redaction is deny-by-default

An export emits **only what the redaction policy explicitly permits** ([ADR-0013](../../06-adrs/ADR-0013-interchange-and-interoperability-pylon.md)). Sensitive slots — for example a `DataEntity`'s `sensitivity`, or owner names — and any policy-excluded content are **removed before the file is written, not after**. This mirrors the filtered-export posture of the host trust boundary ([ADR-0006](../../06-adrs/ADR-0006-tauri-trust-boundary-and-typed-ipc.md)) and is the same deny-by-default discipline [Kerux](../kerux/README.md) applies on publish ([ADR-0015](../../06-adrs/ADR-0015-reporting-and-publishing-kerux.md)); the two may share the policy grammar. The trade-off named: opt-in redaction is one forgotten flag away from a leak, so deny-by-default fails safe ([ADR-0013](../../06-adrs/ADR-0013-interchange-and-interoperability-pylon.md)). An export also records the executing `Viewpoint` it was taken at, so a recipient knows the as-of valid time, layer policy, and scenario it represents ([ADR-0009](../../06-adrs/ADR-0009-temporal-model-valid-interval-layer-policy-viewpoint.md)).

## Worked example

A steward imports an ArchiMate exchange file. Pylon maps its Application Components to seed `Application` entities and its Serving relationships to `serves` / `realises`, producing a proposed batch and a mapping report. An element with no seed type appears `Awaiting review`. The steward inspects the diff, sees it create an `Application` realising `n:capability:customer-insight`, and accepts; the operations are written as Asserted with import lineage. Re-running the same file produces an empty diff.

On export at a viewpoint pinned to the actual layer, the policy permits `Application` names and `realises` relationships but excludes `DataEntity` `sensitivity`. The `DataEntity` `n:data-entity:engagement-event` (`sensitivity = Confidential`) is exported with its `sensitivity` slot removed before the file is written; the export header records the viewpoint.

## References & standards

_Normative:_

- The Open Group — **ArchiMate Model Exchange File Format**. The import/export format the deterministic compilation targets.

_Informative:_

- Fowler; Young — **Event Sourcing & CQRS**. The append-only operation model acceptance writes through.

Recorded in the [standards register](../../02-standards/STANDARDS-REGISTER.md).

## Related documents

| Document                                                                     | What it covers                                                    |
| ---------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| [Pylon README](./README.md)                                                  | The module index and invariants.                                  |
| [ArchiMate Open Exchange](./archimate-open-exchange.md)                      | The primary format and its mapping.                               |
| [Kerux redaction and PII](../kerux/redaction-and-pii.md)                     | The shared deny-by-default redaction discipline on publish.       |
| [ADR-0013](../../06-adrs/ADR-0013-interchange-and-interoperability-pylon.md) | The decision that fixes determinism, review, and deny-by-default. |
