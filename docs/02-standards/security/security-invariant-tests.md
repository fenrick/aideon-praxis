# Security Invariant Tests

The checklist of security invariants every release must hold, each phrased as a testable assertion. This is the bridge from the per-concern security docs to a release gate: the [controls-asvs.md](./controls-asvs.md) mapping says _which_ ASVS control verifies each concern; this file states the concrete pass/fail assertion a test makes, so "the boundary holds" is a checkbox a release either passes or blocks on, not a judgement call.

A release is verified against the rows below. A concern with no passing assertion is a release blocker, not a known gap ([controls-asvs.md](./controls-asvs.md)). An invariant marked **design intent** has no enforcing code yet; its assertion is recorded here so it becomes a gate when the feature lands, and is honestly flagged as not-yet-enforced until then ([DOCUMENTATION-STANDARD.md §9](../DOCUMENTATION-STANDARD.md)).

## Boundary and capability invariants

These assert the load-bearing renderer-untrusted invariant ([trust-boundary.md](./trust-boundary.md), [threat-model.md](./threat-model.md)).

- [ ] **No renderer HTTP.** The renderer makes no outbound HTTP/WebSocket call; a boundary test asserts no network capability is reachable from the WebView ([process-and-trust-boundary.md](../../05-modules/host/process-and-trust-boundary.md)).
- [ ] **No open ports in desktop mode.** No local HTTP server and no open TCP port exist; a test asserts there is no loopback listener the renderer can reach ([capability-scoping.md](./capability-scoping.md)).
- [ ] **Capability deny-by-default.** A command absent from the window's `appcommands.toml` bundle is denied before the Rust handler runs; a host-suite test invokes an undeclared command and asserts denial ([capabilities-and-csp.md](../../05-modules/host/capabilities-and-csp.md)).
- [ ] **No renderer filesystem path.** The renderer never receives a filesystem path; a test asserts no command returns a raw path and that path resolution stays in the host ([capabilities-and-csp.md](../../05-modules/host/capabilities-and-csp.md)).
- [ ] **Strict CSP in production builds.** A production build loads only local assets under the strict Content-Security-Policy; a CSP review and a build assertion confirm no remote origin is permitted ([capabilities-and-csp.md](../../05-modules/host/capabilities-and-csp.md)).
- [ ] **Renderer holds product capabilities, not host capabilities.** A test asserts the renderer cannot run a shell, load a plugin, or reach raw filesystem/network ([ADR-0006](../../06-adrs/ADR-0006-tauri-trust-boundary-and-typed-ipc.md)).

## Input and integrity invariants

- [ ] **Every IPC payload is validated.** Each command validates its payload against its contract before use; a contract test per command asserts a malformed payload is a `validation`-category error ([CONTRACTS-AND-SCHEMAS.md](../../04-contracts/CONTRACTS-AND-SCHEMAS.md), [ADR-0016](../../06-adrs/ADR-0016-error-envelope-rfc9457.md)).
- [ ] **Imports are deny-by-default.** An imported file is validated against the metamodel and surfaces ambiguity as `Awaiting review`, never executed on trust; an import test asserts hostile content does not write twin content unreviewed ([ADR-0023](../../06-adrs/ADR-0023-threat-model-stride-asvs.md)).
- [ ] **Blobs are verified on read.** Every object under `objects/sha256/<digest>` is re-hashed before use; a tamper test flips a byte and asserts the object is rejected/quarantined with a `Failed` state, never served ([blobs-and-integrity.md](./blobs-and-integrity.md)).
- [ ] **Partial writes never appear at a valid address.** Blobs are written temp-file-plus-rename; a crash-recovery test asserts no partially-written object sits at a valid hash address ([blobs-and-integrity.md](./blobs-and-integrity.md)).
- [ ] **Rebuild reproduces the effective graph.** The derived runtime can be deleted and rebuilt from the op log and blobs; a replay test asserts the rebuild reproduces the prior effective graph ([blobs-and-integrity.md](./blobs-and-integrity.md)).

## Confidentiality invariants

- [ ] **PII redaction on export, deny-by-default.** Every export and diff redacts PII by default; a redaction test on each export/analytics surface asserts no `pii: true` slot, no redacted-class field, and no derived field embedding one leaves the device ([pii-and-export-redaction.md](./pii-and-export-redaction.md)).
- [ ] **Redaction holds over derivations and blobs.** A test asserts a derived label, analytics result, or referenced blob carrying PII is redacted or excluded, not silently shipped ([pii-and-export-redaction.md](./pii-and-export-redaction.md)).
- [ ] **One export path.** All shareable packages route through the deterministic export pipeline; a test asserts there is no second export route that bypasses redaction ([pii-and-export-redaction.md](./pii-and-export-redaction.md), [ADR-0007](../../06-adrs/ADR-0007-deterministic-package-export.md)).
- [ ] **Secrets live only in the OS key store.** A test asserts no secret appears in a workspace file, the runtime database, an export, or a log; only the host calls the key store and the renderer never receives a raw secret ([secrets-and-keys.md](./secrets-and-keys.md)).
- [ ] **No secret or PII in any log line.** Log-content assertions confirm no secret, PII, stack trace, or personal data appears in a log, telemetry record, or error `detail`, even at debug level ([audit-and-logging.md](./audit-and-logging.md)).

