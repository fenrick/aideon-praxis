# ADR-0030: Governance — Themis

- Status: Accepted
- Date: 2026-06-11
- Depends-On: ADR-0006 (Tauri trust boundary), ADR-0011 (module taxonomy)
- Relates-To: ADR-0023 (threat model), ADR-0019 (observability and audit), ADR-0005 (sync), ADR-0001 (workspace is canonical authority)

## Context

Governance concerns — who someone is, what they may do, what must be approved before it lands, how long content is retained, and what was done by whom — are today scattered. The Host enforces the Tauri capability boundary ([ADR-0006](./ADR-0006-tauri-trust-boundary-and-typed-ipc.md)); the threat model maps access control to STRIDE and OWASP ASVS ([ADR-0023](./ADR-0023-threat-model-stride-asvs.md)); audit and correlation ride on observability ([ADR-0019](./ADR-0019-observability-and-trace-context.md)); and role metadata sits inside a cleartext workspace as policy, not enforcement. No module owns _policy_ as a concern, so identity, RBAC, approvals, retention, and capability policy have no single home and no consistent vocabulary.

The desktop default is a local single-user context with no browser session ([ADR-0006](./ADR-0006-tauri-trust-boundary-and-typed-ipc.md)). Governance becomes load-bearing in two situations the product targets: **hosted mode** (multiple users, a network boundary, real RBAC) and the **Steward participation mode** (review owners working through queues, comparisons, and approvals — [ARTEFACTS-AND-FAMILIES.md](../03-design/ARTEFACTS-AND-FAMILIES.md)). Per the "earns its own module" rule in [ADR-0011](./ADR-0011-module-taxonomy-and-boundaries.md), governance owns a distinct invariant (authority is decided by policy, never assumed), a distinct failure mode (an unauthorised mutation, a missing approval, content kept past its retention), and a distinct seam (the policy-decision interface). It is therefore a module.

## Governance Framing

