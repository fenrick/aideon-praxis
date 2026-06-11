# Security

The security standard for Aideon Desktop — the trust boundary, the threat model, the verification controls, and the per-concern rules for capabilities, blobs, secrets, PII, supply chain, signing, audit, and vulnerability reporting. This is the durable security record an engineer or auditor needs to understand what the product defends, against whom, and how each defence is verified.

The product's principal trust boundary is the Tauri seam: the WebView renderer is untrusted, Rust owns all side effects, and capabilities decide which window may call which command ([ADR-0006](../../06-adrs/ADR-0006-tauri-trust-boundary-and-typed-ipc.md)). Everything in this folder follows from that boundary.

---

## Contents

| #   | File                                                                   | Question it answers                                                                                       |
| --- | ---------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| 1   | [trust-boundary.md](./trust-boundary.md)                               | What is trusted, what is not, and where the line sits?                                                    |
| 2   | [threat-model.md](./threat-model.md)                                   | What are the assets, who are the adversaries, and how does STRIDE map to the boundary?                    |
| 3   | [controls-asvs.md](./controls-asvs.md)                                 | Which OWASP ASVS 5.0 controls verify each security concern?                                               |
| 4   | [capability-scoping.md](./capability-scoping.md)                       | How are Tauri capabilities scoped, and how do Themis (policy) and the Host (enforcement) divide the work? |
| 5   | [blobs-and-integrity.md](./blobs-and-integrity.md)                     | How is content-addressed storage verified, and what is rejected?                                          |
| 6   | [secrets-and-keys.md](./secrets-and-keys.md)                           | Where do secrets live, how are keys derived, and how are they rotated?                                    |
| 7   | [pii-and-export-redaction.md](./pii-and-export-redaction.md)           | What is PII here, and how is it redacted deny-by-default on export?                                       |
| 8   | [supply-chain.md](./supply-chain.md)                                   | How is the build and dependency chain attested (SLSA, SBOM)?                                              |
| 9   | [code-signing-and-distribution.md](./code-signing-and-distribution.md) | How are release binaries signed and distributed per platform?                                             |
| 10  | [audit-and-logging.md](./audit-and-logging.md)                         | What is auditable, and how does logging avoid leaking secrets or PII?                                     |
| 11  | [vulnerability-reporting.md](./vulnerability-reporting.md)             | How is a vulnerability reported and handled?                                                              |

---

## The posture in one paragraph

The renderer is untrusted and disposable; the Rust host owns every side effect and is the sole layer that touches the filesystem, the object store, sync endpoints, engine APIs, and the OS key store. Access is **deny-by-default**: a capability, command, path, endpoint, or key entry is denied unless explicitly declared and granted. Untrusted input — an IPC payload, an imported file, a config value — is treated as hostile until validated. Canonical material is verified by content hash. Secrets never enter a workspace file, the runtime database, a log, or an export. Personal data is redacted before it leaves the device. Threats are framed with **STRIDE** and verified against **OWASP ASVS 5.0** ([ADR-0023](../../06-adrs/ADR-0023-threat-model-stride-asvs.md)).

The desktop default is a local single-user context with no network trust boundary; the hosted-deployment threat model (a network boundary, real RBAC) is **deferred** ([ADR-0023](../../06-adrs/ADR-0023-threat-model-stride-asvs.md), [ADR-0030](../../06-adrs/ADR-0030-governance-themis.md)). Policy decisions — who may do what — are the concern of the planned governance module [Themis](#related-documents); the Host enforces the boundary, Themis decides the policy ([capability-scoping.md](./capability-scoping.md)).

---

## References & standards

_Normative:_

- Microsoft — **STRIDE** threat modelling. _(threat frame — [ADR-0023](../../06-adrs/ADR-0023-threat-model-stride-asvs.md))_
- **OWASP ASVS 5.0** — Application Security Verification Standard. _(verification controls)_
- **Tauri security model** (capabilities, permissions, CSP, isolation). _(host boundary — [ADR-0006](../../06-adrs/ADR-0006-tauri-trust-boundary-and-typed-ipc.md))_

_Informative:_

- **OWASP Top 10**. _(common-risk checklist)_
- **NIST SSDF (SP 800-218)**; **NIST CSF 2.0**. _(secure-development and identify/protect/detect/respond/recover framing)_
- **SLSA**; **CycloneDX / SPDX** SBOM. _(supply-chain integrity)_

Recorded in the [standards register](../STANDARDS-REGISTER.md).

## Related documents

| Document                                                                                                      | What it covers                                              |
| ------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------- |
| [ADR-0006 — Tauri Trust Boundary and Typed IPC](../../06-adrs/ADR-0006-tauri-trust-boundary-and-typed-ipc.md) | The boundary mechanism this folder builds on.               |
| [ADR-0023 — Threat Model (STRIDE + ASVS)](../../06-adrs/ADR-0023-threat-model-stride-asvs.md)                 | The threat frame and control standard.                      |
| [ADR-0030 — Governance (Themis)](../../06-adrs/ADR-0030-governance-themis.md)                                 | The policy engine that decides authority the Host enforces. |
| [Coding Standards §15](../CODING-STANDARDS.md#15-secure-coding)                                               | The everyday secure-coding rules.                           |
| [Architecture Boundary](../../01-architecture/ARCHITECTURE-BOUNDARY.md)                                       | The layers and adapters the boundary divides.               |
| [Host module](../../05-modules/host/README.md)                                                                | The Rust crate that enforces the trust boundary.            |
