# Capability Scoping

How Tauri capabilities are scoped to windows, and how the division of labour works: the planned governance module **[Themis](../../06-adrs/ADR-0030-governance-themis.md) decides policy, the Host enforces the boundary**. This realises the access-control concern of [controls-asvs.md](./controls-asvs.md) (ASVS V8 Authorization).

## Per-window, deny-by-default

Tauri capabilities are declared per-window and follow a deny-by-default policy. A command not listed in the window's capability manifest is unreachable, regardless of any renderer-side call ([ADR-0006](../../06-adrs/ADR-0006-tauri-trust-boundary-and-typed-ipc.md)).

Rules:

- Each window declares only the capabilities its product surface requires.
- No capability grants broad filesystem or OS access; every path-touching command is mediated by the Rust host.
- No local HTTP server and no open TCP ports exist in desktop mode — there is no loopback listener the renderer can reach.
- Production builds load only local assets under a strict Content-Security-Policy; remote CDNs are not permitted.
- Additions to a capability manifest require explicit justification and review ([CODING-STANDARDS.md §15](../CODING-STANDARDS.md#15-secure-coding)), and are scored on the governance reversibility rubric ([DESIGN-GOVERNANCE.md §7](../DESIGN-GOVERNANCE.md#7-change-impact-and-reversibility-rubric)) because the IPC surface is a stable seam.

Deny-by-default applies uniformly to Tauri window capabilities, IPC command declarations, filesystem paths the host will read or write, sync endpoints the host will connect to, and OS key-store entries the host will access ([secrets-and-keys.md](./secrets-and-keys.md)). The default answer to any access question is no.

## The mechanism vs the decision

Capability scoping is the **mechanism**; it answers "can this window reach this command at all?" It is enforced by the Host at the Tauri seam and cannot be relaxed from the renderer.

Authorisation policy is the **decision**; it answers "may this principal perform this action on this content under this policy?" That decision is the concern of the planned governance module **Themis** ([ADR-0030](../../06-adrs/ADR-0030-governance-themis.md)). The two are deliberately distinct:

- **Themis decides policy.** It evaluates the action against the principal's role, the content's classification and sensitivity, deny-by-default, and answers a permit/deny ([ADR-0030](../../06-adrs/ADR-0030-governance-themis.md)).
- **The Host enforces the boundary.** It continues to enforce the Tauri capability seam — the renderer gets product capabilities, not host capabilities — and consults Themis for the policy decision before a governed command proceeds.

This split aligns access control with ASVS V8: decisions are enforced server-side (here, in Rust), deny-by-default, and never trusted from the renderer ([controls-asvs.md](./controls-asvs.md)). The cost is that a governed command consults two layers — capability enforcement and policy decision — rather than one; the benefit is a verifiable access-control story rather than authority assumed at the call site ([ADR-0030](../../06-adrs/ADR-0030-governance-themis.md)).

Themis is **planned** ([ADR-0030](../../06-adrs/ADR-0030-governance-themis.md) is Proposed); no crate exists yet. In the desktop single-user default the policy is trivial — one principal, full authority — so the Host enforces the capability boundary and the policy decision is a constant permit. The division above is the design intent that becomes load-bearing in hosted mode and the Steward participation mode.

## Role metadata is policy, not enforcement

Role and access-level metadata inside a cleartext workspace is **policy, not an enforcement mechanism** ([trust-boundary.md](./trust-boundary.md)). Once a user holds a cleartext workspace folder, metadata flags alone cannot prevent them reading its contents. Enforcement is real only where a trust boundary backs it, which hosted mode supplies ([ADR-0030](../../06-adrs/ADR-0030-governance-themis.md)); confidentiality for local sharing comes from filtered/encrypted exports ([pii-and-export-redaction.md](./pii-and-export-redaction.md)), not record flags.

## Worked example

A reporting window ([ADR-0015](../../06-adrs/ADR-0015-reporting-and-publishing-kerux.md)) declares only the capabilities to read a snapshot and request an export. A renderer-side script in that window that tries to `invoke` a workspace-write command fails at the Host: the command is not in the window's manifest, so it is unreachable (deny-by-default, the mechanism). When Themis lands, an export command in that window also consults Themis, which denies exporting `confidential` content to an unauthorised principal (the decision) — and the Host returns a `permission`-category error ([ADR-0016](../../06-adrs/ADR-0016-error-envelope-rfc9457.md)).

## References & standards

_Normative:_

- **Tauri security model** (capabilities, permissions, CSP). _([ADR-0006](../../06-adrs/ADR-0006-tauri-trust-boundary-and-typed-ipc.md))_
- **OWASP ASVS 5.0** — V8 Authorization. _([ADR-0030](../../06-adrs/ADR-0030-governance-themis.md))_

Recorded in the [standards register](../STANDARDS-REGISTER.md).

## Related documents

| Document                                                                      | What it covers                                             |
| ----------------------------------------------------------------------------- | ---------------------------------------------------------- |
| [trust-boundary.md](./trust-boundary.md)                                      | The boundary capabilities are scoped at.                   |
| [controls-asvs.md](./controls-asvs.md)                                        | The ASVS access-control control this realises.             |
| [ADR-0006](../../06-adrs/ADR-0006-tauri-trust-boundary-and-typed-ipc.md)      | The capability mechanism and command-declaration contract. |
| [ADR-0030 — Governance (Themis)](../../06-adrs/ADR-0030-governance-themis.md) | The policy engine that decides authority.                  |
| [Host capabilities and CSP](../../05-modules/host/capabilities-and-csp.md)    | The host implementation of the capability manifest.        |
