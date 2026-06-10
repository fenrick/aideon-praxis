# Security Standard

Defines the trust boundary, capability scoping, workspace integrity, secrets handling, export posture, and distribution signing rules for Aideon Desktop.

## Trust Boundary

The Tauri invoke bridge is the sole security boundary between the renderer and the host. The renderer is an untrusted, disposable WebView. It receives product-scoped capabilities — not host capabilities — and cannot reach the filesystem, the object store, sync endpoints, or engine APIs by any other path.

| Layer | Trust Level | Permitted Actions |
|---|---|---|
| Rust host | Fully trusted | All workspace IO, object store, sync, engine, OS key stores |
| Tauri IPC | Enforced boundary | Typed commands; capability-gated per window |
| WebView renderer | Untrusted | Invoke only; no filesystem, no TCP, no arbitrary shell |

All workspace reads and writes, object verification, sync calls, and engine invocations stay in Rust. The renderer never accesses workspace paths directly.

## Capability Scoping

Tauri capabilities are declared per-window and follow a deny-by-default policy. A command not listed in the window's capability manifest is unreachable regardless of any renderer-side call.

Rules:

- Each window declares only the capabilities its product surface requires.
- No capability grants broad filesystem or OS access; every path-touching command is mediated by the Rust host.
- No local HTTP server and no open TCP ports exist in desktop mode. There is no loopback listener the renderer can reach.
- Production builds load only local assets. Remote CDNs are not permitted.

See [ADR-0006 — Tauri Trust Boundary and Typed IPC](../06-adrs/ADR-0006-tauri-trust-boundary-and-typed-ipc.md) for the full rationale and command-declaration contract.

## Workspace and File Integrity

The portable workspace folder (`model/ops`, `model/schema`, `objects/sha256`) is the canonical authority. The runtime database under `.aideon/runtime` is derived and rebuildable. The ops log and facts records are canonical; derived projections must not quietly become source of truth.

File permissions on workspace directories and files are set to user-only (`0700`/`0600`). Group and world bits are not granted.

A single-writer queue serialises all workspace mutations. Concurrent writers are not permitted.

## Content-Addressed Blob Verification

Every object stored under `objects/sha256/<digest>` is verified by re-hashing the content against the stored digest before use. An object whose content does not match its address is rejected and must not be read into memory or surfaced to the renderer.

See [ADR-0003 — Content-Addressed Object Store](../06-adrs/ADR-0003-content-addressed-object-store.md) for address format and verification contract.

## Secrets Handling

Secrets — sync tokens, package signing keys, and any credential that must remain confidential — are stored in the OS key store (macOS Keychain, Windows Credential Manager, Linux Secret Service). They are never written to workspace files, the runtime database, or any log.

Rules:

- No secret appears in a workspace file or exported package.
- No secret appears in a log line, even at debug level.
- Secrets are retrieved from the OS key store at the point of use and are not held in memory beyond the operation that requires them.
- The Rust host is the only layer that calls into the OS key store. The renderer never receives raw secret values.

## Role Metadata and Confidentiality

Role and access-level metadata inside a workspace is policy, not an enforcement mechanism. Once a user holds a cleartext workspace folder, metadata flags alone cannot prevent them from reading its contents. Confidentiality for sharing scenarios requires filtered exports and, where needed, encryption envelopes applied at export time — not metadata flags on workspace records.

## Export Filtering and Encryption Posture

All exports default to PII redaction. Personally identifiable fields are stripped before any package or diff is written to disk or transmitted.

Selective sharing of workspace content uses filtered exports that materialise only the subset of facts and objects the export is authorised to include. The deterministic export pipeline is the single path for producing shareable packages.

Where an encryption envelope is required — for example, for a package intended for a specific recipient — encryption is applied by the Rust host as a post-filter step. The renderer requests an export; the host applies filtering then encryption; the renderer receives only a confirmation or the resulting opaque bytes.

See [ADR-0007 — Deterministic Package Export](../06-adrs/ADR-0007-deterministic-package-export.md) for the export pipeline contract.

## Authentication Context

The desktop default auth context is a local single-user context. No bearer token, JWKS endpoint, or session cookie is required for normal desktop operation.

Hosted sync and cloud adapters may authenticate using a bearer token verified against a JWKS endpoint. When present, this path is an optional adapter, not the base auth model. The adapter:

- keeps tokens in the OS key store, not workspace files;
- never passes raw tokens to the renderer;
- validates token signature, issuer, audience, expiry, and required claims before trusting any cloud response.

Role-based or org-scoped access control carried in token claims is advisory context for sync decisions, not an enforcement ceiling for local workspace access.

## Deny-by-Default Policy

Every capability, command, and data-access path is denied unless explicitly declared and granted. The default answer to any access question is no. Additions to the capability manifest require explicit justification and review.

This posture applies to:

- Tauri window capabilities
- IPC command declarations
- Filesystem paths the host will read or write
- Sync endpoints the host will connect to
- OS key store entries the host will access

## PII Redaction Rules

PII redaction is mandatory on all export and diff surfaces. The following field classes are redacted by default:

- display names and email addresses
- free-text notes and comments that may contain personal information
- device identifiers and OS user names
- any field tagged `pii: true` in the workspace schema

A redacted export must not leak PII through derived fields, object references, or blob content. The export pipeline verifies redaction before finalising the package.

See [docs/04-contracts/CONTRACTS-AND-SCHEMAS.md](../04-contracts/CONTRACTS-AND-SCHEMAS.md) for the schema tagging contract.

## Code Signing and Distribution

Production binaries are signed and notarised before distribution.

| Platform | Requirement |
|---|---|
| macOS | Developer ID Application certificate; notarisation via Apple notary service; stapled ticket |
| Windows | Authenticode signing with a valid EV or OV code-signing certificate |
| Linux | GPG-signed package or AppImage; SHA-256 checksums published alongside the release |

Unsigned builds must not be distributed as release artifacts. CI must verify signing before publishing.

## Vulnerability Reporting

To report a vulnerability, open a private security issue in the repository or contact the maintainers directly. Do not disclose security issues in public issue threads.

## References

- [Architecture Boundary](../01-architecture/ARCHITECTURE-BOUNDARY.md)
- [Desktop-First Workspace](../03-design/DESKTOP-FIRST-WORKSPACE.md)
- [Contracts and Schemas](../04-contracts/CONTRACTS-AND-SCHEMAS.md)
- [ADR-0003 — Content-Addressed Object Store](../06-adrs/ADR-0003-content-addressed-object-store.md)
- [ADR-0006 — Tauri Trust Boundary and Typed IPC](../06-adrs/ADR-0006-tauri-trust-boundary-and-typed-ipc.md)
- [ADR-0007 — Deterministic Package Export](../06-adrs/ADR-0007-deterministic-package-export.md)
