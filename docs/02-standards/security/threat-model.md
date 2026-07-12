# Threat Model

The asset and adversary model for Aideon Desktop, and a STRIDE analysis of the trust boundary. This realises the
threat-model decision ([ADR-0023](../../06-adrs/ADR-0023-threat-model-stride-asvs.md)); the controls that verify each
mitigation are mapped to OWASP ASVS 5.0 in [controls-asvs.md](./controls-asvs.md).

A boundary with as much riding on it as the Tauri seam ([trust-boundary.md](./trust-boundary.md)) needs a recorded
threat model, not ad-hoc hardening. STRIDE forces every threat category to be considered against the boundary; OWASP
ASVS 5.0 supplies the testable controls.

## Assets

What the model protects, in priority order:

| Asset                                                                    | Why it matters                                                                                                                                        | Primary protection                                                                                                                      |
| ------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| **Canonical material** — the op log, schema, and content-addressed blobs | The single source of truth for the twin; loss or corruption is unrecoverable ([ADR-0001](../../06-adrs/ADR-0001-workspace-is-canonical-authority.md)) | Append-only writes, single-writer queue, hash verification ([blobs-and-integrity.md](./blobs-and-integrity.md))                         |
| **Secrets** — sync tokens, signing keys, credentials                     | Disclosure enables impersonation or supply-chain compromise                                                                                           | OS key store only; never on disk or in logs ([secrets-and-keys.md](./secrets-and-keys.md))                                              |
| **PII in workspace content** — names, emails, notes                      | Disclosure is a privacy and compliance harm                                                                                                           | Deny-by-default redaction on export ([pii-and-export-redaction.md](./pii-and-export-redaction.md))                                      |
| **The shipped binary and its build**                                     | A tampered binary compromises every user                                                                                                              | Code signing ([code-signing-and-distribution.md](./code-signing-and-distribution.md)); SLSA/SBOM ([supply-chain.md](./supply-chain.md)) |
| **Auditability** — the attributable record of who did what               | Repudiation and incident response depend on it                                                                                                        | Append-only op log; correlated traces ([audit-and-logging.md](./audit-and-logging.md))                                                  |

## Adversaries

The realistic adversaries for a desktop EA tool, and what each can do:

- **A compromised or malicious renderer** — a WebView running untrusted or XSS-injected script. It can issue any IPC
  call the window's capabilities allow, and nothing more; it has no filesystem, network, or shell
  ([trust-boundary.md](./trust-boundary.md)). This is the central adversary the boundary is built against.
- **A hostile import file** — a file the user chose to import whose content is malformed, oversized, or crafted to
  inject bad twin content ([ADR-0013](../../06-adrs/ADR-0013-interchange-and-interoperability-pylon.md)). The user
  vouches for provenance, not content.
- **A supply-chain attacker** — a compromised dependency or build step that injects code before signing
  ([supply-chain.md](./supply-chain.md)).
- **A local attacker with disk access** — someone who can read the cleartext workspace folder on a shared or stolen
  device. Workspace metadata does not stop them; confidentiality for sharing comes from filtered/encrypted exports
  ([pii-and-export-redaction.md](./pii-and-export-redaction.md)), and OS-level disk encryption is the user's
  responsibility.
- **(Deferred) a network adversary** in hosted/sync mode — a man-in-the-middle or a malicious peer. The hosted threat
  model is deferred because the desktop default has no network trust boundary
  ([ADR-0023](../../06-adrs/ADR-0023-threat-model-stride-asvs.md),
  [ADR-0030](../../06-adrs/ADR-0030-governance-themis.md)).

## STRIDE at the trust boundary

Each STRIDE category, mapped to the Tauri seam with its primary control
([ADR-0023](../../06-adrs/ADR-0023-threat-model-stride-asvs.md)):

| STRIDE category            | Threat at the seam                                             | Primary control                                                                                                                                                                                                                                |
| -------------------------- | -------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Spoofing**               | A window or call claiming a capability it lacks                | Per-window capability scoping ([capability-scoping.md](./capability-scoping.md)); local single-user context by default                                                                                                                         |
| **Tampering**              | Renderer altering data it does not own; a tampered import file | Renderer owns no durable store; blobs verified by hash ([blobs-and-integrity.md](./blobs-and-integrity.md)); imports validated and reviewable ([ADR-0013](../../06-adrs/ADR-0013-interchange-and-interoperability-pylon.md))                   |
| **Repudiation**            | A mutation with no traceable origin                            | Append-only op log ([ADR-0001](../../06-adrs/ADR-0001-workspace-is-canonical-authority.md)); correlation IDs ([ADR-0019](../../06-adrs/ADR-0019-observability-and-trace-context.md), [audit-and-logging.md](./audit-and-logging.md))           |
| **Information disclosure** | Secrets in logs/errors; over-broad export                      | Redaction before logging ([audit-and-logging.md](./audit-and-logging.md)); deny-by-default export ([pii-and-export-redaction.md](./pii-and-export-redaction.md)); secrets in the key store only ([secrets-and-keys.md](./secrets-and-keys.md)) |
| **Denial of service**      | Saturating the write queue or a long job                       | Explicit backpressure ([accepted-work contract](../../04-contracts/accepted-work-and-events/README.md)); bounded analytics ([ADR-0027](../../06-adrs/ADR-0027-projection-consistency-model.md))                                                |
| **Elevation of privilege** | Renderer gaining host powers (FS, shell)                       | Renderer gets product capabilities, not host capabilities ([ADR-0006](../../06-adrs/ADR-0006-tauri-trust-boundary-and-typed-ipc.md)); no raw FS/shell                                                                                          |

The renderer-untrusted invariant is the control that carries most categories: spoofing, tampering, and elevation of
privilege all reduce to "the renderer cannot do this because the host owns it". The threat model makes that load-bearing
invariant explicit and verifiable rather than implicit.

## Worked example

A cross-site-scripting payload executes in the renderer and tries to exfiltrate a `DataEntity` flagged
`sensitivity: confidential` ([core-v1.json](../../data/meta/core-v1.json)). It cannot read the filesystem or open a
socket (no host capability), so it cannot reach the blob directly (Elevation of privilege blocked). It can only call IPC
commands the window declares; an export command applies deny-by-default redaction before writing
([pii-and-export-redaction.md](./pii-and-export-redaction.md)), so a confidential field does not leave the host in
cleartext (Information disclosure blocked). The attempt is attributable through the correlated command log (Repudiation
blocked). No single control is novel; the boundary composes them.

## References & standards

_Normative:_

- Microsoft — **STRIDE** threat modelling. _([ADR-0023](../../06-adrs/ADR-0023-threat-model-stride-asvs.md))_
- **OWASP ASVS 5.0**. _(the controls verifying each mitigation — [controls-asvs.md](./controls-asvs.md))_

_Informative:_

- **OWASP Top 10**. _(risk checklist behind the categories)_

Recorded in the [standards register](../STANDARDS-REGISTER.md).

## Related documents

| Document                                                       | What it covers                                 |
| -------------------------------------------------------------- | ---------------------------------------------- |
| [trust-boundary.md](./trust-boundary.md)                       | The boundary this model reasons about.         |
| [controls-asvs.md](./controls-asvs.md)                         | The ASVS controls that verify each mitigation. |
| [ADR-0023](../../06-adrs/ADR-0023-threat-model-stride-asvs.md) | The threat-model decision this realises.       |
