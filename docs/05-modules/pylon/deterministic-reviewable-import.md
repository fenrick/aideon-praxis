# Deterministic, reviewable import

How a Pylon import becomes a reviewable batch of Change Events rather than a direct write, and how deny-by-default
redaction protects an export. For practitioners who must trust what an import will do before it lands, and what an
export will and will not leak.

> **PLANNED.** No `aideon_pylon` crate exists; this is design intent per
> [ADR-0013](../../06-adrs/ADR-0013-interchange-and-interoperability-pylon.md).

## Two failure modes this design closes

Interchange has two failure modes worth naming
([ADR-0013](../../06-adrs/ADR-0013-interchange-and-interoperability-pylon.md)):

- A **non-deterministic import** produces different results on re-run, so it cannot be reviewed or trusted.
- An **export that leaks** ships sensitive content because redaction was opt-in and a flag was forgotten.

Pylon closes the first with determinism and review, the second with deny-by-default.

## Determinism makes review possible

Given the same source file, metamodel, and mapping configuration, a Pylon import produces the **same set of operations
every time** ([ADR-0013](../../06-adrs/ADR-0013-interchange-and-interoperability-pylon.md)). Determinism is not an
optimisation; it is what makes review meaningful. The same input yields the same diff, so a steward inspects exactly
what _will_ change before accepting, and re-running an import over an unchanged source produces an **empty diff** — the
determinism guarantee made observable.

## Import compiles to reviewable operations, not direct writes

A Pylon import does not write to the twin. It produces:

- a **proposed batch of operations** — what the import would change; and
- a **mapping report** — what mapped cleanly, what was ambiguous, and what was rejected.

Ambiguous or unmapped material is surfaced as `Awaiting review`
([Documentation Standard §9](../../02-standards/DOCUMENTATION-STANDARD.md)), never silently dropped or guessed
([ADR-0013](../../06-adrs/ADR-0013-interchange-and-interoperability-pylon.md)). The authoring object is a **Change
Event** ([`CONTEXT.md`](../../../CONTEXT.md)): the import compiles intent and context into the operations that
acceptance will apply. **Acceptance** writes those operations through the normal canonical path; imported content is
**Asserted**, with import lineage as its corroboration — so a later integrity score can weigh it against human-asserted
and machine-attested content ([ADR-0020](../../06-adrs/ADR-0020-integrity-scoring-model.md)). The trade-off named: a
direct-write import is faster, but unreviewable and unable to surface ambiguity; the reviewable batch is the auditable
path consistent with the op-log model ([ADR-0013](../../06-adrs/ADR-0013-interchange-and-interoperability-pylon.md)).

## External identity maps to twin identity, so re-import dedupes

An external source carries its own identifiers — an ArchiMate element `id`, a CMDB CI number, a spreadsheet primary key.
A Pylon import does not adopt those identifiers as twin identity; it **maps** each external identifier onto a twin
entity identity, so that re-importing the same source updates the same entities rather than creating duplicates
([ADR-0013](../../06-adrs/ADR-0013-interchange-and-interoperability-pylon.md)).

The mapping is part of the mapping configuration and is explicit, never guessed. A row or element resolves to a twin
entity by one of two means:

- **A recorded external-id correspondence.** A prior import recorded that external `id = APP-417` corresponds to the
  twin entity `n:application:insight-hub`; the next import of the same source resolves through that correspondence and
  proposes operations against the existing entity. The correspondence is itself Asserted content with import lineage, so
  it is auditable and survives in the op log.
- **A declared match key.** Where no correspondence exists yet, the mapping configuration names the key that identifies
  sameness — typically the entity name within a type, matched against the twin's stable identifier. A clean match
  resolves to the existing entity; **no match** mints a new entity, whose identifier is a **UUIDv5 over the project
  namespace plus the stable name path** ([op / fact / schema model](../../05-modules/mneme/op-fact-schema-model.md),
  [packages and registry](../../03-design/metamodel/packages-and-registry.md)) — the same minting rule the metamodel
  uses, so the same name path always yields the same identifier and a re-import is stable.

Determinism makes the dedupe observable: because the mapping is a pure function of source, metamodel, and configuration,
re-running an import over an unchanged source resolves every external identifier to the same twin entity and proposes an
**empty diff** — the dedupe guarantee made visible. An **ambiguous** match — two twin entities answer one match key — is
surfaced `Awaiting review` ([Documentation Standard §9](../../02-standards/DOCUMENTATION-STANDARD.md)), never resolved
by coin-flip, because guessing would silently merge two distinct entities.