## Attribution and audit invariants

- [ ] **Audit-log append-only.** Every governed mutation is a recorded, append-only operation; a test asserts no in-place edit or physical delete of an operation, and that a delete is a `TombstoneEntity` supersession ([op-fact-schema-model.md](../../05-modules/mneme/op-fact-schema-model.md), [audit-and-logging.md](./audit-and-logging.md)).
- [ ] **One workflow reconstructable from `correlation_id`.** The release gate asserts an end-to-end workflow (renderer → host → engine → events → logs) is reconstructable from a single `correlation_id` ([audit-and-logging.md](./audit-and-logging.md), [LOGGING_FRAMEWORK.md](../../LOGGING_FRAMEWORK.md)).
- [ ] **Idempotent replay.** Replaying a package twice yields the same twin; a test asserts the same `(partition, op_id)` is a no-op on replay ([op-fact-schema-model.md](../../05-modules/mneme/op-fact-schema-model.md), [ADR-0018](../../06-adrs/ADR-0018-idempotency-and-deduplication.md)).

## Supply-chain invariants

- [ ] **SBOM generated in CI.** Each release produces a CycloneDX or SPDX software bill of materials; a CI step asserts the SBOM is generated and attached ([supply-chain.md](./supply-chain.md), [ADR-0023](../../06-adrs/ADR-0023-threat-model-stride-asvs.md)).
- [ ] **Release binaries are signed.** A signing-verification gate asserts the shipped binary is signed per platform before distribution ([code-signing-and-distribution.md](./code-signing-and-distribution.md)).

## Design-intent invariants (not yet enforced)

These have no enforcing code today; each becomes a gate when its feature lands ([DOCUMENTATION-STANDARD.md §9](../DOCUMENTATION-STANDARD.md)).

- [ ] **(Design intent) Encryption at rest covers canonical material and the cache together.** When encryption at rest lands, a test asserts the op log, schema, blobs, and runtime cache are all encrypted — the derived runtime is never a cleartext bypass of an encrypted op log ([encryption-at-rest.md](./encryption-at-rest.md)).
- [ ] **(Design intent) Erasure is unrecoverable and structure-preserving.** When erasure lands, a test asserts an `ErasePersonalData` operation renders the personal payload and shredded blob unrecoverable while structural history and the hash chain survive, and that idempotent replay reproduces the erased state ([ADR-0036](../../06-adrs/ADR-0036-right-to-erasure-vs-append-only.md)).
- [ ] **(Design intent) A plugin reaches no host capability.** When a third-party extension API lands, a test asserts an extension cannot reach the filesystem, open a socket, hold a raw secret, or write the twin unattributed ([plugin-and-third-party-sandboxing.md](./plugin-and-third-party-sandboxing.md)).
- [ ] **(Design intent) Themis decides, the Host enforces.** When Themis lands, a test asserts a governed command consults policy server-side, deny-by-default, never trusting a renderer-supplied decision ([capability-scoping.md](./capability-scoping.md), [ADR-0030](../../06-adrs/ADR-0030-governance-themis.md)).

## How this is used

- A release runs the boxes above; an unchecked enforced invariant blocks the release ([controls-asvs.md](./controls-asvs.md)).
- A new boundary, command, or export surface adds the relevant assertion here and its test before merge ([CODING-STANDARDS.md §15](../CODING-STANDARDS.md#15-secure-coding)).
- A design-intent box is promoted to an enforced box — losing its `(Design intent)` marker — when its feature ships with the asserting test.

## References & standards

_Normative:_

- **OWASP ASVS 5.0** — Application Security Verification Standard. _(the controls these assertions verify — [controls-asvs.md](./controls-asvs.md))_

_Informative:_

- Microsoft — **STRIDE**. _(the threat categories the assertions cover — [threat-model.md](./threat-model.md))_

Recorded in the [standards register](../STANDARDS-REGISTER.md).

## Related documents

| Document                                                               | What it covers                               |
| ---------------------------------------------------------------------- | -------------------------------------------- |
| [controls-asvs.md](./controls-asvs.md)                                 | The ASVS control each assertion verifies.    |
| [threat-model.md](./threat-model.md)                                   | The threats these invariants close.          |
| [Testing Strategy](../TESTING-STRATEGY.md)                             | The test layers that run these assertions.   |
| [renderer-compromise-scenarios.md](./renderer-compromise-scenarios.md) | The scenarios the boundary invariants bound. |
