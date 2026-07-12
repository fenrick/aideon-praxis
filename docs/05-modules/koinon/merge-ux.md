# Merge UX

How a steward resolves a recorded conflict — comparing the two sides and authoring a superseding Change Event. For
practitioners reasoning about the human side of conflict resolution.

> **PLANNED.** No `koinon` crate exists; this is design intent per
> [ADR-0029](../../06-adrs/ADR-0029-collaboration-and-sync-koinon.md).

## Resolution is authoring, not overwriting

A conflict is a recorded `conflict.recorded` operation shown `Awaiting review`
([sync and conflict](./sync-and-conflict.md);
[Documentation Standard §9](../../02-standards/DOCUMENTATION-STANDARD.md)). Resolution is **an authored Change Event
that supersedes**, recorded like any other operation — never a silent overwrite
([ADR-0029](../../06-adrs/ADR-0029-collaboration-and-sync-koinon.md);
[ADR-0005](../../06-adrs/ADR-0005-sync-and-conflict-model.md)). The merge UX exists to let a steward make that authored
choice from informed comparison: it presents the two incompatible sides, and the steward authors the superseding claim.
Both the conflict and its resolution remain in the durable op stream, so the history shows that a conflict occurred and
how it was settled.

## What the UX must show

The conflict-resolution UX is **provisional** ([ADR-0029](../../06-adrs/ADR-0029-collaboration-and-sync-koinon.md)); the
open question is how a steward compares the two sides and authors the superseding Change Event
([ADR-0029](../../06-adrs/ADR-0029-collaboration-and-sync-koinon.md)). The design intent is that it surfaces, for each
conflict, the information needed to decide without leaving the surface:

- the **subject, slot, and valid-time interval** in contention;
- the **two incompatible values** and their provenance — who asserted each, as of when, and the content classification
  of each ([`CONTEXT.md`](../../../CONTEXT.md));
- the **conflict kind** (incompatible values, delete-versus-edit, schema-meaning change, or a blob-replacement race —
  [sync and conflict](./sync-and-conflict.md)); and
- an affordance to **author the superseding Change Event** through the normal canonical path.

Because conflicts are resolved through the same Change Event machinery as any edit
([`CONTEXT.md`](../../../CONTEXT.md)), the resolution carries its own owner, rationale, and asserted time, and is
attributable like any operation.

## The steward is the authority

Conflict resolution sits naturally with the **Steward participation mode**
([ARTEFACTS-AND-FAMILIES.md](../../03-design/ARTEFACTS-AND-FAMILIES.md)), where a review owner works through queues and
comparisons rather than open editing. Themis governance ([ADR-0030](../../06-adrs/ADR-0030-governance-themis.md)) may
require the resolving Change Event to be approved, and gates which peer's operations are admitted in the first place — a
remote peer is untrusted input until its operations validate against the metamodel
([ADR-0006](../../06-adrs/ADR-0006-tauri-trust-boundary-and-typed-ipc.md)).

## Worked example

Following the conflict from [sync and conflict](./sync-and-conflict.md) — peer A set the seed `Application`
`n:application:automation-orchestrator` to `disposition = Migrate`, peer B to `Retire` — the merge UX shows the steward
both values, that A asserted Migrate and B asserted Retire over the same interval, both Asserted content, and that the
conflict kind is "incompatible values". The steward decides Migrate is correct, with the rationale that the platform is
being moved rather than shut down, and authors a superseding Change Event recording `disposition = Migrate` as a new
Asserted operation. The `conflict.recorded` operation and the resolving Change Event both remain in the op stream;
replaying the history reproduces the conflict and its resolution.

## References & standards

_Informative:_

- Shapiro et al. — **Conflict-free Replicated Data Types**, 2011. The convergence model that leaves these cases for
  human resolution.

Recorded in the [standards register](../../02-standards/STANDARDS-REGISTER.md).

## Related documents

| Document                                                             | What it covers                                                   |
| -------------------------------------------------------------------- | ---------------------------------------------------------------- |
| [Koinon README](./README.md)                                         | The module index and invariants.                                 |
| [Sync and conflict](./sync-and-conflict.md)                          | How a conflict is recorded before resolution.                    |
| [Themis approvals and workflow](../themis/approvals-and-workflow.md) | The approval a resolving Change Event may require.               |
| [ADR-0029](../../06-adrs/ADR-0029-collaboration-and-sync-koinon.md)  | The decision that fixes resolution as authored, not overwritten. |
