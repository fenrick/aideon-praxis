# Controls — OWASP ASVS 5.0 Mapping

The verification controls for each security concern, mapped to **OWASP ASVS 5.0** chapters. ASVS is the checklist a release is verified against ([ADR-0023](../../06-adrs/ADR-0023-threat-model-stride-asvs.md)); this file is where the [threat model](./threat-model.md) mitigations become testable commitments. The specific control selections are provisional and refined per release ([ADR-0023](../../06-adrs/ADR-0023-threat-model-stride-asvs.md) follow-up).

ASVS organises requirements by chapter (V1 Architecture, V2 Authentication, … V8 Authorization, and so on). The product adopts the controls relevant to a desktop application with a single enforced IPC boundary; chapters that assume a web session or server tier apply only in the deferred hosted mode.

## Mapping by concern

| Concern                              | ASVS chapter(s)                         | Control as applied here                                                                                                                                       | Verified by                                             | Realised in                                                                                                                |
| ------------------------------------ | --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| **Architecture & trust boundary**    | V1 Architecture                         | One enforced boundary; the renderer is untrusted; Rust owns side effects                                                                                      | Boundary tests assert no renderer FS/HTTP/ports         | [trust-boundary.md](./trust-boundary.md), [ADR-0006](../../06-adrs/ADR-0006-tauri-trust-boundary-and-typed-ipc.md)         |
| **Input validation**                 | V1, V5 Validation/Sanitization/Encoding | Every IPC payload, import, and config value validated against its contract before use, deny-by-default                                                        | Contract tests per IPC command; fuzz tests on parsers   | [CONTRACTS-AND-SCHEMAS.md](../../04-contracts/CONTRACTS-AND-SCHEMAS.md), [TESTING-STRATEGY.md](../TESTING-STRATEGY.md)     |
| **Output encoding & error handling** | V5, V7 Error/Logging                    | Errors are RFC 9457 envelopes with no secrets/stack traces; output encoded for its sink                                                                       | Error-envelope contract tests; redaction tests          | [ADR-0016](../../06-adrs/ADR-0016-error-envelope-rfc9457.md), [audit-and-logging.md](./audit-and-logging.md)               |
| **Authentication context**           | V2 Authentication                       | Local single-user default; hosted bearer/JWKS as a deferred adapter validating signature/issuer/audience/expiry                                               | (Hosted) token-validation tests when the adapter lands  | [trust-boundary.md](./trust-boundary.md), [ADR-0030](../../06-adrs/ADR-0030-governance-themis.md)                          |
| **Access control / authorisation**   | V8 Authorization                        | Deny-by-default; capability not in the window manifest is unreachable; Themis decides policy, the Host enforces, server-side, never trusted from the renderer | Capability/permission tests in the host suite           | [capability-scoping.md](./capability-scoping.md), [ADR-0030](../../06-adrs/ADR-0030-governance-themis.md)                  |
| **Secrets & key management**         | V6 Stored Cryptography, V2              | Secrets in the OS key store only; KDF for derived keys; rotation without re-encrypting all data                                                               | Key-store integration tests; never-logged assertions    | [secrets-and-keys.md](./secrets-and-keys.md)                                                                               |
| **Stored-data integrity**            | V6, V1                                  | Content-addressed blobs verified by re-hashing on read; reject on mismatch                                                                                    | Blob round-trip and tamper-rejection tests              | [blobs-and-integrity.md](./blobs-and-integrity.md), [ADR-0003](../../06-adrs/ADR-0003-content-addressed-object-store.md)   |
| **Privacy / data protection**        | V7, V1                                  | PII redacted deny-by-default on export and diff; redaction verified over derivations and blobs                                                                | Redaction tests on every export/analytics surface       | [pii-and-export-redaction.md](./pii-and-export-redaction.md)                                                               |
| **Logging & audit**                  | V7 Error/Logging                        | Structured logs with correlation IDs; no secrets/PII logged; audit derives from the op log                                                                    | Log-content assertions; correlation reconstruction test | [audit-and-logging.md](./audit-and-logging.md), [ADR-0019](../../06-adrs/ADR-0019-observability-and-trace-context.md)      |
| **Communications**                   | V3 Web Frontend / V9 (hosted)           | No renderer HTTP or open ports in desktop mode; production loads local assets only; hosted TLS deferred                                                       | Boundary tests; CSP review                              | [capability-scoping.md](./capability-scoping.md), [ADR-0006](../../06-adrs/ADR-0006-tauri-trust-boundary-and-typed-ipc.md) |
| **Dependencies & supply chain**      | V1, V10 (where applicable)              | Vetted, locked dependencies; SBOM (CycloneDX/SPDX); SLSA provenance; signed releases                                                                          | SBOM generation in CI; signing verification gate        | [supply-chain.md](./supply-chain.md), [code-signing-and-distribution.md](./code-signing-and-distribution.md)               |

## How this is used

- A release is verified against the rows above; a concern with no passing verification is a release blocker, not a known gap.
- A new public interface or boundary change adds or updates the relevant row and its verification before merge ([CODING-STANDARDS.md §15](../CODING-STANDARDS.md#15-secure-coding)).
- ASVS chapters that presuppose a hosted web tier (session management, browser CSRF) apply only when the hosted deployment lands ([ADR-0030](../../06-adrs/ADR-0030-governance-themis.md)); until then they are marked not-applicable to the desktop default, not silently skipped.

OWASP Top 10 is retained as an informative risk lens behind these controls; ASVS supplies the testable requirements ([ADR-0023](../../06-adrs/ADR-0023-threat-model-stride-asvs.md)).

## References & standards

_Normative:_

- **OWASP ASVS 5.0** — Application Security Verification Standard. _([ADR-0023](../../06-adrs/ADR-0023-threat-model-stride-asvs.md))_

_Informative:_

- **OWASP Top 10**. _(risk lens behind the controls)_
- **NIST CSF 2.0**. _(identify/protect/detect/respond/recover framing)_

Recorded in the [standards register](../STANDARDS-REGISTER.md).

## Related documents

| Document                                                       | What it covers                                      |
| -------------------------------------------------------------- | --------------------------------------------------- |
| [threat-model.md](./threat-model.md)                           | The threats these controls verify mitigation of.    |
| [Testing Strategy](../TESTING-STRATEGY.md)                     | The test layers that exercise these controls.       |
| [ADR-0023](../../06-adrs/ADR-0023-threat-model-stride-asvs.md) | The decision adopting ASVS as the control standard. |
