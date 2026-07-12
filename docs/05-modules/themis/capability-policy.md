# Capability policy

The split that defines Themis: Themis decides policy, the Host enforces the Tauri capability boundary. For practitioners
reasoning about where an access-control decision is made and where it is enforced.

> **PLANNED.** No `themis` crate exists; this is design intent per
> [ADR-0030](../../06-adrs/ADR-0030-governance-themis.md).

## Themis decides; the Host enforces

The defining design move for Themis is the separation of **decision** from **enforcement**
([ADR-0030](../../06-adrs/ADR-0030-governance-themis.md)):

- **Themis decides policy.** It answers "may this principal perform this action on this content under this policy?" —
  returning `Permit`, `Deny`, or `RequireApproval` ([Themis README](./README.md)).
- **The Host enforces the boundary.** The Host continues to enforce the Tauri capability boundary — the renderer gets
  product capabilities, not host capabilities ([ADR-0006](../../06-adrs/ADR-0006-tauri-trust-boundary-and-typed-ipc.md))
  — and **consults Themis for the policy decision before a governed command proceeds**
  ([ADR-0030](../../06-adrs/ADR-0030-governance-themis.md)).

The two are distinct: **capability scoping is the mechanism**, **Themis policy is the decision**
([ADR-0030](../../06-adrs/ADR-0030-governance-themis.md)). The Tauri capability boundary is _how_ the renderer is
confined to a safe surface; the Themis policy is _whether_ a given principal may take a given action within that
surface. Conflating them would either bury policy in the capability manifest (where it cannot express role-and-content
decisions) or move enforcement out of the Host (where the trust boundary lives).

## Why the split is worth its cost

The split is a deliberate cost: a governed command consults two layers — the policy decision (Themis) and the boundary
enforcement (Host). It buys a **verifiable access-control story mapped to OWASP ASVS 5.0** (V8 Authorization) rather
than authority assumed at the call site ([ADR-0030](../../06-adrs/ADR-0030-governance-themis.md)). ASVS expects
authorization decisions to be enforced server-side, deny-by-default, and never trusted from the client; the
Themis-decides/Host-enforces split is how the product meets that expectation in a Tauri architecture, with the decision
in Rust and the boundary in the Host ([ADR-0023](../../06-adrs/ADR-0023-threat-model-stride-asvs.md)).

## An open boundary question

Whether **capability definitions stay in the Host while only policy lives in Themis** is an open question
([ADR-0030](../../06-adrs/ADR-0030-governance-themis.md)). The design intent leans that way — the Host owns the
capability mechanism, Themis owns the policy decision — but the exact line between a capability _definition_ and a
policy _rule_ is to be settled. Either way, the invariant holds: the Host remains the **sole enforcer** of the Tauri
capability boundary, and Themis never enforces it directly.

## Worked example

The renderer issues a command to edit the `sensitivity` slot of the seed `DataEntity` `n:data-entity:engagement-event`
(`sensitivity = Confidential`). First, the **Host capability boundary** confines the renderer to the product command
surface — the renderer cannot reach the filesystem or a model directly, only the typed command
([ADR-0006](../../06-adrs/ADR-0006-tauri-trust-boundary-and-typed-ipc.md)). Then, before the command proceeds, the
**Host consults Themis**: may this principal edit Confidential data under this policy? Themis returns `Deny` for a role
without that permission, `Permit` for one with it, or `RequireApproval` if the policy gates it. The Host enforces the
returned decision. On the single-user desktop, Themis returns `Permit` (one principal, full authority) and the command
proceeds.

## References & standards

_Normative:_

- **OWASP ASVS 5.0** — V8 Authorization (and V1 Architecture). Decision enforced server-side, deny-by-default.
- **Tauri security model** (capabilities, permissions, CSP, isolation). The boundary the Host enforces.

_Informative:_

- Microsoft — **STRIDE**. Elevation-of-privilege framing for the decision/enforcement split.

Recorded in the [standards register](../../02-standards/STANDARDS-REGISTER.md).

## Related documents

| Document                                                                 | What it covers                                    |
| ------------------------------------------------------------------------ | ------------------------------------------------- |
| [Themis README](./README.md)                                             | The module index and invariants.                  |
| [Identity and RBAC](./identity-and-rbac.md)                              | The role evaluation behind a policy decision.     |
| [ADR-0006](../../06-adrs/ADR-0006-tauri-trust-boundary-and-typed-ipc.md) | The Tauri capability boundary the Host enforces.  |
| [ADR-0030](../../06-adrs/ADR-0030-governance-themis.md)                  | The decision that fixes the decide/enforce split. |
