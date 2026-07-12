# Documentation-Example Testing

How worked examples and code samples in the corpus are kept honest. A confident sentence about something that does not
exist is the most expensive kind of error ([DOCUMENTATION-STANDARD.md §1](../DOCUMENTATION-STANDARD.md)); a worked
example that no longer runs is the documentation equivalent. This layer makes examples executable, so drift between the
docs and the product is a test failure, not a reader's surprise.

## Doctests and example tests

- **Rust documentation examples are doctests.** A `///` example on a public item compiles and runs under `cargo test`.
  Examples on public APIs are written as runnable doctests so a signature change that invalidates the example fails CI
  ([CODING-STANDARDS.md §13](../CODING-STANDARDS.md#13-rust--host-and-engine-crates)). An example that genuinely cannot
  run is marked `no_run` (it still compiles) or `ignore` with a stated reason — never silently left to rot.
- **TypeScript examples in TSDoc** are extracted and type-checked where they assert a public API shape, so a renamed
  export breaks the example at typecheck.

## Worked examples use real seed identifiers

Every worked example in a design or contract document uses **real type and relationship identifiers** from the seed
metamodel ([`core-v1.json`](../../data/meta/core-v1.json)) — `Capability`, `Application`, `serves`, `realises`,
`accesses` — and the seed dataset ([`baseline.yaml`](../../data/base/baseline.yaml)), never invented ones
([DOCUMENTATION-STANDARD.md §6](../DOCUMENTATION-STANDARD.md)). This is testable: a check that the identifiers cited in
worked examples exist in the seed metamodel catches an example built on a type that does not exist — which would teach
the reader something false.

- A worked example that walks a resolution or computation can be run against the seed dataset as a fixture, so the
  stated result (including its honest-state flags, [DOCUMENTATION-STANDARD.md §9](../DOCUMENTATION-STANDARD.md)) is the
  result the product actually produces.
- Where an example asserts a contract shape (an error envelope, an event), it shares the fixture stubs the contract
  tests use ([boundary-and-contract-tests.md](./boundary-and-contract-tests.md)), so one source of truth backs both the
  prose and the test.

## Cross-link resolution

A broken cross-link is a correctness defect ([DOCUMENTATION-STANDARD.md §11](../DOCUMENTATION-STANDARD.md)). A link
check over the corpus — every relative path resolves to an existing file (and anchor where given) — is run as a
documentation gate, so a moved or renamed file surfaces as a failure rather than a dead link a reader finds. This pairs
with the folder-decomposition rule: when a monolith is folded into a folder, its incoming links are repointed at the new
index, and the check confirms none was missed.

This is **design intent** at the level of an adopted practice: doctests run today under `cargo test`; the
seed-identifier and link-resolution checks are recorded here as the gates that keep the corpus honest, with their wiring
a follow-up.

## Related documents

| Document                                                           | What it covers                                                              |
| ------------------------------------------------------------------ | --------------------------------------------------------------------------- |
| [Testing index](./README.md)                                       | The cross-cutting posture and rules.                                        |
| [Documentation Standard](../DOCUMENTATION-STANDARD.md)             | The worked-example, honest-state, and cross-link rules these tests enforce. |
| [boundary-and-contract-tests.md](./boundary-and-contract-tests.md) | The fixtures examples and contract tests share.                             |
