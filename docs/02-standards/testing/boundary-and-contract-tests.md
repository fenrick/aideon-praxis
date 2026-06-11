# Boundary and Contract Tests

How the renderer ↔ host ↔ engine seams are tested: the IPC contract, DTO parity, trait surfaces, the boundary-coverage matrix, and the contract-coverage matrix tracked against the IPC manifest. Most regressions surface here, so this layer is the strategy's centre of gravity.

The discipline follows **Design by Contract** (Meyer): every boundary has preconditions (valid input), postconditions (the shape and semantics of the result), and invariants (what holds regardless), and a test asserts each. Cross-boundary contracts follow consumer-driven contract testing (**Pact**): the consumer's expectations define the contract the provider must keep, so a provider change that breaks a consumer fails a test rather than a user.

## IPC contract (TypeScript)

Every command listed in [`docs/contracts/ipc-manifest.json`](../../contracts/ipc-manifest.json) must have a test that:

1. Calls the Tauri command wrapper (request/response envelope) using `mockIPC` from `@tauri-apps/api/mocks`.
2. Asserts the response shape for at least one realistic success scenario.
3. Asserts the **RFC 9457 error envelope** shape for at least one error scenario ([ADR-0016](../../06-adrs/ADR-0016-error-envelope-rfc9457.md)) — including its `category` and `recovery` members, so the renderer's generic reaction is covered.

```ts
import { mockIPC, clearMocks } from '@tauri-apps/api/mocks';

afterEach(() => clearMocks());

test('temporal_state_at returns a valid StateAtResponse envelope', async () => {
  mockIPC((cmd, args) => {
    if (cmd === 'temporal_state_at') return { ok: true, data: stubStateAt(args) };
  });
  const result = await praxisApi.temporalStateAt({ asOf: '2025-01-01', scenario: null });
  expect(result).toMatchObject({
    ok: true,
    data: expect.objectContaining({ nodes: expect.any(Array) }),
  });
});
```

Tests live under `tests/e2e/specs/ipc/` or alongside the adapter they exercise. The IPC manifest is a contract artefact; a shape change requires updating [`CONTRACTS-AND-SCHEMAS.md`](../../04-contracts/CONTRACTS-AND-SCHEMAS.md) and a version decision ([CODING-STANDARDS.md §4](../CODING-STANDARDS.md#4-api-stability-and-semver)).

## DTO parity (TypeScript ↔ Rust)

When a DTO type is added or changed:

- Update the TypeScript definition in `src/dtos/`.
- Update the Rust definition in `crates/mneme` (or the owning crate).
- Add a contract test asserting that the serialised form from the Rust side deserialises cleanly into the TypeScript type — and, per the additive-evolution rule, that an older consumer ignoring an unknown field still parses ([CODING-STANDARDS.md §4](../CODING-STANDARDS.md#4-api-stability-and-semver)).

## Rust trait surfaces

Engine traits defined in `crates/praxis`, `crates/chrona`, `crates/metis`, `crates/continuum`, and `crates/mneme` must have at least one integration test that exercises the trait through its public surface (not an internal helper).

## Boundary coverage matrix

Every changed boundary must cover the relevant rows:

| Boundary                                            | What to test                                                                                                                                                                                       |
| --------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Temporal context (valid-time / asserted-time / HLC) | Correct time propagation through IPC and engine calls; `as-of` queries return state consistent with the supplied timestamp                                                                         |
| Scenario context                                    | Ops scoped to a scenario do not bleed into the base layer; scenario branch/merge is covered                                                                                                        |
| Accepted-work + backpressure                        | Long jobs return an accepted-work response; the caller polls or subscribes; cancellation stops the job cleanly ([accepted-work contract](../../04-contracts/accepted-work-and-events/README.md))   |
| Projection freshness                                | A write affecting a projection triggers invalidation or refresh; stale reads are not served after a write commits ([ADR-0027](../../06-adrs/ADR-0027-projection-consistency-model.md))             |
| Stable error envelopes                              | All IPC commands return the RFC 9457 envelope on failure; the renderer parses category/recovery, not the message string ([ADR-0016](../../06-adrs/ADR-0016-error-envelope-rfc9457.md))             |
| Idempotency                                         | A retried mutation under the same key lands at most once; a re-delivered event dedups by `eventId` ([ADR-0018](../../06-adrs/ADR-0018-idempotency-and-deduplication.md))                           |
| Renderer isolation                                  | No renderer HTTP, no renderer FS access; the renderer receives only typed IPC responses ([security/](../security/README.md))                                                                       |
| Content-addressed blobs                             | A stored blob is retrievable by its content address; re-attaching identical content does not duplicate; a tampered blob is rejected ([blobs-and-integrity.md](../security/blobs-and-integrity.md)) |
| Single-writer queue                                 | Concurrent writes are serialised; no two writes corrupt each other's op record                                                                                                                     |

## Contract-coverage matrix vs the IPC manifest

The strongest contract guarantee is that the set of tested commands equals the set of declared commands — no command ships untested, and no test exercises a command that is not in the contract. This is tracked as a coverage matrix derived from [`ipc-manifest.json`](../../contracts/ipc-manifest.json):

| Manifest element                                                            | Required contract coverage                                                                                                                |
| --------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| Each **command**                                                            | One success-envelope test + one error-envelope test (above)                                                                               |
| Each **DTO** referenced by a command                                        | A DTO-parity test (above)                                                                                                                 |
| Each **error code** a command can return                                    | The code appears in an error-envelope assertion with its category/recovery ([ADR-0016](../../06-adrs/ADR-0016-error-envelope-rfc9457.md)) |
| Each **event** ([event-manifest.json](../../contracts/event-manifest.json)) | A handler test asserting dedup by `eventId` ([ADR-0018](../../06-adrs/ADR-0018-idempotency-and-deduplication.md))                         |

A CI drift check compares the manifest against the tested set: a manifest command with no contract test, or a test for a command absent from the manifest, fails the gate. This makes the matrix a live invariant rather than a document that rots. The drift check exists for the manifest shape today ([CONTRACTS-AND-SCHEMAS.md](../../04-contracts/CONTRACTS-AND-SCHEMAS.md)); extending it to require a contract test per manifest element is design intent recorded here.

## Related documents

| Document                                                                                                                           | What it covers                                           |
| ---------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------- |
| [Testing index](./README.md)                                                                                                       | The cross-cutting posture and rules.                     |
| [test-layers.md](./test-layers.md)                                                                                                 | Where the contract layer sits among the six.             |
| [Contracts and Schemas](../../04-contracts/CONTRACTS-AND-SCHEMAS.md)                                                               | The IPC manifest and DTO shapes tracked here.            |
| [ADR-0016](../../06-adrs/ADR-0016-error-envelope-rfc9457.md) · [ADR-0018](../../06-adrs/ADR-0018-idempotency-and-deduplication.md) | The error envelope and idempotency contracts under test. |
