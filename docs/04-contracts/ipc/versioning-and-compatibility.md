# Versioning and compatibility

How a contract is allowed to change, and how the renderer and host agree on a version. DTOs, contracts, crates, and packages are versioned with Semantic Versioning 2.0.0 — the decision is [ADR-0017](../../06-adrs/ADR-0017-contract-and-dto-versioning.md).

---

## SemVer, applied to contracts

MAJOR signals an incompatible change, MINOR a backwards-compatible addition, PATCH a backwards-compatible fix. The question "does this change need a MAJOR bump?" has one rule, applied everywhere a shape crosses the boundary.

| Change                                                                                                                   | Bump  |
| ------------------------------------------------------------------------------------------------------------------------ | ----- |
| New optional field; new enum variant behind explicit handling; new command                                               | MINOR |
| New error code; refined recovery hint ([error-envelope.md](./error-envelope.md))                                         | MINOR |
| Backwards-compatible fix to behaviour or docs                                                                            | PATCH |
| Removing or renaming a field; removing an enum variant; changing a field's type or meaning; renaming a stable error code | MAJOR |

## Forward-only, additive evolution

Schema evolution is forward-only and additive within a MAJOR. A consumer reading a newer MINOR **must** ignore unknown fields rather than fail — additive changes do not break older readers. This is the rule that lets the host add a field (for example, the optional `recovery` member on the error envelope, or `tenant_id` on the [viewpoint](../temporal-and-scenario/viewpoint-shape.md)) without breaking a renderer built against the prior MINOR.

## Negotiation, not assumption

Compatibility is negotiated, not assumed:

- The host and renderer exchange their contract version at the IPC handshake. The exact negotiation payload and its place in the handshake are provisional ([ADR-0017](../../06-adrs/ADR-0017-contract-and-dto-versioning.md), open questions) — design intent until fixed.
- The host rejects a stored workspace whose schema MAJOR exceeds what it supports with `SCHEMA_TOO_NEW` (`internal`/`report`, [error-envelope.md](./error-envelope.md)). This is the concrete enforcement of the MAJOR rule for stored material.
- A newer host opening an older workspace is supported within the same MAJOR; the reverse is not.

## Stored material records its version

A workspace records the schema version that wrote it ([ADR-0002](../../06-adrs/ADR-0002-portable-workspace-format.md)) so a host can decide compatibility before reading. Exports and packages ([ADR-0007](../../06-adrs/ADR-0007-deterministic-package-export.md)) likewise record the contract version they were produced under.

## Deprecation precedes removal

A field or command slated for removal is marked deprecated for at least one MINOR before a MAJOR removes it, so consumers have a release in which to migrate. The exact window length is provisional (≥ one MINOR is the floor).

## How this relates to drift checks

The IPC manifest drift check ([generated-schema-discipline.md](./generated-schema-discipline.md)) catches accidental change; it is the trigger to _consider_ a version bump, not a substitute for the policy. Drift detection answers "did the shape change?"; SemVer answers "is the change breaking?"

## References & standards

- **Semantic Versioning 2.0.0** _(normative: versioning)_.
- **JSON Schema 2020-12** _(informative: the schema shape that evolves additively)_.

## Related documents

| Document                                                           | What it covers                                    |
| ------------------------------------------------------------------ | ------------------------------------------------- |
| [ADR-0017](../../06-adrs/ADR-0017-contract-and-dto-versioning.md)  | The versioning decision and its consequences.     |
| [generated-schema-discipline.md](./generated-schema-discipline.md) | The drift check that triggers a version decision. |
| [error-envelope.md](./error-envelope.md)                           | The stable codes whose rename is a MAJOR.         |
