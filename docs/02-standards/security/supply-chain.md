# Supply Chain

How the build and its dependencies are kept attestable — SLSA provenance and a software bill of materials. This realises
the supply-chain concern of [controls-asvs.md](./controls-asvs.md) and the supply-chain part of the threat model
([ADR-0023](../../06-adrs/ADR-0023-threat-model-stride-asvs.md)).

## Dependencies are an attack surface

The dependency graph and the build pipeline are themselves attack surfaces: a compromised dependency or build step
injects code before signing, defeating the trust boundary it never crosses ([threat-model.md](./threat-model.md)). They
are treated as untrusted-until-attested, not assumed clean because they are popular.

Everyday discipline ([CODING-STANDARDS.md §15](../CODING-STANDARDS.md#15-secure-coding)):

- **Vetted, locked dependencies.** Review additions; prefer well-maintained crates/packages; lock through pnpm
  (`pnpm-lock.yaml`) and Cargo (`Cargo.lock`); pin dev-tool versions.
- **Minimal surface.** Keep heavyweight/optional dependencies behind features and out of core crates; avoid unvetted
  libraries.
- **No build-time network reach beyond the locked sources.** A reproducible build resolves only what the lockfiles pin.

## SBOM

The build produces a **software bill of materials** in a recognised format — CycloneDX or SPDX — listing every
dependency and its version, so a shipped binary's composition is enumerable and a newly disclosed vulnerability can be
matched against what was actually shipped ([ADR-0023](../../06-adrs/ADR-0023-threat-model-stride-asvs.md)). The SBOM is
generated in CI and published alongside the release artefacts.

The format choice between CycloneDX and SPDX is provisional
([ADR-0023](../../06-adrs/ADR-0023-threat-model-stride-asvs.md) follow-up); both are recorded as acceptable in the
[standards register](../STANDARDS-REGISTER.md).

## SLSA provenance

The build targets **SLSA** provenance for build integrity: an attestation describing how and from what the binary was
built, so a consumer can verify the artefact came from the expected source and pipeline rather than a tampered one
([ADR-0023](../../06-adrs/ADR-0023-threat-model-stride-asvs.md)). The specific SLSA level targeted is provisional and
stated in the release process; the commitment is that releases carry verifiable provenance, making the supply chain
auditable.

This is **design intent** at the level of a stated target: SBOM generation and provenance attestation are
release-pipeline commitments being built out, not yet a passing gate. Until the pipeline emits both, the gap is recorded
here rather than asserted as done.

## How this composes with signing

SBOM and provenance attest _what was built and how_; code signing
([code-signing-and-distribution.md](./code-signing-and-distribution.md)) attests _that the artefact a user installs is
the one that was built and signed_. The chain is: vetted locked inputs → reproducible build → SBOM + SLSA provenance →
signed, notarised binary → published checksums. A break anywhere in that chain is a release blocker.

## References & standards

_Informative:_

- **SLSA** (Supply-chain Levels for Software Artifacts). _(build provenance —
  [ADR-0023](../../06-adrs/ADR-0023-threat-model-stride-asvs.md))_
- **CycloneDX**; **SPDX** SBOM formats. _(bill of materials)_
- **NIST SSDF (SP 800-218)**. _(secure software development practice)_

Recorded in the [standards register](../STANDARDS-REGISTER.md).

## Related documents

| Document                                                               | What it covers                                |
| ---------------------------------------------------------------------- | --------------------------------------------- |
| [code-signing-and-distribution.md](./code-signing-and-distribution.md) | Signing the attested binary for distribution. |
| [controls-asvs.md](./controls-asvs.md)                                 | The dependency/supply-chain control row.      |
| [ADR-0023](../../06-adrs/ADR-0023-threat-model-stride-asvs.md)         | The supply-chain integrity decision.          |
| [Coding Standards §15](../CODING-STANDARDS.md#15-secure-coding)        | The everyday dependency discipline.           |
