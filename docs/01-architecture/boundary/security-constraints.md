# Security Constraints

The desktop security baseline that the boundary enforces, the threat frame it sits in, and the single seam that carries
it. This file is the architecture-layer summary; the full posture, controls, and verification live in
[`../../02-standards/SECURITY.md`](../../02-standards/SECURITY.md).

---

## The single boundary

The Tauri invoke bridge is the **sole** security boundary between the renderer and the host. The renderer is an
untrusted, disposable WebView; it receives product-scoped capabilities, not host capabilities, and cannot reach the
filesystem, the object store, sync endpoints, or engine APIs by any other path. This is fixed by
**[ADR-0006](../../06-adrs/ADR-0006-tauri-trust-boundary-and-typed-ipc.md)** (Tauri trust boundary and typed IPC).

| Layer            | Trust level       | Permitted actions                                                  |
| ---------------- | ----------------- | ------------------------------------------------------------------ |
| Rust host        | Fully trusted     | All workspace IO, object store, sync, engine calls, OS key stores. |
| Tauri IPC        | Enforced boundary | Typed commands; capability-gated per window; default deny.         |
| WebView renderer | Untrusted         | Invoke only; no filesystem, no TCP, no arbitrary shell.            |

---

## The desktop baseline

| Constraint        | Rule                                                                                                                                 |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| Renderer HTTP     | Forbidden as the primary communication seam.                                                                                         |
| Local TCP ports   | No open ports in desktop mode; no loopback listener the renderer can reach.                                                          |
| Filesystem access | Mediated by the host; scoped to workspace directories and app data.                                                                  |
| Capability scope  | Per-window; default deny; declared in `src-tauri/capabilities/default.json`.                                                         |
| PII on export     | Deny-by-default; redaction required for any export surface.                                                                          |
| Blob sharing      | Content-addressed — a hash identifies content, not a path, per [ADR-0003](../../06-adrs/ADR-0003-content-addressed-object-store.md). |
| Hosted auth       | Demoted to an adapter contract; the desktop default is a local single-user context.                                                  |

The constraint that only Rust touches side effects is the same proposition 3 of the
[boundary thesis](./boundary-thesis.md): the security baseline and the architecture's side-effect rule are one rule seen
from two angles.

---

## The threat frame

The trust boundary is threat-modelled with **STRIDE** _(Microsoft, STRIDE threat modelling)_ and verified against
**OWASP ASVS 5.0** controls, recorded in **[ADR-0023](../../06-adrs/ADR-0023-threat-model-stride-asvs.md)** (Threat
model — STRIDE + OWASP ASVS 5.0). The frame treats the renderer as the adversarial surface: anything reachable only
through a declared, typed, capability-gated command is in scope; anything the renderer could reach by another path would
be a boundary breach. The mechanism — Tauri capabilities, permissions, CSP, isolation — is the normative control _(Tauri
security model)_.

---

## The trade-off named

A single enforced boundary closes a door: there is no escape hatch for the renderer to do "just one" privileged thing
directly. Every privileged action costs a declared command and a capability entry. The architecture accepts that
overhead because a single boundary is the only one that can be audited completely — an escape hatch is exactly the
surface a threat model cannot bound.

---

## Related documents

| Document                                                                                                                       | What it covers                                         |
| ------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------ |
| [`../../02-standards/SECURITY.md`](../../02-standards/SECURITY.md)                                                             | The full security posture, controls, and verification. |
| [`boundary-thesis.md`](./boundary-thesis.md)                                                                                   | The side-effect proposition this enforces.             |
| [`layers-and-responsibilities.md`](./layers-and-responsibilities.md)                                                           | The renderer's forbidden actions in full.              |
| [`../../06-adrs/ADR-0006-tauri-trust-boundary-and-typed-ipc.md`](../../06-adrs/ADR-0006-tauri-trust-boundary-and-typed-ipc.md) | Tauri trust boundary and typed IPC.                    |
| [`../../06-adrs/ADR-0023-threat-model-stride-asvs.md`](../../06-adrs/ADR-0023-threat-model-stride-asvs.md)                     | Threat model — STRIDE + OWASP ASVS 5.0.                |