## Operation identity across import retries — the accepted batch

Mapping determinism is **semantic**, not a promise to reuse canonical operation IDs forever. Canonical `op_id`s are
**not** derived from source content alone — that would wrongly collapse two legitimate import events. Consider: import
source S asserts value X; a user later changes it to Y; S is re-run to intentionally restore X. The third step is a
genuinely new assertion at a later asserted time and needs a new operation identity — if S always produced the same
`op_id`, the restore would be discarded as an already-ingested no-op. Identity is therefore scoped to an **accepted
import batch**, in three stages:

1. **Deterministic proposal.** Given the same source content, metamodel version, mapping configuration, and comparison
   viewpoint, the importer proposes the same semantic changes and mapping report (and an empty diff against an unchanged
   twin). This is semantic determinism — no operation is minted yet.
2. **Stable accepted batch.** When the steward accepts, the system creates an `import_batch_id` identifying that one
   accepted intent. For that batch the operation envelopes are stable across retries: each `op_id` is a namespaced UUID
   derived from `workspace_id + import_batch_id + stable_proposal_item_key`. A partially-appended batch is therefore
   safely reproducible without two different accepted imports ever sharing an `op_id`. Every imported operation carries
   provenance: `import_batch_id`, `source_digest`, `mapping_config_digest`, and `source_item_key` — enough for recovery
   and explanation to tell a retry from a later import of the same source.
3. **New acceptance, new identity.** A later intentional import — even from the same file — gets a **new**
   `import_batch_id`. If the twin is unchanged the diff is empty and there is nothing to accept; if the twin changed and
   the source revises or restores facts, acceptance mints new operations with new IDs at a later asserted time. Both
   idempotency and history are preserved.

**Crash-recovery rule:** a retry of the same accepted import batch preserves `import_batch_id` and reproduces the same
`(partition_id, op_id)` set, so already-appended operations are recognised as no-ops on re-ingest
([workspace-integrity-and-recovery](../mneme/workspace-integrity-and-recovery.md)). A bulk import must be able to
reconstruct or retrieve its accepted envelope set; it must not depend on the run-ledger idempotency window
([ADR-0018](../../06-adrs/ADR-0018-idempotency-and-deduplication.md)), which is bounded and may be gone after a runtime
wipe. Aideon-to-Aideon replay and rebuild re-ingest already-minted envelopes; external import deterministically mints a
stable envelope set **within one accepted batch**; canonical IDs are never globally deterministic from source content
alone.

## Reconciliation precedence — what wins when an import disagrees with the twin

When an import proposes a value that disagrees with an existing twin fact, Pylon does not silently overwrite it. The
resolution is governed by the layer model and provenance, not by import-always-wins
([scenarios-and-layers](../../05-modules/mneme/scenarios-and-layers.md)):

- **An import is a layer-scoped Asserted write, not a global override.** Imported content is Asserted with import
  lineage as its corroboration ([ADR-0020](../../06-adrs/ADR-0020-integrity-scoring-model.md)); it lands on the layer
  the import targets (commonly seeding the model). It does not erase a fact on another layer — a `plan` value and an
  imported `actual` value coexist, because layer is a coordinate, not a precedence
  ([scenarios-and-layers](../../05-modules/mneme/scenarios-and-layers.md)).
- **Within a layer, supersession is by asserted time, not by source.** An imported fact that disagrees with an existing
  fact on the same slot, layer, and scenario is a later operation with a larger HLC; it supersedes the earlier fact at
  the current belief while the earlier fact stays resolvable belief-pinned
  ([op / fact / schema model](../../05-modules/mneme/op-fact-schema-model.md)). Supersession is append-only; nothing is
  deleted.
- **A deliberate human-Asserted claim is not overwritten without trace.** Where the import would supersede a fact a
  human deliberately Asserted, the disagreement is surfaced `Awaiting review` rather than written through silently — the
  steward inspects the diff and decides. This is the same respect-for-human-truth discipline Skopos applies to live
  observations ([continuous ingestion](../skopos/continuous-ingestion.md)), and it is why an import is a _reviewable_
  batch: the precedence decision is the steward's, made against an explicit diff, not Pylon's made silently.

