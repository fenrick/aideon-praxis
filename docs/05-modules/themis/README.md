# Themis — governance

Themis is the planned governance engine of the Aideon twin: identity, role-based access control, approval workflows, retention, audit, and capability policy. Themis decides policy; the Host enforces the Tauri capability boundary. It centralises policy that is today scattered across Host and Mneme.

> **Implementation status: PLANNED.** No `themis` crate exists. Everything in this folder is **design intent** — framed in the present tense as the standard requires, but describing behaviour not yet in code. The boundary, the authority-by-policy invariant, the deny-by-default RBAC posture, and the Themis-decides/Host-enforces split are normative now and constrain the implementation when it lands. The governing decision is [ADR-0030](../../06-adrs/ADR-0030-governance-themis.md).

This README is the index and the cross-cutting narrative; each focused topic lives in its own file, per the [Documentation Standard §4](../../02-standards/DOCUMENTATION-STANDARD.md) granularity rule.

---

## Contents

1. [Identity and RBAC](./identity-and-rbac.md) — who a principal is, and authority granted by role, deny-by-default.
2. [Approvals and workflow](./approvals-and-workflow.md) — first-class approvals underpinning the Steward mode.
3. [Retention and audit](./retention-and-audit.md) — audit derived from the op log, retention as forward-only operations.
4. [Capability policy](./capability-policy.md) — Themis decides policy, the Host enforces the Tauri seam.

---

## One-line role

Themis answers "may this principal perform this action on this content under this policy?" — granting authority by role, deny-by-default, gating governed changes behind approvals, and defining what must be audited and retained, while the Host remains the sole enforcer of the capability boundary.

## The boundary it occupies

Themis occupies the **policy-decision** boundary. It is the single home for governance concerns — identity, RBAC, approvals, retention, audit, and capability policy — that today are scattered: the Host enforces the Tauri capability boundary ([ADR-0006](../../06-adrs/ADR-0006-tauri-trust-boundary-and-typed-ipc.md)), the threat model maps access control to STRIDE and OWASP ASVS ([ADR-0023](../../06-adrs/ADR-0023-threat-model-stride-asvs.md)), audit rides on observability ([ADR-0019](../../06-adrs/ADR-0019-observability-and-trace-context.md)), and role metadata sits in the workspace as policy, not enforcement. Governance becomes load-bearing in **hosted mode** (multiple users, a network boundary, real RBAC) and the **Steward participation mode** ([ARTEFACTS-AND-FAMILIES.md](../../03-design/ARTEFACTS-AND-FAMILIES.md)); the desktop single-user default has trivial policy (one principal, full authority).

## Invariants

- **Authority is decided by policy, never assumed.** Every governed action resolves through a Themis policy decision before it proceeds; authority is never assumed at the call site ([ADR-0030](../../06-adrs/ADR-0030-governance-themis.md)).
- **Themis decides; the Host enforces.** Themis answers the policy question; the Host continues to enforce the Tauri capability boundary — the renderer gets product capabilities, not host capabilities ([ADR-0006](../../06-adrs/ADR-0006-tauri-trust-boundary-and-typed-ipc.md)). Capability scoping is the mechanism; Themis policy is the decision. This aligns with OWASP ASVS 5.0 V8 Authorization: decisions are enforced in Rust, deny-by-default, never trusted from the renderer ([ADR-0030](../../06-adrs/ADR-0030-governance-themis.md)).
- **RBAC is deny-by-default.** Authority is granted by role, evaluated against the action and the content's classification and sensitivity, and denied unless explicitly permitted ([ADR-0030](../../06-adrs/ADR-0030-governance-themis.md); [ADR-0023](../../06-adrs/ADR-0023-threat-model-stride-asvs.md)).
- **Audit derives; it does not duplicate.** Every governed action is attributable through the append-only op log ([ADR-0001](../../06-adrs/ADR-0001-workspace-is-canonical-authority.md)) and correlated by trace context ([ADR-0019](../../06-adrs/ADR-0019-observability-and-trace-context.md)). Themis defines what must be auditable and retained; it keeps no second source of truth ([ADR-0030](../../06-adrs/ADR-0030-governance-themis.md)).

