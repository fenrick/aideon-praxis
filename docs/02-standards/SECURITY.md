# Security Standard

This document has moved. The security standard is now a folder of focused files, indexed at:

**→ [security/README.md](./security/README.md)**

The folder covers the trust boundary, the threat model (STRIDE), the OWASP ASVS 5.0 control mapping, capability scoping, blob integrity, secrets and keys, PII and export redaction, supply chain, code signing, audit and logging, and vulnerability reporting.

For the repository-root public reporting policy, see [SECURITY.md](../../SECURITY.md) at the project root.

| Topic                                              | File                                                                                     |
| -------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| Trust boundary                                     | [security/trust-boundary.md](./security/trust-boundary.md)                               |
| Threat model (STRIDE; assets & adversaries)        | [security/threat-model.md](./security/threat-model.md)                                   |
| OWASP ASVS 5.0 controls                            | [security/controls-asvs.md](./security/controls-asvs.md)                                 |
| Capability scoping (Themis decides, Host enforces) | [security/capability-scoping.md](./security/capability-scoping.md)                       |
| Content-addressed blob integrity                   | [security/blobs-and-integrity.md](./security/blobs-and-integrity.md)                     |
| Secrets, KDF, rotation                             | [security/secrets-and-keys.md](./security/secrets-and-keys.md)                           |
| PII and export redaction                           | [security/pii-and-export-redaction.md](./security/pii-and-export-redaction.md)           |
| Supply chain (SLSA, SBOM)                          | [security/supply-chain.md](./security/supply-chain.md)                                   |
| Code signing and distribution                      | [security/code-signing-and-distribution.md](./security/code-signing-and-distribution.md) |
| Audit and logging                                  | [security/audit-and-logging.md](./security/audit-and-logging.md)                         |
| Vulnerability reporting                            | [security/vulnerability-reporting.md](./security/vulnerability-reporting.md)             |