The precedence order, stated plainly: **layer policy decides cross-layer combination; asserted time decides within-layer
supersession; and a contradiction of a human-Asserted claim escalates to review rather than resolving by rule.** The
trade-off named: an import-always-wins rule is simpler and faster to accept, but it would let a stale spreadsheet
quietly overwrite a deliberate architectural decision — review-on-contradiction fails safe at the cost of a steward's
attention on the genuine conflicts.

## Export redaction is deny-by-default

An export emits **only what the redaction policy explicitly permits**
([ADR-0013](../../06-adrs/ADR-0013-interchange-and-interoperability-pylon.md)). Sensitive slots — for example a
`DataEntity`'s `sensitivity`, or owner names — and any policy-excluded content are **removed before the file is written,
not after**. This mirrors the filtered-export posture of the host trust boundary
([ADR-0006](../../06-adrs/ADR-0006-tauri-trust-boundary-and-typed-ipc.md)) and is the same deny-by-default discipline
[Kerux](../kerux/README.md) applies on publish ([ADR-0015](../../06-adrs/ADR-0015-reporting-and-publishing-kerux.md));
the two may share the policy grammar. The trade-off named: opt-in redaction is one forgotten flag away from a leak, so
deny-by-default fails safe ([ADR-0013](../../06-adrs/ADR-0013-interchange-and-interoperability-pylon.md)). An export
also records the executing `Viewpoint` it was taken at, so a recipient knows the as-of valid time, layer policy, and
scenario it represents ([ADR-0009](../../06-adrs/ADR-0009-temporal-model-valid-interval-layer-policy-viewpoint.md)).

## Worked example

A steward imports an ArchiMate exchange file. Pylon maps its Application Components to seed `Application` entities and
its Serving relationships to `serves` / `realises`, producing a proposed batch and a mapping report. An element with no
seed type appears `Awaiting review`. The steward inspects the diff, sees it create an `Application` realising
`n:capability:customer-insight`, and accepts; the operations are written as Asserted with import lineage. The import
records that the exchange element's `id` corresponds to the minted twin entity. Re-running the same file resolves that
element through the recorded correspondence to the same entity and produces an empty diff — no duplicate `Application`.

A later import of an updated file gives that same application a new `disposition`. Pylon resolves the element to the
existing entity and proposes a `SetProperty` superseding the prior `disposition` by a larger HLC. But where the file
disagrees with a value a human deliberately Asserted — say a human set `disposition = Tolerate` and the file says
`Eliminate` — the disagreement is surfaced `Awaiting review`, and the steward decides rather than the spreadsheet.

On export at a viewpoint pinned to the actual layer, the policy permits `Application` names and `realises` relationships
but excludes `DataEntity` `sensitivity`. The `DataEntity` `n:data-entity:engagement-event`
(`sensitivity = Confidential`) is exported with its `sensitivity` slot removed before the file is written; the export
header records the viewpoint.

## References & standards

_Normative:_

- The Open Group — **ArchiMate Model Exchange File Format**. The import/export format the deterministic compilation
  targets.

_Informative:_

- Fowler; Young — **Event Sourcing & CQRS**. The append-only operation model acceptance writes through.

Recorded in the [standards register](../../02-standards/STANDARDS-REGISTER.md).

## Related documents

| Document                                                                     | What it covers                                                    |
| ---------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| [Pylon README](./README.md)                                                  | The module index and invariants.                                  |
| [ArchiMate Open Exchange](./archimate-open-exchange.md)                      | The primary format and its mapping.                               |
| [Scenarios and layers](../../05-modules/mneme/scenarios-and-layers.md)       | The layer model the reconciliation precedence rests on.           |
| [Op / fact / schema model](../../05-modules/mneme/op-fact-schema-model.md)   | UUIDv5 identifier minting and supersession-by-asserted-time.      |
| [Skopos continuous ingestion](../skopos/continuous-ingestion.md)             | The same reconciliation discipline for live, automated sources.   |
| [Kerux redaction and PII](../kerux/redaction-and-pii.md)                     | The shared deny-by-default redaction discipline on publish.       |
| [ADR-0013](../../06-adrs/ADR-0013-interchange-and-interoperability-pylon.md) | The decision that fixes determinism, review, and deny-by-default. |
