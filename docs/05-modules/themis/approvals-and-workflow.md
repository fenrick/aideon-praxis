# Approvals and workflow

How Themis models approvals as first-class governance, and how they underpin the Steward participation mode. For practitioners reasoning about what must be approved before a change lands.

> **PLANNED.** No `themis` crate exists; this is design intent per [ADR-0030](../../06-adrs/ADR-0030-governance-themis.md).

## Approvals are first-class

A governed change may require approval before it lands. Themis models the **approval workflow** — who must approve, in what order, with what queue — as a first-class governance concern ([ADR-0030](../../06-adrs/ADR-0030-governance-themis.md)). A pending change is shown `Awaiting review` ([Documentation Standard §9](../../02-standards/DOCUMENTATION-STANDARD.md)); **acceptance writes the operation through the normal canonical path, attributed to the approver** ([ADR-0030](../../06-adrs/ADR-0030-governance-themis.md)). There is no separate "approved store": an approval results in a normal, attributable operation, so the approval is auditable like any other action ([retention and audit](./retention-and-audit.md)).

In the policy-decision interface, an approval requirement is the `RequireApproval` outcome (alongside `Permit` and `Deny`, [Themis README](./README.md)): Themis tells the Host the action may proceed only once the approval workflow completes.

## Underpinning the Steward mode

Approvals are what make the **Steward participation mode** structured review rather than open editing ([ARTEFACTS-AND-FAMILIES.md](../../03-design/ARTEFACTS-AND-FAMILIES.md)). A steward works through queues of pending changes — for example imports `Awaiting review` from [Pylon](../pylon/README.md), generated suggestions from [Sophia](../sophia/README.md), or conflict resolutions from [Koinon](../koinon/README.md) — and the approval workflow decides which require sign-off and from whom before they become Asserted facts. The same `Awaiting review` state that Pylon, Sophia, and Koinon use is the state an approval queue presents, so the honesty vocabulary is consistent across the product.

## Composing with durable jobs

A multi-step approval — several approvers in sequence, or an approval that waits on an external step — is long-running, so it composes with **Continuum durable jobs** ([ADR-0030](../../06-adrs/ADR-0030-governance-themis.md)). How the approval-workflow vocabulary composes with Continuum is an open question; the **approval-workflow vocabulary itself is provisional** ([ADR-0030](../../06-adrs/ADR-0030-governance-themis.md)). What is fixed is that a pending multi-step approval is durable accepted-work, not a synchronous call that a crash would lose.

## The trade-off, stated

The split — Themis decides, the Host enforces ([capability policy](./capability-policy.md)) — means a governed command consults two layers: the policy decision and the boundary enforcement. That is a deliberate cost. It buys a verifiable access-control story mapped to ASVS rather than authority assumed at the call site ([ADR-0030](../../06-adrs/ADR-0030-governance-themis.md)).

## Worked example

In hosted mode, an architect proposes setting the seed `Application` `n:application:automation-orchestrator` to `disposition = Retire`. Themis policy returns `RequireApproval` because retiring an application with downstream dependencies needs a control owner's sign-off. The change is shown `Awaiting review` in the approver's queue under the Steward mode. The approver reviews and accepts; the operation setting `disposition = Retire` is written through the normal canonical path, attributed to the approver, and is auditable through the op log. Had the approval needed two approvers in sequence, the workflow would run as a Continuum durable job so a crash between the two sign-offs loses nothing.

## References & standards

_Normative:_

- **OWASP ASVS 5.0** — V8 Authorization. The access-control posture approvals enforce.

_Informative:_

- van der Aalst et al. — **Workflow Patterns**. Vocabulary for the approval control flow (via Continuum).

Recorded in the [standards register](../../02-standards/STANDARDS-REGISTER.md).

## Related documents

| Document                                                | What it covers                                 |
| ------------------------------------------------------- | ---------------------------------------------- |
| [Themis README](./README.md)                            | The module index and invariants.               |
| [Retention and audit](./retention-and-audit.md)         | How an approved action stays attributable.     |
| [Koinon merge UX](../koinon/merge-ux.md)                | A conflict resolution an approval may gate.    |
| [ADR-0030](../../06-adrs/ADR-0030-governance-themis.md) | The decision that makes approvals first-class. |
