# Trust Boundary

What is trusted, what is not, and exactly where the line sits. This file is the foundation the rest of the
[security folder](./README.md) builds on; the threat model ([threat-model.md](./threat-model.md)) reasons about threats
_to_ this boundary, and the controls ([controls-asvs.md](./controls-asvs.md)) verify its defences.

## The single boundary

The Tauri invoke bridge is the sole security boundary between the renderer and the host
([ADR-0006](../../06-adrs/ADR-0006-tauri-trust-boundary-and-typed-ipc.md)). The renderer is an untrusted, disposable
WebView. It receives **product-scoped capabilities — not host capabilities** — and cannot reach the filesystem, the
object store, sync endpoints, or engine APIs by any other path.

| Layer                | Trust level       | Permitted actions                                                                               |
| -------------------- | ----------------- | ----------------------------------------------------------------------------------------------- |
| **Rust host**        | Fully trusted     | All workspace I/O, object store, sync, engine invocation, OS key store.                         |
| **Tauri IPC**        | Enforced boundary | Typed commands; capability-gated per window ([capability-scoping.md](./capability-scoping.md)). |
| **WebView renderer** | Untrusted         | `invoke` only; no filesystem, no TCP, no arbitrary shell.                                       |

All workspace reads and writes, object verification, sync calls, and engine invocations stay in Rust. The renderer never
accesses workspace paths directly.

## Why one boundary, not many

A single enforced boundary is the load-bearing simplification: most STRIDE categories
([threat-model.md](./threat-model.md)) reduce to "the renderer cannot do X because it is untrusted and X requires the
host". Concentrating trust in one place — Rust owns side effects — means there is one surface to validate, one place to
scope capability, and no second path to audit. The trade-off is that every privileged action must round-trip through a
typed IPC command; there is no fast path that bypasses the boundary, by design.

## Untrusted input crosses the boundary too

The renderer is not the only untrusted source. Two further surfaces carry untrusted input across a boundary into trusted
code:

- **Imported files** become twin content through the planned interchange module
  ([ADR-0013](../../06-adrs/ADR-0013-interchange-and-interoperability-pylon.md)). The user vouches for a file's
  provenance, not its content; an import is validated against the metamodel and surfaces anything ambiguous as
  `Awaiting review` rather than executing it.
- **Generated content** from AI assistance
  ([ADR-0014](../../06-adrs/ADR-0014-ai-assistance-and-generated-provenance-sophia.md)) is a suggestion until accepted;
  it is never silently promoted to Asserted content ([CONTEXT.md](../../../CONTEXT.md)).

Both are handled deny-by-default: hostile until validated
([ADR-0023](../../06-adrs/ADR-0023-threat-model-stride-asvs.md)).

## What the boundary does not do

A trust boundary is not a confidentiality mechanism over a cleartext workspace. Once a user holds a workspace folder,
role and access-level metadata inside it cannot stop them reading its contents — metadata is **policy, not enforcement**
([capability-scoping.md](./capability-scoping.md)). Confidentiality for sharing requires filtered exports and, where
needed, encryption applied at export time ([pii-and-export-redaction.md](./pii-and-export-redaction.md)), not flags on
records.

## Authentication context

The desktop default is a **local single-user context**: no bearer token, JWKS endpoint, or session cookie is required
for normal operation. There is no network trust boundary to defend on the desktop.

Hosted sync and cloud adapters may authenticate with a bearer token verified against a JWKS endpoint. When present, this
path is an optional adapter, not the base model, and is **deferred** design intent
([ADR-0030](../../06-adrs/ADR-0030-governance-themis.md)). The adapter keeps tokens in the OS key store
([secrets-and-keys.md](./secrets-and-keys.md)), never passes raw tokens to the renderer, and validates signature,
issuer, audience, expiry, and required claims before trusting any cloud response. Role or org-scoped claims are advisory
context for sync decisions, not an enforcement ceiling for local workspace access.

## References & standards

_Normative:_

- **Tauri security model** (capabilities, permissions, CSP, isolation).
  _([ADR-0006](../../06-adrs/ADR-0006-tauri-trust-boundary-and-typed-ipc.md))_

Recorded in the [standards register](../STANDARDS-REGISTER.md).

## Related documents

| Document                                                                 | What it covers                                                |
| ------------------------------------------------------------------------ | ------------------------------------------------------------- |
| [Security index](./README.md)                                            | The whole security standard.                                  |
| [threat-model.md](./threat-model.md)                                     | The threats this boundary defends against.                    |
| [capability-scoping.md](./capability-scoping.md)                         | How capabilities are scoped and policy is decided.            |
| [ADR-0006](../../06-adrs/ADR-0006-tauri-trust-boundary-and-typed-ipc.md) | The full boundary rationale and command-declaration contract. |