- **Decision type:** Stable seam (the governance engine behind a typed trait, composed via the Host) + deferred (no crate exists yet; design intent that centralises today's scattered policy).
- **Known future pressure:** hosted multi-tenant deployment with real authentication; richer approval workflows; jurisdiction-specific retention; finer capability policy as the command surface grows; integration with external identity providers.
- **What stays stable:** the Host remains the sole enforcer of the Tauri capability boundary ([ADR-0006](./ADR-0006-tauri-trust-boundary-and-typed-ipc.md)) — Themis decides policy, the Host enforces the seam; every governed action resolves to an append-only, attributable operation ([ADR-0001](./ADR-0001-workspace-is-canonical-authority.md)); audit derives from the op log and observability, never a parallel store.
- **What is provisional:** the RBAC role catalogue and permission model; the approval-workflow vocabulary; the retention-policy expression language.
- **What is deferred:** hosted authentication (bearer/JWKS) as an adapter rather than the desktop default ([ADR-0006](./ADR-0006-tauri-trust-boundary-and-typed-ipc.md)); external identity-provider federation; cross-tenant policy.
- **Why hard to reverse:** the policy-decision interface becomes the seam every governed command consults; once approvals and retention are modelled against it, its shape is a contract, and identity references baked into operations are a data migration to change.

## Decision

Introduce **Themis** (Greek _Themis_, divine order and lawful judgement) as a planned engine module owning **governance**: identity, role-based access control, approval workflows, retention, audit, and capability policy. Themis centralises policy that is currently scattered across Host and Mneme.

1. **Themis decides policy; the Host enforces the boundary.** Themis answers "may this principal perform this action on this content under this policy?" The Host continues to enforce the Tauri capability boundary — the renderer gets product capabilities, not host capabilities ([ADR-0006](./ADR-0006-tauri-trust-boundary-and-typed-ipc.md)) — and consults Themis for the policy decision before a governed command proceeds. The two are distinct: capability scoping is the mechanism, Themis policy is the decision. This separation aligns access control with OWASP ASVS 5.0 (OWASP, _Application Security Verification Standard 5.0_, V8 Authorization): decisions are enforced server-side (here, in Rust), deny-by-default, and never trusted from the renderer.

2. **RBAC, deny-by-default.** Authority is granted by role, evaluated against the action and the content's classification and sensitivity, and denied unless explicitly permitted — consistent with the deny-by-default posture the threat model adopts for untrusted input ([ADR-0023](./ADR-0023-threat-model-stride-asvs.md)). Role metadata in a cleartext local workspace remains _policy, not enforcement_ ([ADR-0006](./ADR-0006-tauri-trust-boundary-and-typed-ipc.md)); enforcement is real only where a trust boundary backs it, which hosted mode supplies.

   **Policy is modelled as explicit, versioned policy operations — not as access-control fields on creation records.** M0 deliberately omits `owner_actor_id`/`acl_group_id`/`visibility` from `create-node`/`create-edge` rather than carry reserved nulls ([ADR-0038](./ADR-0038-canonical-operation-record-identity-and-commit-protocol.md)), because none of "ownership attaches per entity", "ACLs are group-based", or "visibility is a scalar" is settled. Themis introduces policy additively — as policy entities/relationships, classifications, grants, and explicit `policy.*` operations — gated by `manifest.required_features` so an older build refuses read-write rather than misreading an unenforced restriction. An _owner_ is a governance assignment, distinct from the historical author already recorded by an operation's `actor_id`; conflating the two would make a creator automatically control content, which is not generally valid.

3. **Approvals are first-class and underpin the Steward mode.** A governed change may require approval before it lands; Themis models the approval workflow (who must approve, in what order, with what queue) that the Steward participation mode presents as structured review rather than open editing ([ARTEFACTS-AND-FAMILIES.md](../03-design/ARTEFACTS-AND-FAMILIES.md)). A pending change is `Awaiting review` ([DOCUMENTATION-STANDARD.md §9](../02-standards/DOCUMENTATION-STANDARD.md)); acceptance writes the operation through the normal canonical path, attributed to the approver.

4. **Audit derives, it does not duplicate.** Every governed action is attributable through the append-only op log ([ADR-0001](./ADR-0001-workspace-is-canonical-authority.md)) and correlated by trace context ([ADR-0019](./ADR-0019-observability-and-trace-context.md)). Themis defines _what must be auditable and retained_; it does not keep a second source of truth. Retention policy governs how long content and its derivations are kept, expressed as policy over types and classifications.

5. **Boundaries.** Themis governs; it does not store the op log (Mneme), does not enforce the IPC seam (Host), does not define meaning (Praxis), and does not synchronise peers (Koinon, [ADR-0029](./ADR-0029-collaboration-and-sync-koinon.md)) — though it gates which peer may sync. It composes through the Host with no engine-to-engine cycle ([ADR-0011](./ADR-0011-module-taxonomy-and-boundaries.md)).

## Consequences

- Governance gains a single owner and vocabulary; identity, RBAC, approvals, retention, audit, and capability policy stop being scattered across Host and Mneme.
- A new module, crate (`themis`), trait, and frontend workspace (`src/workspaces/themis`) join the roadmap; the C4 model and module dependency map include Themis as a planned component.
- Hosted mode and the Steward participation mode get an accountable policy engine; the desktop single-user default is unchanged because its policy is trivial (one principal, full authority).
- The split — Themis decides, Host enforces — is a deliberate cost: a governed command consults two layers. It buys a verifiable access-control story mapped to ASVS rather than authority assumed at the call site.
- Retention interacts with the append-only invariant ([ADR-0001](./ADR-0001-workspace-is-canonical-authority.md)): deleting content for retention is itself a recorded, forward-only operation, never an in-place erase, which the open question below must resolve.

## Follow-ups / Open Questions

- Confirm the module name **Themis** against alternatives, and whether capability _definitions_ stay in the Host while only _policy_ lives in Themis.
- Define the RBAC role catalogue and permission model, and the ASVS 5.0 access-control controls verified per role, recorded in [SECURITY.md](../02-standards/SECURITY.md).
- Reconcile retention with the append-only op log: how is "delete after N years" expressed when truth is forward-only?
- Specify the approval-workflow vocabulary and how it composes with Continuum durable jobs for multi-step approvals.
- Define the hosted authentication adapter (bearer/JWKS) and external identity-provider federation, deferred per [ADR-0006](./ADR-0006-tauri-trust-boundary-and-typed-ipc.md).

## References & standards

- **OWASP ASVS 5.0** — V8 Authorization (and V1 Architecture) _(normative: access-control verification controls)_.
- Microsoft — **STRIDE** _(informative: Spoofing/Elevation-of-privilege framing for identity and RBAC)_.

## Related documents

| Document                                                     | What it covers                                                           |
| ------------------------------------------------------------ | ------------------------------------------------------------------------ |
| [ADR-0006](./ADR-0006-tauri-trust-boundary-and-typed-ipc.md) | The Tauri capability boundary the Host enforces and Themis decides over. |
| [ADR-0023](./ADR-0023-threat-model-stride-asvs.md)           | The STRIDE/ASVS threat model Themis access control maps onto.            |
| [ADR-0019](./ADR-0019-observability-and-trace-context.md)    | The trace-context correlation audit derives from.                        |
