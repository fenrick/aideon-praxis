# Rebuild-equivalence oracle

The single invariant test that proves a workspace survives a runtime wipe: a derived runtime rebuilt from the canonical op log resolves the **same meaning** as the runtime that was deleted. This is the final assertion of the [golden journey](../../../build-contracts/golden-journey.md) (steps 9–10) and the M0 exit gate ([ROADMAP](../../../00-index/ROADMAP.md)). The equivalence relation and its hash are fixed by [ADR-0027](../../../06-adrs/ADR-0027-projection-consistency-model.md); this file is the test oracle that operationalises them.

## The invariant

> Deleting `.aideon/runtime/` and rebuilding it from `model/ops/` + `model/schema/` yields a twin **semantically equivalent** to the one before the wipe — identical resolved facts at every probe viewpoint and identical query/artefact results — **not** a byte-identical runtime database.

Equivalence is decided by a deterministic hash over the canonical serialisation of resolved results, never by comparing database files. Implementation detail of the derived store (row order, page layout, cache contents) is allowed to differ.

## The single invariant test

| Element               | Value                                                                                                                                                                                                                                                                                                                                                                                             |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Input op set**      | The seed dataset compiled to operations: the `baseline-graph` and `baseline-plan` commits of [`baseline.yaml`](../../base/baseline.yaml) against the [`core-v1.json`](../../meta/core-v1.json) metamodel — twelve entities, ten relationships, two `PlanEvent`s and their `plan_effect`s, plus the FY26 `disposition = Migrate` claim on `Automation Orchestrator`.                               |
| **Procedure**         | (1) Open the workspace and build the runtime. (2) Compute `equivalence_hash` over the probe set. (3) Close the workspace; delete `.aideon/runtime/`. (4) Reopen — the host detects the absent runtime and rebuilds from canonical files as an accepted job ([workspace-integrity-and-recovery](../../../05-modules/mneme/workspace-integrity-and-recovery.md)). (5) Recompute `equivalence_hash`. |
| **Asserted equality** | `equivalence_hash(before_wipe) == equivalence_hash(after_rebuild)`.                                                                                                                                                                                                                                                                                                                               |
| **On inequality**     | A rebuild-correctness defect; the harness reports the first differing probe (viewpoint + query) rather than only the hash mismatch.                                                                                                                                                                                                                                                               |

## The probe set (M0)

The probes are the golden-journey reads over the seed data, each at a fully-qualified viewpoint:

- **Resolve** (step 5): `(automation-orchestrator, disposition)` and a representative slot on each seed entity type, at two viewpoints differing by as-of valid time — one before and one on/after `2026-01-01` — at latest belief, `actual` layer, base scenario.
- **Catalogue** (step 7): the catalogue artefact over the `Application` scope at the same two viewpoints (rows, per-row provenance/classification, pagination cursor, integrity).

The probe set is fixed and ordered so the hash is reproducible; extending it is a deliberate change to the oracle, not an incidental one.

## The hash definition

```text
equivalence_hash = BLAKE3(
  concat over probes (in fixed probe order) of
    canonical_serialisation(resolve_or_execute(probe))
)
```

`canonical_serialisation` reduces each result to a stable byte form:

- object keys sorted lexicographically; arrays in their contract-defined sort order;
- identifiers as canonical lower-case UUID strings; valid/asserted times as `i64` microseconds;
- numbers in canonical decimal form;
- result-state / coverage badges **included** (they are part of the resolved meaning);
- implementation-only fields **excluded** — storage row ids, physical ordering hints, cache freshness timestamps, and any in-flight `ProjectionFreshnessStatus`.

BLAKE3 is the same family used for sealed-segment and export-package checksums ([ADR-0002](../../../06-adrs/ADR-0002-portable-workspace-format.md)), so the project carries one hash family across integrity, export, and rebuild equivalence. The same relation also checks snapshot-plus-tail against full replay and incremental refresh against full rebuild ([export-import-replay](../../../05-modules/mneme/export-import-replay.md), [ADR-0027](../../../06-adrs/ADR-0027-projection-consistency-model.md)).

> **Honest state.** The concrete expected hash value and the serialised probe-result fixtures are produced once the resolve and catalogue oracles land (Increments 3–4). This file fixes the _relation, inputs, and assertion_ now; the golden value is filled in when the resolution and catalogue fixtures exist, marked _(oracle: planned)_ until then.

## Related documents

| Document                                                                                          | What it covers                                         |
| ------------------------------------------------------------------------------------------------- | ------------------------------------------------------ |
| [ADR-0027](../../../06-adrs/ADR-0027-projection-consistency-model.md)                             | The equivalence relation and hash definition.          |
| [golden-journey](../../../build-contracts/golden-journey.md)                                      | Steps 9–10, the final assertion this oracle proves.    |
| [workspace-integrity-and-recovery](../../../05-modules/mneme/workspace-integrity-and-recovery.md) | Rebuild as the recovery path.                          |
| [operation fixtures](../operations/README.md)                                                     | The op-set building blocks the input is compiled from. |
| [M0 build contract](../../../build-contracts/M0-foundation.md)                                    | The milestone this oracle gates.                       |
