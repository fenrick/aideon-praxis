# Testing Strategy

How Aideon Desktop is tested: the layers, the coverage and quality gates, the boundary and contract discipline, property-based and fuzz testing, per-module obligations, the cross-platform matrix, and documentation-example testing. This is the durable test record a competent engineer needs to extend the product without regressing its seams.

Most regressions surface at boundaries — the renderer ↔ host ↔ engine seams, the canonical-vs-derived split, the temporal context. Every layer targets the seam, not just the interior.

---

## Contents

| #   | File                                                               | Question it answers                                                                                         |
| --- | ------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------- |
| 1   | [test-layers.md](./test-layers.md)                                 | What are the six test layers, their tooling, scope, and the common commands?                                |
| 2   | [coverage-and-gates.md](./coverage-and-gates.md)                   | What coverage is required, how is flakiness handled (the SLA), and what is mutation testing for?            |
| 3   | [boundary-and-contract-tests.md](./boundary-and-contract-tests.md) | How are the IPC, DTO, and trait boundaries tested, and how does the contract matrix track the IPC manifest? |
| 4   | [property-and-fuzz-testing.md](./property-and-fuzz-testing.md)     | Where do property-based and security/fuzz testing apply?                                                    |
| 5   | [per-module-obligations.md](./per-module-obligations.md)           | What must each module's tests cover?                                                                        |
| 6   | [cross-platform-matrix.md](./cross-platform-matrix.md)             | What runs on macOS, Windows, and Linux, and what is platform-specific?                                      |
| 7   | [doc-example-testing.md](./doc-example-testing.md)                 | How are worked examples and code samples kept honest?                                                       |

---

## The posture in one paragraph

Six layers — unit, contract/boundary, integration, replay/rebuild, crash recovery, and E2E/smoke ([test-layers.md](./test-layers.md)) — each aim at a seam. Coverage gates are hard CI failures and must trend upward; flakiness is fixed under an explicit SLA, not tolerated ([coverage-and-gates.md](./coverage-and-gates.md)). Every IPC command, DTO, and engine trait carries a contract test tracked against the [`ipc-manifest.json`](../../contracts/ipc-manifest.json) ([boundary-and-contract-tests.md](./boundary-and-contract-tests.md)). Temporal logic, scenario merge, and graph operations — where invariants are easy to state and hard to enumerate — are checked with property-based tests, and parsers crossing the trust boundary are fuzzed ([property-and-fuzz-testing.md](./property-and-fuzz-testing.md)). Tests are deterministic: fixed seeds, fixed timestamps, synthetic graphs — never wall-clock or filesystem state.

The strategy follows **Design by Contract** (Meyer): a boundary has preconditions, postconditions, and invariants, and a test asserts them. Cross-boundary contracts follow consumer-driven contract testing (**Pact**): the consumer's expectations define the contract the provider must satisfy ([boundary-and-contract-tests.md](./boundary-and-contract-tests.md)).

## Rules (apply across every layer)

- Update tests whenever behaviour or DTO shapes change; never ship a shape change without a corresponding contract-test update ([boundary-and-contract-tests.md](./boundary-and-contract-tests.md)).
- Prefer deterministic tests (fixed seeds, fixed timestamps, synthetic graphs) over tests that depend on wall-clock time or filesystem state.
- Validate boundary rules in tests: assert no renderer HTTP, no open ports, no direct renderer FS access ([security/](../security/README.md)).
- Node/Vitest tests that touch Tauri IPC or window APIs must use `mockIPC`, `mockWindows`, and `clearMocks` from `@tauri-apps/api/mocks`; never invoke real Tauri APIs in unit or contract tests.
- Add tests for PII redaction and role filtering wherever code touches export or analytics outputs ([security/pii-and-export-redaction.md](../security/pii-and-export-redaction.md)).
- Do not suppress lint or type errors in test files; refactor the test to satisfy static analysis ([CODING-STANDARDS.md §17](../CODING-STANDARDS.md#17-commit-hygiene-and-ci)).

## References & standards

_Informative:_

- Meyer — **Design by Contract**, 1992. _(preconditions/postconditions/invariants at every seam)_
- Pact — **consumer-driven contracts**. _(the contract-test discipline across the IPC boundary)_
- Claessen & Hughes — **QuickCheck**, 2000; the **proptest** crate. _(property-based testing — [property-and-fuzz-testing.md](./property-and-fuzz-testing.md))_

Recorded in the [standards register](../STANDARDS-REGISTER.md).

## Related documents

| Document                                                                   | What it covers                                                |
| -------------------------------------------------------------------------- | ------------------------------------------------------------- |
| [Coding Standards](../CODING-STANDARDS.md)                                 | The rules the code under test follows, and the quality gates. |
| [Design Governance](../DESIGN-GOVERNANCE.md)                               | The seams and invariants these tests defend.                  |
| [Architecture Boundary](../../01-architecture/ARCHITECTURE-BOUNDARY.md)    | The boundaries the tests target.                              |
| [Contracts and Schemas](../../04-contracts/CONTRACTS-AND-SCHEMAS.md)       | The IPC manifest and DTO shapes contract tests track.         |
| [Security standard](../security/README.md)                                 | The controls the security/fuzz tests verify.                  |
| [Runtime and Engine (Mneme)](../../05-modules/mneme/RUNTIME-AND-ENGINE.md) | The time-first and rebuild invariants replay tests assert.    |
