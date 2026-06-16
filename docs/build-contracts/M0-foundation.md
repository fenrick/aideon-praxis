# M0 build contract — Foundation

The M0 milestone delivers the **foundation capability**: a portable workspace that opens, round-trips a session, and rebuilds losslessly. Its exit gate is that the canonical workspace format is closed enough to build against, every operation has a pinned shape and a validating fixture, and deleting the derived runtime then rebuilding it from canonical files yields a semantically equivalent twin — with typed IPC and capabilities enforced and no open ports ([ROADMAP](../00-index/ROADMAP.md), M0 row). This contract turns that gate into named files, ordered work, and exit tests an agent can complete without making an architectural choice.

## Outcome

A workspace folder ([ADR-0002](../06-adrs/ADR-0002-portable-workspace-format.md)) can be created, opened for writing under a single-writer lock, written to via the typed operation surface, closed, and reopened. Its derived runtime (`.aideon/runtime/`) can be deleted while closed and rebuilt from `model/ops/` + `model/schema/` on reopen, producing a twin that resolves identical facts and identical query results to the one before the wipe — proven by a deterministic equivalence hash ([ADR-0027](../06-adrs/ADR-0027-projection-consistency-model.md)). Every operation kind has a tier-2 JSON Schema and a validating fixture pair.

## In scope

- Workspace format v1: complete `manifest.json` field schema, identifier formats, segment ordering and sealing, the atomic-write/fsync sequence, integrity checksums and their coverage, truncation and sealed-segment-corruption behaviour, version maxima, and the `model/schema/` vs op-log authority rule.
- Per-operation JSON Schemas (2020-12) for the shared envelope and every op kind, plus a validating valid/invalid fixture pair per kind over the seed identifiers.
- The rebuild-equivalence relation and its hash, and the single invariant test oracle.

## Out of scope

- The metamodel compile/validate path and invalid-write rejection (M1; [op-fact-schema-model](../05-modules/mneme/op-fact-schema-model.md)).
- Temporal resolution, viewpoints, and diff (M2; [temporal-and-scenario](../04-contracts/temporal-and-scenario/README.md)).
- Artefact execution and the catalogue result shape (M3).
- The expected-output golden hash value for the rebuild test (filled in once the resolve/catalogue oracles land, Increments 3–4).
- Drift-checking the new operation schemas in CI (follow-up; the existing `*-manifest.json` checks under `tests/` are untouched).
- The two scenario-lifecycle op kinds (`CreateScenario`, `DeleteScenario`).

## Authoritative sources

