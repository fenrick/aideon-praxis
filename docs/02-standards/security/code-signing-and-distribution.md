# Code Signing and Distribution

How release binaries are signed, notarised, and distributed per platform, so a user can trust that the artefact they
install is the one that was built ([supply-chain.md](./supply-chain.md)).

## Signed and notarised before distribution

Production binaries are signed and notarised before distribution. An unsigned build must not be distributed as a release
artefact, and CI must verify signing before publishing ([controls-asvs.md](./controls-asvs.md)).

| Platform    | Requirement                                                                                      |
| ----------- | ------------------------------------------------------------------------------------------------ |
| **macOS**   | Developer ID Application certificate; notarisation via the Apple notary service; stapled ticket. |
| **Windows** | Authenticode signing with a valid EV or OV code-signing certificate.                             |
| **Linux**   | GPG-signed package or AppImage; SHA-256 checksums published alongside the release.               |

Signing keys live in the OS key store or a hardware/CI secret store, never in the repository or a workspace file
([secrets-and-keys.md](./secrets-and-keys.md)). A key compromise is handled by rotating the certificate, re-signing, and
republishing — a leaked key is never reused.

## The chain of trust

Signing is the last link in the supply-chain attestation ([supply-chain.md](./supply-chain.md)): vetted locked inputs →
reproducible build → SBOM + SLSA provenance → **signed, notarised binary** → published checksums. Each link attests a
different thing:

- the **SBOM** says what is inside;
- the **SLSA provenance** says how it was built;
- the **signature** says this artefact is the one that was built and has not been altered since;
- the **published checksum** lets a recipient verify the download independently.

A release that breaks any link — an unsigned binary, a missing SBOM, an unverifiable checksum — is blocked, not shipped
with a caveat.

## Distribution posture

- Release artefacts and their checksums are published together; a recipient can verify integrity before installing.
- The application loads only local assets in production and reaches no remote CDN
  ([capability-scoping.md](./capability-scoping.md)), so the installed binary is the whole trusted surface — there is no
  runtime code fetch to also attest.
- Update distribution, when added, signs and verifies updates the same way; an unverified update is not applied. (Update
  delivery is design intent, governed by the same signing rule.)

## References & standards

_Normative:_

- **OWASP ASVS 5.0** — V1 / V10 (where applicable). _([controls-asvs.md](./controls-asvs.md))_

_Informative:_

- Apple **notarisation**; Microsoft **Authenticode**; **GPG** detached signatures. _(platform signing mechanisms)_

Recorded in the [standards register](../STANDARDS-REGISTER.md).

## Related documents

| Document                                     | What it covers                                   |
| -------------------------------------------- | ------------------------------------------------ |
| [supply-chain.md](./supply-chain.md)         | The SBOM and SLSA attestation signing completes. |
| [secrets-and-keys.md](./secrets-and-keys.md) | Where signing keys live and how they rotate.     |
| [controls-asvs.md](./controls-asvs.md)       | The supply-chain / distribution control row.     |