## What it owns / what it does not own

**Owns:** the policy-decision interface; the RBAC role catalogue and permission model; the approval-workflow vocabulary; the retention policy over types and classifications; the definition of what must be auditable. It governs which peer may sync ([Koinon](../koinon/README.md), [ADR-0029](../../06-adrs/ADR-0029-collaboration-and-sync-koinon.md)).

**Does not own:** the op log (Mneme); enforcement of the IPC/capability seam (Host — Themis decides, the Host enforces); meaning and the metamodel (Praxis); peer synchronisation itself (Koinon); a parallel audit store (audit derives from the op log and observability). The role catalogue, permission model, approval vocabulary, and retention-expression language are all **provisional** ([ADR-0030](../../06-adrs/ADR-0030-governance-themis.md)).

## Public trait seam (design intent)

Themis is reached only through the host, which consults it before a governed command proceeds and then enforces the boundary itself:

```rust
// design intent — not yet a crate
pub trait Themis {
    fn decide(&self, principal: &Principal, action: &Action, content: &ContentRef)
        -> Result<PolicyDecision, ProblemDetails>; // Permit / Deny / RequireApproval
    fn retention(&self, content: &ContentRef) -> Result<RetentionPolicy, ProblemDetails>;
}
```

A `PolicyDecision` is `Permit`, `Deny`, or `RequireApproval`; the Host enforces it. Errors follow RFC 9457 ([ADR-0016](../../06-adrs/ADR-0016-error-envelope-rfc9457.md)). The shapes are provisional until a crate exists.

## Integration with other modules (via the host)

Themis is an engine and **depends on no other engine** ([ADR-0011](../../06-adrs/ADR-0011-module-taxonomy-and-boundaries.md)). The host composes it:

- **Host** — consults Themis for the policy decision, then enforces the Tauri capability boundary ([ADR-0006](../../06-adrs/ADR-0006-tauri-trust-boundary-and-typed-ipc.md)).
- **Mneme** — the op log every governed action resolves to and audit derives from.
- **Continuum** — multi-step approvals may compose with durable jobs ([approvals and workflow](./approvals-and-workflow.md)).
- **[Koinon](../koinon/README.md)** — Themis gates which peer may sync ([ADR-0030](../../06-adrs/ADR-0030-governance-themis.md)).

The planned crate name is `aideon_themis`.

## References & standards

_Normative:_

- **OWASP ASVS 5.0** — V8 Authorization (and V1 Architecture). Access-control verification controls.

_Informative:_

- Microsoft — **STRIDE**. Spoofing / elevation-of-privilege framing for identity and RBAC.

Full bibliography: [STANDARDS-REGISTER.md](../../02-standards/STANDARDS-REGISTER.md).

## Related documents

| Document                                                                 | What it covers                                                           |
| ------------------------------------------------------------------------ | ------------------------------------------------------------------------ |
| [ADR-0030](../../06-adrs/ADR-0030-governance-themis.md)                  | The decision that introduces Themis and fixes its invariants.            |
| [ADR-0006](../../06-adrs/ADR-0006-tauri-trust-boundary-and-typed-ipc.md) | The Tauri capability boundary the Host enforces and Themis decides over. |
| [ADR-0023](../../06-adrs/ADR-0023-threat-model-stride-asvs.md)           | The STRIDE/ASVS threat model Themis access control maps onto.            |
| [SECURITY.md](../../02-standards/SECURITY.md)                            | The security controls and per-role ASVS verification.                    |
| [Module dependency map](../../01-architecture/module-dependency-map.md)  | The crate dependency graph and the acyclic invariant.                    |
