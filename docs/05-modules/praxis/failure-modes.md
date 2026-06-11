# Failure modes

How Praxis fails honestly: what each failure returns, and how a partial or bounded result is distinguished from an error. For a reader handling Praxis errors or designing the surfaces that present them.

Praxis's failure surface is `PraxisError` / `PraxisResult` ([crate structure](./crate-structure.md)); at the IPC boundary these map to the stable error envelope of [ADR-0016](../../06-adrs/ADR-0016-error-envelope-rfc9457.md) (RFC 9457). This file is the taxonomy and the honest-state rules.

---

## Two kinds of "not the happy path"

A reader must keep two things separate, because they need different responses:

- A **failure** is an error: the operation could not be performed and returns a `PraxisError`. Nothing was applied (authoring is atomic — [tasks and Change Events](./tasks-and-change-events.md)).
- A **bounded or stale result** is _not_ a failure: the operation succeeded but its coverage or freshness is limited, and it is returned with an honest-state flag ([Documentation Standard §9](../../02-standards/DOCUMENTATION-STANDARD.md)), not an error code.

Conflating the two is itself a defect: a Bounded artefact result is a successful answer with stated coverage, and presenting it as an error would hide a usable result; an error presented as a Bounded result would imply data exists where none does.

---

## Failure taxonomy

| Failure                   | When it occurs                                                                                                                                                     | What it returns                                                                                                                                                         |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Validation failure        | An operation violates the effective schema — unknown type, illegal enum value, endpoint-type mismatch, self/duplicate-rule violation, dangling-relationship delete | A validation-category error naming the offending entity/relationship and the rule; the whole task is rejected ([tasks and Change Events](./tasks-and-change-events.md)) |
| Concurrency conflict      | A task races another write and loses the compare-and-swap on the branch head                                                                                       | A conflict error; the caller re-resolves and retries — never a silent overwrite                                                                                         |
| Merge conflict            | A scenario merge detects incompatible claims                                                                                                                       | A `MergeResponse` with `MergeConflict` records (domain language), not a store error ([merge and conflict](./merge-and-conflict.md))                                     |
| Metamodel compile failure | The metamodel cannot compile — an inheritance cycle, a malformed package                                                                                           | A hard integrity error; the metamodel is not published, so no later write proceeds against a bad schema ([metamodel ownership](./metamodel-ownership.md))               |
| Storage failure           | Mneme cannot read or append                                                                                                                                        | The underlying storage error mapped to a Praxis error; raw internals never leak across the IPC boundary ([ADR-0016](../../06-adrs/ADR-0016-error-envelope-rfc9457.md))  |

A storage internal — a SQLite error string, a row reference — must never appear raw in a returned message; it is mapped to a stable, machine-readable code first.

---

## Honest-state results, not errors

These outcomes succeed and carry a result state, not an error:

| Result state          | When                                                                                                                                                                                                  | Meaning                                                   |
| --------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------- |
| **Partial / Bounded** | An artefact traversal hit a depth, size, fanout, or time limit ([artefact execution](./artefact-execution.md)); or integrity gated a dependent analytic ([integrity scoring](./integrity-scoring.md)) | Coverage is incomplete by design and stated explicitly    |
| **Stale**             | A canonical input changed since a cached result was computed ([ADR-0027](../../06-adrs/ADR-0027-projection-consistency-model.md))                                                                     | Re-evaluation is due; the prior result is shown meanwhile |
| **Rebuilding**        | A derived structure is being recomputed                                                                                                                                                               | A prior snapshot is shown until the rebuild completes     |
| **Awaiting review**   | Content is queued for human confirmation (an import exception, a steward task)                                                                                                                        | Not yet Asserted                                          |

The drill-down on an integrity score and the coverage note on a Bounded traversal are part of the successful result, not error metadata. A score below the gate threshold does not error — it causes dependent analytics to declare themselves Bounded ([integrity scoring](./integrity-scoring.md)).

---

## Recovery posture

Praxis's recovery rules follow from its invariants:

- **Atomic rollback on failure.** A failed task applies nothing; there is no half-applied state to clean up ([tasks and Change Events](./tasks-and-change-events.md)).
- **Recompute, never repair in place.** A stale or inconsistent derived result is recomputed from canonical material, not patched ([ADR-0027](../../06-adrs/ADR-0027-projection-consistency-model.md)); the op log is the durable truth and is never edited ([ADR-0001](../../06-adrs/ADR-0001-workspace-is-canonical-authority.md)).
- **Conflicts surface to a human.** Merge and concurrency conflicts are returned for resolution, not auto-resolved by a precedence Praxis invents.

---

## Worked example — a rejected migration task

Authoring a task that sets `Automation Orchestrator.disposition = Migrate` _and_ adds a `plan_effect` whose `target_ref` is missing (from the [baseline](../../data/base/baseline.yaml) shape). Praxis validates the whole operation set before append: the `disposition` update is legal, but the `plan_effect` fails its required-attribute rule. The task returns a single validation-category error naming the offending `plan_effect` and the missing `target_ref`; the legal `disposition` update is **not** applied, because the task is atomic. The caller fixes `target_ref` and re-submits; only then do both operations land together.

---

## Related documents

| Document                                                           | What it covers                                                    |
| ------------------------------------------------------------------ | ----------------------------------------------------------------- |
| [ADR-0016](../../06-adrs/ADR-0016-error-envelope-rfc9457.md)       | The RFC 9457 error envelope Praxis errors map to at the boundary. |
| [Tasks and Change Events](./tasks-and-change-events.md)            | The atomicity that makes failures clean.                          |
| [Merge and conflict](./merge-and-conflict.md)                      | Conflicts returned as domain records, not errors.                 |
| [Artefact execution](./artefact-execution.md)                      | The bounds that produce Partial / Bounded results.                |
| [ADR-0027](../../06-adrs/ADR-0027-projection-consistency-model.md) | The recompute-on-input-change recovery model.                     |
