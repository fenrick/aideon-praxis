# Merge and conflict

How Praxis surfaces the result of merging one scenario branch into another: as domain-language `MergeConflict` records, never as raw store errors. For a reader who needs to know what a merge returns and how conflicts are detected.

The cross-module sync-and-conflict model that hosted, multi-author collaboration will build on is [ADR-0005](../../06-adrs/ADR-0005-sync-and-conflict-model.md); this file is the local, single-workspace scenario merge that Praxis performs today.

---

## Scenarios are overlays; merging composes them

A [scenario](../../../CONTEXT.md) is an alternate world — an additive overlay on the base case, orthogonal to layer. Praxis resolves a snapshot by materialising the base and applying the scenario overlay ([temporal and scenario context](../../04-contracts/TEMPORAL-AND-SCENARIO-CONTEXT.md)). Merging composes one branch's operations into another: a `MergeRequest` names the source and target branches, and Praxis returns a `MergeResponse` carrying any conflicts.

A merge is the point at which two independently authored lines of change meet, so it is the point at which they may disagree. Praxis's obligation is to report that disagreement in terms the user authored in — capabilities, applications, relationships, attributes — not in terms of storage rows or commit hashes.

---

## Conflicts are domain-language records

A conflict is returned as a `MergeConflict` record with a `kind` and a human-readable `message`, never as a raw store error. The conflict kinds Praxis distinguishes are structural and slot-level:

| Conflict kind                       | What it means                                                                                                                                |
| ----------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| Concurrent attribute change         | Both branches set the same slot on the same entity or relationship to different values over an overlapping valid-time interval.              |
| Create/delete divergence            | One branch deleted (tombstoned) an entity that the other branch updated or linked.                                                           |
| Relationship endpoint divergence    | One branch removed an endpoint the other branch's relationship depends on, which would break referential integrity on merge.                 |
| Duplicate or self-link introduction | The merged result would violate a relationship type's `allowDuplicate: false` or `allowSelf: false` rule that neither branch violated alone. |

Each record names the affected entity or relationship by its stable domain identifier and states what each side did, so a steward can resolve it as a modelling decision rather than a diff hunk.

---

## Detection rests on resolution, not text

Conflict detection is semantic, not textual. Because facts are slot-addressed and time-versioned ([`CONTEXT.md`](../../../CONTEXT.md), _Slot_, _Fact_), Praxis detects a conflict by resolving each side at the merge point and comparing the _claims_, not the operations that produced them. Two branches that set the same slot to the _same_ value do not conflict, even though they appended different operations; two branches that set it to different values over an overlapping interval do. This is the same reasoning the resolver uses for layer policy and supersession, applied across branches.

The trade-off this closes: semantic detection cannot be as cheap as comparing operation logs byte-for-byte, because it must resolve both sides. Praxis accepts that cost because a textual merge would report false conflicts (different operations, same outcome) and miss real ones (same slot, incompatible values resolved differently), neither of which a steward can act on.

A merge that detects no conflict applies; a merge with conflicts returns them and applies nothing until they are resolved, consistent with the atomicity of authoring ([tasks and Change Events](./tasks-and-change-events.md)).

---

## Worked example — conflicting dispositions on Automation Orchestrator

From the [baseline](../../data/base/baseline.yaml), the `Application` **Automation Orchestrator** carries `disposition = Migrate`. Suppose two scenario branches diverge from the base:

- branch `retire-2026` sets `Automation Orchestrator.disposition = Retire`, effective `2026-07-01`;
- branch `invest-2026` sets `Automation Orchestrator.disposition = Invest`, effective `2026-07-01`.

Merging `invest-2026` into `retire-2026` resolves both branches at the merge point. Both set the same slot (`disposition`) on the same entity over the same valid-time interval to different values, so Praxis returns one `MergeConflict` of kind _concurrent attribute change_, naming `n:application:automation-orchestrator`, stating "Retire (retire-2026) vs Invest (invest-2026) from 2026-07-01". No operation is applied; the steward decides which disposition the merged world holds. Had both branches instead set `disposition = Retire`, the resolved claims would match and the merge would apply with no conflict.

---

## Related documents

| Document                                                                             | What it covers                                              |
| ------------------------------------------------------------------------------------ | ----------------------------------------------------------- |
| [Temporal and scenario context](../../04-contracts/TEMPORAL-AND-SCENARIO-CONTEXT.md) | The commit, scenario, and merge contract.                   |
| [Tasks and Change Events](./tasks-and-change-events.md)                              | The atomicity a merge preserves.                            |
| [ADR-0005](../../06-adrs/ADR-0005-sync-and-conflict-model.md)                        | The sync-and-conflict model for multi-author collaboration. |
| [Edge catalogue — constraints and rules](./edge-catalogue/constraints-and-rules.md)  | The self/duplicate/endpoint rules a merge must not violate. |
| [`baseline.yaml`](../../data/base/baseline.yaml)                                     | The seed dataset the example uses.                          |
