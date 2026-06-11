# Identity and RBAC

How Themis establishes who a principal is and grants authority by role, deny-by-default. For practitioners reasoning about access control in hosted mode and why local role metadata is policy, not enforcement.

> **PLANNED.** No `themis` crate exists; this is design intent per [ADR-0030](../../06-adrs/ADR-0030-governance-themis.md).

## Authority by role, deny-by-default

Authority in Themis is **granted by role, evaluated against the action and the content's classification and sensitivity, and denied unless explicitly permitted** ([ADR-0030](../../06-adrs/ADR-0030-governance-themis.md)). Deny-by-default is the same posture the threat model adopts for untrusted input ([ADR-0023](../../06-adrs/ADR-0023-threat-model-stride-asvs.md)): the absence of an explicit grant is a denial, not a gap. This aligns access control with OWASP ASVS 5.0 V8 Authorization — decisions are enforced server-side (here, in Rust), deny-by-default, and never trusted from the renderer ([ADR-0030](../../06-adrs/ADR-0030-governance-themis.md)).

A decision considers three things together: the **principal's role**, the **action** requested, and the **content** it targets — including its content classification (Asserted / Inferred / Generated, [`CONTEXT.md`](../../../CONTEXT.md)) and its sensitivity (for example a `DataEntity`'s `sensitivity` slot). So a role may be permitted to edit Internal data but denied on Confidential, evaluated per action.

## Policy versus enforcement

Role metadata in a cleartext local workspace is **policy, not enforcement** ([ADR-0030](../../06-adrs/ADR-0030-governance-themis.md); [ADR-0006](../../06-adrs/ADR-0006-tauri-trust-boundary-and-typed-ipc.md)). On a single-user desktop there is no trust boundary between the user and their own files, so a role recorded in the workspace expresses intent but cannot be enforced against the workspace's owner. **Enforcement is real only where a trust boundary backs it**, which **hosted mode** supplies — multiple users, a network boundary, real authentication ([ADR-0030](../../06-adrs/ADR-0030-governance-themis.md)). The desktop default is unchanged because its policy is trivial: one principal, full authority.

This distinction is honest about what the product can and cannot guarantee: it does not pretend a local cleartext workspace enforces RBAC against its owner; it records the policy and enforces it where a boundary exists.

## Identity

Themis establishes the principal whose role is evaluated. On the desktop default the principal is the single local user. In hosted mode, identity comes through an authentication adapter — bearer/JWKS — which is **deferred** as an adapter rather than the desktop default ([ADR-0030](../../06-adrs/ADR-0030-governance-themis.md); [ADR-0006](../../06-adrs/ADR-0006-tauri-trust-boundary-and-typed-ipc.md)). External identity-provider federation and cross-tenant policy are likewise deferred. Identity references baked into operations are attributable through the op log, which is what makes a governed action auditable ([retention and audit](./retention-and-audit.md)).

## Provisional

The **RBAC role catalogue and permission model are provisional** ([ADR-0030](../../06-adrs/ADR-0030-governance-themis.md)). The role catalogue, the permission model, and the specific ASVS 5.0 access-control controls verified per role are an open question to be recorded in [SECURITY.md](../../02-standards/SECURITY.md). What is fixed now is the posture: deny-by-default, decided by Themis, enforced where a boundary backs it.

## Worked example

In hosted mode, a principal with a "Reviewer" role requests to edit the `disposition` slot of the seed `Application` `n:application:automation-orchestrator`. Themis evaluates the role against the action (edit a slot) and the content (an `Application`, no elevated sensitivity). If the Reviewer role's permissions do not explicitly grant slot edits, the decision is `Deny` by default. The same principal requesting to _read_ the application is permitted if the role grants read. A principal requesting to edit the `sensitivity` of `n:data-entity:engagement-event` (`Confidential`) is denied unless the role explicitly permits editing Confidential data. On the single-user desktop, all of these are permitted, because the sole principal has full authority and the workspace role metadata is policy, not enforcement.

## References & standards

_Normative:_

- **OWASP ASVS 5.0** — V8 Authorization. Deny-by-default, server-side access-control verification.

_Informative:_

- Microsoft — **STRIDE**. Spoofing and elevation-of-privilege framing.

Recorded in the [standards register](../../02-standards/STANDARDS-REGISTER.md).

## Related documents

| Document                                                                 | What it covers                                      |
| ------------------------------------------------------------------------ | --------------------------------------------------- |
| [Themis README](./README.md)                                             | The module index and invariants.                    |
| [Capability policy](./capability-policy.md)                              | The Themis-decides / Host-enforces split.           |
| [ADR-0006](../../06-adrs/ADR-0006-tauri-trust-boundary-and-typed-ipc.md) | Why local role metadata is policy, not enforcement. |
| [SECURITY.md](../../02-standards/SECURITY.md)                            | The per-role ASVS controls to be recorded.          |
