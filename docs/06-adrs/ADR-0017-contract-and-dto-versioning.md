# ADR-0017: Contract and DTO Versioning — SemVer 2.0.0

- Status: Accepted
- Date: 2026-06-11
- Depends-On: ADR-0006
- Relates-To: ADR-0016, ADR-0002

## Context

The product ships as one Tauri binary, but its parts version independently in practice: DTOs cross the Rust↔TS boundary,
crates depend on one another, and a workspace's stored schema has a version a host must be able to read
([ADR-0002](./ADR-0002-portable-workspace-format.md), `SCHEMA_TOO_NEW`). Without a shared versioning rule, "is this
change breaking?" is argued case by case, and a renderer built against one DTO shape silently mishandles another. The
IPC manifest is drift-checked in CI ([CONTRACTS-AND-SCHEMAS.md](../04-contracts/CONTRACTS-AND-SCHEMAS.md)), but drift
detection is not a versioning policy.

Semantic Versioning 2.0.0 supplies the policy: MAJOR for incompatible changes, MINOR for backwards-compatible additions,
PATCH for backwards-compatible fixes. Adopting it across DTOs, contracts, crates, and packages gives one answer to the
breaking-change question.

## Governance Framing

- **Decision type:** Stable seam (versioning is the contract on how contracts change) + invariant (a MAJOR bump is
  required for any incompatible change).
- **Known future pressure:** new fields; deprecations; multiple host/renderer versions in the field; older workspaces
  opened by newer hosts.
- **What stays stable:** SemVer 2.0.0 semantics; additive-only schema evolution within a MAJOR; the
  compatibility-negotiation handshake.
- **What is provisional:** the deprecation window length and the exact negotiation payload.
- **What is deferred:** running two MAJOR contract versions side by side; automated migration tooling.
- **Why hard to reverse:** version numbers are embedded in stored workspaces, the IPC manifest, and crate metadata; the
  meaning of a version is relied on by compatibility checks.

## Decision

- **DTOs, contracts, crates, and packages are versioned with Semantic Versioning 2.0.0** (Semantic Versioning 2.0.0).
  MAJOR signals an incompatible change, MINOR a backwards-compatible addition, PATCH a backwards-compatible fix. The
  question "does this change need a MAJOR bump?" has one rule, applied everywhere.

- **Schema evolution is forward-only and additive within a MAJOR.** New optional fields, new enum variants behind
  explicit handling, and new commands are MINOR. Removing or renaming a field, removing an enum variant, changing a
  field's type or meaning, or renaming a stable error code ([ADR-0016](./ADR-0016-error-envelope-rfc9457.md)) is MAJOR.
  A consumer reading a newer MINOR must ignore unknown fields rather than fail — additive changes do not break older
  readers.

- **Compatibility is negotiated, not assumed.** The host and renderer exchange their contract version; the host rejects
  a stored workspace whose schema MAJOR exceeds what it supports with `SCHEMA_TOO_NEW` (compatibility-fatal,
  `internal`/`report` per [ADR-0016](./ADR-0016-error-envelope-rfc9457.md)). A newer host opening an older workspace is
  supported within the same MAJOR; the reverse is not.

- **Stored material records the version that wrote it.** A workspace records its schema version
  ([ADR-0002](./ADR-0002-portable-workspace-format.md)) so a host can decide compatibility before reading. Exports and
  packages ([ADR-0007](./ADR-0007-deterministic-package-export.md)) likewise record the contract version they were
  produced under.

- **Deprecation precedes removal.** A field or command slated for removal is marked deprecated for at least one MINOR
  before a MAJOR removes it, so consumers have a release in which to migrate.

## Considered Options

- **Date-based or monotonic single version (rejected):** simple, but says nothing about compatibility; SemVer's
  MAJOR/MINOR/PATCH split is the information consumers actually need.
- **No formal versioning, rely on CI drift checks (rejected):** drift detection catches accidental change but gives no
  policy for intentional change or for field compatibility.
- **Breaking changes allowed within a MINOR with migration (rejected):** shifts the cost onto every consumer and stored
  workspace; reserving breakage for MAJOR keeps the contract honest.

## Consequences

- Adding a field is a MINOR and does not break an older renderer that ignores unknown fields; renaming one is a MAJOR
  and is negotiated.
- `SCHEMA_TOO_NEW` is the concrete enforcement of the MAJOR rule for stored workspaces.
- The IPC manifest drift check ([CONTRACTS-AND-SCHEMAS.md](../04-contracts/CONTRACTS-AND-SCHEMAS.md)) becomes the
  trigger to consider a version bump, not a substitute for one.
- A worked example: adding an optional `recovery` member to the error envelope
  ([ADR-0016](./ADR-0016-error-envelope-rfc9457.md)) is a MINOR — older renderers ignore it; renaming `BACKPRESSURE`
  would be a MAJOR.

## Follow-ups / Open Questions

- The deprecation window length (≥ one MINOR is the floor).
- The negotiation payload shape and where it sits in the IPC handshake.
- Whether crate versions and the contract version move together or independently.

## References & standards

- **Semantic Versioning 2.0.0** _(normative: versioning)_.
- **JSON Schema 2020-12** _(informative: schema shape that evolves additively)_.

## Related documents

| Document                                                             | What it covers                                               |
| -------------------------------------------------------------------- | ------------------------------------------------------------ |
| [CONTRACTS-AND-SCHEMAS.md](../04-contracts/CONTRACTS-AND-SCHEMAS.md) | The IPC manifest and drift-check discipline.                 |
| [ADR-0002](./ADR-0002-portable-workspace-format.md)                  | The stored workspace format that records its schema version. |
| [ADR-0016](./ADR-0016-error-envelope-rfc9457.md)                     | The error envelope whose codes are version-stable.           |
