# Retention and audit

How Themis defines what must be audited and retained without keeping a parallel store, and how retention reconciles with an append-only op log. For practitioners reasoning about audit trails and data-retention obligations.

> **PLANNED.** No `themis` crate exists; this is design intent per [ADR-0030](../../06-adrs/ADR-0030-governance-themis.md).

## Audit derives; it does not duplicate

Themis defines **what must be auditable and retained**; it does **not** keep a second source of truth ([ADR-0030](../../06-adrs/ADR-0030-governance-themis.md)). Every governed action is attributable through the **append-only op log** ([ADR-0001](../../06-adrs/ADR-0001-workspace-is-canonical-authority.md)) and correlated by **trace context** ([ADR-0019](../../06-adrs/ADR-0019-observability-and-trace-context.md); OpenTelemetry, W3C Trace Context). The audit trail is therefore _derived_: who did what, as of when, attributed to which principal, falls out of the operations and their trace correlation, rather than being written to a parallel audit table that could drift from the canonical history.

This is the same canonical/derived discipline the whole product follows ([ADR-0001](../../06-adrs/ADR-0001-workspace-is-canonical-authority.md)): the op log is truth; audit is a view of it. A parallel audit store would be a second authority that could disagree with the op log, which is exactly the failure mode the derive-don't-duplicate rule prevents.

## Retention over types and classifications

Retention policy governs **how long content and its derivations are kept**, expressed as policy over types and content classifications ([ADR-0030](../../06-adrs/ADR-0030-governance-themis.md)). For example, a policy might retain Asserted facts about a `DataEntity` for a defined period and expire certain derivations sooner. The **retention-policy expression language is provisional** ([ADR-0030](../../06-adrs/ADR-0030-governance-themis.md)).

## Retention versus the append-only invariant

Retention interacts sharply with the append-only invariant, and the design is honest that this is unresolved. The op log is **forward-only**: nothing is erased in place ([ADR-0001](../../06-adrs/ADR-0001-workspace-is-canonical-authority.md)). So **deleting content for retention is itself a recorded, forward-only operation, never an in-place erase** ([ADR-0030](../../06-adrs/ADR-0030-governance-themis.md)). How "delete after N years" is expressed when truth is forward-only is an **open question** the ADR flags for resolution ([ADR-0030](../../06-adrs/ADR-0030-governance-themis.md)): a retention deletion records _that_ content was retired for retention, which is itself an auditable event, but reconciling a hard regulatory erase requirement with an append-only history is not yet settled. The document states this rather than pretending it is solved.

## Worked example

A governed change sets the seed `Application` `n:application:automation-orchestrator` to `disposition = Retire`, accepted by an approver in hosted mode ([approvals and workflow](./approvals-and-workflow.md)). The audit answer to "who retired this application and when?" is derived: the operation in the op log carries the asserted time and the approver as its attribution, and the trace context correlates it to the request that produced it — no separate audit entry is written. A retention policy that says "expire retired-application derivations after N years" is applied as a forward-only operation recording the retention action when the period elapses; the operation that originally set `Retire` is not erased in place, and the open question above governs how a stricter erase obligation would be met.

## References & standards

_Normative:_

- **OpenTelemetry**; W3C **Trace Context**. Correlation the derived audit relies on.

_Informative:_

- **OWASP ASVS 5.0**. Logging and audit verification expectations.

Recorded in the [standards register](../../02-standards/STANDARDS-REGISTER.md).

## Related documents

| Document                                                               | What it covers                                                        |
| ---------------------------------------------------------------------- | --------------------------------------------------------------------- |
| [Themis README](./README.md)                                           | The module index and invariants.                                      |
| [Approvals and workflow](./approvals-and-workflow.md)                  | How an approved action becomes an attributable operation.             |
| [ADR-0001](../../06-adrs/ADR-0001-workspace-is-canonical-authority.md) | The append-only op log audit derives from and retention must respect. |
| [ADR-0019](../../06-adrs/ADR-0019-observability-and-trace-context.md)  | The trace-context correlation audit uses.                             |
