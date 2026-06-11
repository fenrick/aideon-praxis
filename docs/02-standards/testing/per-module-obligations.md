# Per-Module Obligations

What each module's tests must cover. These are the minimum obligations on top of the layer rules ([test-layers.md](./test-layers.md)) and the boundary discipline ([boundary-and-contract-tests.md](./boundary-and-contract-tests.md)); the coverage targets are in [coverage-and-gates.md](./coverage-and-gates.md).

## `src/` (Renderer)

- **Unit:** adapters, hooks, store reducers, utility functions.
- **Contract:** all IPC commands in `ipc-manifest.json` ([boundary-and-contract-tests.md](./boundary-and-contract-tests.md)).
- **DTO parity:** every DTO type paired with its Rust counterpart.
- **UI component smoke:** loading, error, and empty states covered by Vitest + Testing Library.
- **Renderer boundary:** assert no `fetch`/`XMLHttpRequest`/FS calls outside IPC; use `mockIPC`/`mockWindows` exclusively ([security/](../security/README.md)).
- **Cancellation:** an aborted async call cleans up and does not set state after unmount ([CODING-STANDARDS.md §10](../CODING-STANDARDS.md#10-async-and-cancellation-abortsignal)).

## `src-tauri` (Host)

- **Unit:** command handlers, error mapping, config resolution.
- **Integration:** `WorkerState` dispatch to engine traits; cold-start workspace resolution; capability/permission checks ([capability-scoping.md](../security/capability-scoping.md)).
- **Crash recovery:** the three required scenarios ([test-layers.md](./test-layers.md)).
- **IPC envelope:** every command handler tested for correct `Ok` and RFC 9457 `Err` wrapping ([ADR-0016](../../06-adrs/ADR-0016-error-envelope-rfc9457.md)).
- **No Tauri-specific code in engine trait implementations;** the host is the only Tauri-aware crate.

## `crates/praxis` (Meaning / graph / temporal engine)

- **Unit:** op application, temporal graph queries (`state_at`, `diff`, `topology_delta`), scenario branching.
- **Integration:** the full `merge_flow` golden path (`crates/praxis/tests/merge_flow.rs`).
- **Property-based:** scenario-merge additivity and commutativity ([property-and-fuzz-testing.md](./property-and-fuzz-testing.md)).
- **Replay:** a rebuild test targeting praxis graph state.
- **Coverage target:** ≥ 90 %.

## `crates/mneme` (Storage)

- **Unit:** op serialisation/deserialisation, content-address blob storage, index integrity.
- **Integration:** single-writer queue under concurrent writes; storage-trait swap (in-memory ↔ file-backed).
- **Crash recovery:** op-append and blob-attach scenarios.
- **Security:** a tampered blob is rejected on read ([blobs-and-integrity.md](../security/blobs-and-integrity.md)); decoders are fuzz-targeted ([property-and-fuzz-testing.md](./property-and-fuzz-testing.md)).
- **Coverage target:** ≥ 90 %.

## `crates/chrona` (Time engine)

- **Unit:** HLC generation, valid-time/asserted-time propagation, plan/actual layer queries.
- **Integration:** time context flows correctly through scenario and plan-event operations.
- **Property-based:** the temporal-resolution laws ([property-and-fuzz-testing.md](./property-and-fuzz-testing.md)).
- See [RUNTIME-AND-ENGINE.md](../../05-modules/mneme/RUNTIME-AND-ENGINE.md) for time-first invariants.
- **Coverage target:** ≥ 90 %.

## `crates/metis` (Analytics)

- **Unit:** centrality, impact analysis, TCO calculation with deterministic graph seeds.
- **Integration:** analytics dispatch through `WorkerState`; golden 5 k / 50 k node datasets for performance-envelope assertions.
- **Property-based:** relabelling-invariance and bound-honesty ([property-and-fuzz-testing.md](./property-and-fuzz-testing.md)).
- **PII redaction:** any analytics output including node labels passes through the redaction layer; redaction is tested ([pii-and-export-redaction.md](../security/pii-and-export-redaction.md)).
- **Coverage target:** ≥ 90 %.

## `crates/continuum` (Scheduler / connectors)

- **Unit:** connector adapter stubs, job lifecycle (enqueue, run, retry, cancel).
- **Integration:** accepted-work response and backpressure under concurrent scheduling ([accepted-work contract](../../04-contracts/accepted-work-and-events/README.md)).
- **Idempotency:** a retried submission under the same key runs at most once; events dedup by `eventId` ([ADR-0018](../../06-adrs/ADR-0018-idempotency-and-deduplication.md)).
- **Coverage target:** ≥ 90 %.

## Related documents

| Document                                         | What it covers                               |
| ------------------------------------------------ | -------------------------------------------- |
| [Testing index](./README.md)                     | The cross-cutting posture and rules.         |
| [coverage-and-gates.md](./coverage-and-gates.md) | The coverage targets these obligations meet. |
| [Module READMEs](../../05-modules/)              | The modules these obligations test.          |
