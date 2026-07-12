# ADR-0023: Threat Model — STRIDE + OWASP ASVS 5.0

- Status: Accepted
- Date: 2026-06-11
- Depends-On: ADR-0006
- Relates-To: ADR-0013, ADR-0014

## Context

The product's principal trust boundary is the Tauri seam: the WebView renderer is untrusted, Rust owns all side effects,
and capabilities decide which window may call which command
([ADR-0006](./ADR-0006-tauri-trust-boundary-and-typed-ipc.md)). A boundary with that much riding on it needs a recorded
threat model and a verification standard, not ad-hoc hardening. Two further surfaces carry risk: imports cross a trust
boundary (untrusted files become twin content, via Pylon,
[ADR-0013](./ADR-0013-interchange-and-interoperability-pylon.md)), and the supply chain (dependencies and build) is
itself an attack surface.

STRIDE frames the threats; OWASP ASVS 5.0 supplies the verification controls; SLSA and SBOM frame supply-chain
integrity.

## Governance Framing

- **Decision type:** Stable seam (the threat model frames the trust boundary; the control mapping is the verification
  contract) + invariant (the renderer is untrusted; imports and dependencies are treated as hostile until verified).
- **Known future pressure:** hosted/sync deployments adding a network boundary; more connectors widening the import
  surface; new dependencies.
- **What stays stable:** STRIDE as the frame; ASVS 5.0 as the control standard; the renderer-untrusted invariant;
  deny-by-default on untrusted input.
- **What is provisional:** the specific ASVS control selections and the SBOM/SLSA tooling.
- **What is deferred:** the hosted-deployment threat model (a network trust boundary the desktop default does not have).
- **Why hard to reverse:** the control mapping is a verification commitment audited at release; relaxing the
  renderer-untrusted invariant would invalidate the whole model.

## Decision

- **The trust boundary is threat-modelled with STRIDE** (Microsoft, STRIDE). Each STRIDE category is mapped to the
  boundary:

  | STRIDE category            | At the Tauri seam                                            | Primary control                                                                                                                                                                                                                     |
  | -------------------------- | ------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
  | **Spoofing**               | A window or call claiming a capability it lacks              | Per-window capability scoping ([ADR-0006](./ADR-0006-tauri-trust-boundary-and-typed-ipc.md)); local single-user context by default                                                                                                  |
  | **Tampering**              | Renderer altering data it does not own; tampered import file | Renderer owns no durable store; imports are validated and reviewable ([ADR-0013](./ADR-0013-interchange-and-interoperability-pylon.md))                                                                                             |
  | **Repudiation**            | A mutation with no traceable origin                          | Append-only op log ([ADR-0001](./ADR-0001-workspace-is-canonical-authority.md)); correlation IDs ([ADR-0019](./ADR-0019-observability-and-trace-context.md))                                                                        |
  | **Information disclosure** | Secrets in logs/errors; over-broad export                    | Redaction before logging ([LOGGING_FRAMEWORK.md §10](../LOGGING_FRAMEWORK.md)); deny-by-default export ([ADR-0013](./ADR-0013-interchange-and-interoperability-pylon.md), [ADR-0015](./ADR-0015-reporting-and-publishing-kerux.md)) |
  | **Denial of service**      | Saturating the write queue or a long job                     | Explicit backpressure ([ADR-0006](./ADR-0006-tauri-trust-boundary-and-typed-ipc.md)); bounded analytics ([ADR-0027](./ADR-0027-projection-consistency-model.md))                                                                    |
  | **Elevation of privilege** | Renderer gaining host powers (FS, shell)                     | Renderer gets product capabilities, not host capabilities ([ADR-0006](./ADR-0006-tauri-trust-boundary-and-typed-ipc.md)); no raw FS/shell                                                                                           |

- **Verification controls map to OWASP ASVS 5.0** (OWASP ASVS 5.0). Each security concern is verified against named ASVS
  controls — input validation on every IPC payload, output encoding, secure logging, secret handling, and access control
  at the capability layer. ASVS is the checklist a release is verified against; the mapping lives in
  [SECURITY.md](../02-standards/SECURITY.md).

- **Untrusted input is deny-by-default.** A Pylon import treats the source file as hostile: it is validated against the
  metamodel, compiled to reviewable operations, and surfaces anything ambiguous as `Awaiting review` rather than
  executing it ([ADR-0013](./ADR-0013-interchange-and-interoperability-pylon.md)). Generated content is never silently
  promoted ([ADR-0014](./ADR-0014-ai-assistance-and-generated-provenance-sophia.md)). The renderer is untrusted at all
  times.

- **Supply-chain integrity uses SLSA and an SBOM.** The build produces a software bill of materials (CycloneDX or SPDX)
  and targets SLSA provenance for build integrity, so a shipped binary's dependencies and build are attestable.
  Dependencies are an attack surface, treated as such.

## Considered Options

- **Ad-hoc hardening without a frame (rejected):** leaves gaps no one owns; STRIDE forces every threat category to be
  considered against the boundary.
- **OWASP Top 10 alone as the control set (rejected):** a useful risk checklist but not a verification standard; ASVS
  provides testable controls and is retained informatively as the risk lens.
- **Trusting imports because the user chose the file (rejected):** the user vouches for provenance, not content;
  deny-by-default validation is the safe posture.

## Consequences

- Every IPC payload is validated; a validation failure is a `validation`-category error
  ([ADR-0016](./ADR-0016-error-envelope-rfc9457.md)).
- The renderer-untrusted invariant from [ADR-0006](./ADR-0006-tauri-trust-boundary-and-typed-ipc.md) is the load-bearing
  control across most STRIDE categories; this ADR makes that explicit and verifiable.
- Releases carry an SBOM and SLSA provenance, making the supply chain auditable.
- The hosted-deployment threat model is deferred; the desktop default has no network trust boundary to model.

## Follow-ups / Open Questions

- The specific ASVS 5.0 control selections per concern, recorded in [SECURITY.md](../02-standards/SECURITY.md).
- SBOM format choice (CycloneDX vs SPDX) and the SLSA level targeted.
- The hosted/sync threat model when a network boundary is introduced.

## References & standards

- Microsoft — **STRIDE** threat modelling _(normative: threat frame)_.
- **OWASP ASVS 5.0** _(normative: verification controls)_.
- **OWASP Top 10** _(informative: risk checklist)_.
- **SLSA**; **CycloneDX / SPDX** SBOM _(informative: supply-chain integrity)_.

## Related documents

| Document                                                         | What it covers                           |
| ---------------------------------------------------------------- | ---------------------------------------- |
| [SECURITY.md](../02-standards/SECURITY.md)                       | The per-concern ASVS control mapping.    |
| [ADR-0006](./ADR-0006-tauri-trust-boundary-and-typed-ipc.md)     | The trust boundary this model frames.    |
| [ADR-0013](./ADR-0013-interchange-and-interoperability-pylon.md) | The import surface treated as untrusted. |