In precedence order ([contract precedence](./README.md#contract-precedence)):

1. **ADRs** — [ADR-0001](../06-adrs/ADR-0001-workspace-is-canonical-authority.md) (workspace is canonical), [ADR-0002](../06-adrs/ADR-0002-portable-workspace-format.md) (portable format), [ADR-0003](../06-adrs/ADR-0003-content-addressed-object-store.md) (content-addressed blobs), [ADR-0027](../06-adrs/ADR-0027-projection-consistency-model.md) (projection consistency + rebuild equivalence), [ADR-0016](../06-adrs/ADR-0016-error-envelope-rfc9457.md) (error envelope), [ADR-0018](../06-adrs/ADR-0018-idempotency-and-deduplication.md) (idempotent ingest).
2. **Schemas** — [`docs/contracts/operations/`](../contracts/operations/README.md) (envelope + per-op-kind), and the command surface in [`ipc-manifest.json`](../contracts/ipc-manifest.json).
3. **Contract docs** — [op-fact-schema-model](../05-modules/mneme/op-fact-schema-model.md), [identifier-generation-and-provenance](../05-modules/mneme/identifier-generation-and-provenance.md), [workspace-integrity-and-recovery](../05-modules/mneme/workspace-integrity-and-recovery.md), [export-import-replay](../05-modules/mneme/export-import-replay.md).
4. **Fixtures** — [`docs/data/fixtures/operations/`](../data/fixtures/operations/README.md), [`docs/data/fixtures/rebuild/`](../data/fixtures/rebuild/README.md), seeded from [`core-v1.json`](../data/meta/core-v1.json) and [`baseline.yaml`](../data/base/baseline.yaml).

## Contracts and fixtures this milestone produces

| Path                                                                                                   | What it pins                                                                                         |
| ------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------- |
| [`docs/contracts/operations/op-envelope.schema.json`](../contracts/operations/op-envelope.schema.json) | The canonical append record shape.                                                                   |
| `docs/contracts/operations/<op-kind>.schema.json` (9 files)                                            | Each operation kind's payload shape, grounded in the Rust DTOs.                                      |
| [`docs/contracts/operations/README.md`](../contracts/operations/README.md)                             | The schema index, serde conventions, and tier-2 status.                                              |
| `docs/data/fixtures/operations/<op-kind>.valid.json` / `.invalid.json`                                 | A passing and a failing example per op kind, over seed identifiers.                                  |
| [`docs/data/fixtures/operations/README.md`](../data/fixtures/operations/README.md)                     | The seed identifiers used and the failure reason per invalid fixture.                                |
| [`docs/data/fixtures/rebuild/README.md`](../data/fixtures/rebuild/README.md)                           | The rebuild-equivalence oracle: input op set, asserted equality, hash definition.                    |
| `docs/05-modules/mneme/workspace-integrity-and-recovery.md` (extended)                                 | The closed on-disk format v1: manifest, identifiers, sealing, checksums, recovery, schema authority. |
| `docs/06-adrs/ADR-0002…` (extended)                                                                    | The manifest field summary and the schema-authority rule, within the ADR.                            |
| `docs/06-adrs/ADR-0027…` (extended)                                                                    | The rebuild-equivalence relation and hash.                                                           |

## Module ownership

- **Mneme** ([`crates/mneme_core`](../../crates/mneme_core), [`crates/mneme_store`](../../crates/mneme_store)) — the op envelope, op kinds, schema-as-data, the canonical files, sealing, checksums, and rebuild.
- **Host** ([`src-tauri`](../../src-tauri)) — workspace lifecycle (open/close/lock), the typed IPC surface, capability enforcement, and the rebuild trigger ([workspace-lifecycle](../05-modules/host/workspace-lifecycle.md)).
- **Engine** ([`crates/engine`](../../crates/engine)) — the in-process execution seam the host calls.

## Implementation sequence

Dependency-ordered:

1. **Workspace format v1 closure** — manifest schema, identifiers, sealing/ordering, atomic-write sequence, checksums, recovery rules, version maxima, schema-authority rule. Everything else assumes a settled on-disk format.
2. **Operation schemas + fixtures** — envelope first, then per-op-kind schemas, then the valid/invalid fixture pairs (validated against the schemas).
3. **Rebuild-equivalence relation + oracle** — the hash definition and the single invariant test, which depends on both the format and the op shapes being fixed.
4. **Host lifecycle + IPC enforcement** — open/lock/close/reopen and the rebuild-on-missing-runtime path, exercising the format and the equivalence oracle.

## Golden-journey segment

This milestone covers golden-journey steps **1, 8, 9, 10** ([golden-journey](./golden-journey.md)): create and open a workspace, close and reopen it, delete `.aideon/runtime/`, and rebuild with proven equivalence. (Steps 2–3 are M1, 4–6 are M2, 7 is M3.)

## Exit tests

Each assertion maps to its oracle fixture:

| Assertion                                                                                              | Oracle                                                                                                                                          |
| ------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| A fresh workspace has a format-v1 `manifest.json` with all required fields and valid identifiers.      | The manifest field schema in [workspace-integrity-and-recovery](../05-modules/mneme/workspace-integrity-and-recovery.md).                       |
| Every op-kind valid fixture validates against its schema.                                              | `docs/data/fixtures/operations/<op-kind>.valid.json` against `docs/contracts/operations/<op-kind>.schema.json`.                                 |
| Every op-kind invalid fixture is rejected for its stated reason.                                       | `docs/data/fixtures/operations/<op-kind>.invalid.json` + the reason table in the fixtures README.                                               |
| A torn loose-segment write recovers to the last whole record; the partial tail is discarded, not lost. | The truncated-final-record rule in [workspace-integrity-and-recovery](../05-modules/mneme/workspace-integrity-and-recovery.md).                 |
| A corrupt sealed segment is detected and named, never silently skipped.                                | The sealed-segment-corruption rule, same doc + [failure-modes](../05-modules/mneme/failure-modes.md).                                           |
| A workspace newer than `MAX_WORKSPACE_FORMAT_VERSION` is refused with `WORKSPACE_FORMAT_TOO_NEW`.      | The version-maxima table, same doc + [ADR-0016](../06-adrs/ADR-0016-error-envelope-rfc9457.md).                                                 |
| A stale `model/schema/` is recompiled from the op log on open; the op log wins.                        | The schema-authority rule, same doc.                                                                                                            |
| Delete `.aideon/runtime/`, rebuild, and the equivalence hash matches before vs after.                  | [`docs/data/fixtures/rebuild/README.md`](../data/fixtures/rebuild/README.md) + [ADR-0027](../06-adrs/ADR-0027-projection-consistency-model.md). |

## Open questions

Design-intent items not yet pinned in code, to resolve before or during build:

- **`manifest.json` is design-intent.** No `manifest.json` writer/reader exists in `crates/mneme_store` yet; the field schema is specified from [ADR-0002](../06-adrs/ADR-0002-portable-workspace-format.md), not read back from code. The exact `feature_flags` keys are unspecified.
- **Sealing thresholds are provisional configuration**, not invariants; the 8 MiB / 24 h defaults are placeholders.
- **The rebuild equivalence golden hash value is not yet computable** — it needs the resolve (M2) and catalogue (M3) oracles. The relation, inputs, and assertion are fixed now; the value lands later.
- **Scenario-lifecycle op kinds** (`CreateScenario`/`DeleteScenario`) are inline `OpPayload` variants without dedicated input structs and are not schema'd in this increment.
- **Operation-schema drift-checking is not wired** — the schemas are authoritative-by-review until a CI check pins them to the Rust DTOs.

## Related documents

| Document                                                                                    | What it covers                                 |
| ------------------------------------------------------------------------------------------- | ---------------------------------------------- |
| [golden-journey](./golden-journey.md)                                                       | Steps 1, 8, 9, 10 that this contract delivers. |
| [ROADMAP](../00-index/ROADMAP.md)                                                           | The M0 exit criteria.                          |
| [operations schemas](../contracts/operations/README.md)                                     | The tier-2 op shapes.                          |
| [operation fixtures](../data/fixtures/operations/README.md)                                 | The validating examples.                       |
| [rebuild oracle](../data/fixtures/rebuild/README.md)                                        | The rebuild-equivalence invariant test.        |
| [workspace-integrity-and-recovery](../05-modules/mneme/workspace-integrity-and-recovery.md) | The closed on-disk format.                     |
