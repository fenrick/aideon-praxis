# Renderer Compromise Scenarios

What an attacker who has achieved code execution inside the untrusted renderer can and cannot do, scenario by scenario,
mapped to the capability/IPC boundary. This file makes the abstract "the renderer is untrusted" of the
[threat model](./threat-model.md) concrete: it walks the realistic compromise paths, states each one's blast radius, and
names the single control that bounds it.

The renderer-untrusted invariant carries most of STRIDE ([threat-model.md](./threat-model.md)), so it is worth showing
exactly how far a compromise reaches before it is stopped. A reader who needs to know "if XSS fires in the WebView, what
is lost?" answers it here.

## The starting position

Every scenario below assumes the attacker has already won the renderer: arbitrary JavaScript runs in the WebView with
the privileges of the page. The two realistic routes to that position are:

- **Injected script (XSS-class).** A crafted string in twin content, an import, or a generated suggestion becomes
  executable markup the renderer renders. The strict Content-Security-Policy
  ([capabilities-and-csp.md](../../05-modules/host/capabilities-and-csp.md)) is the control that _prevents_ this; these
  scenarios assume it has been bypassed and reason about the blast radius that remains.
- **Malicious dependency.** A compromised npm package in the renderer bundle ships hostile code into the WebView at
  build time. The supply-chain controls ([supply-chain.md](./supply-chain.md)) are the control that prevents this; here
  we assume one slipped through and bound what it can reach.

In both cases the attacker holds the renderer's authority and nothing more. The renderer holds **product capabilities,
not host capabilities** ([trust-boundary.md](./trust-boundary.md),
[ADR-0006](../../06-adrs/ADR-0006-tauri-trust-boundary-and-typed-ipc.md)): it can `invoke` only the narrow named
commands declared in the active window's manifest
([capabilities-and-csp.md](../../05-modules/host/capabilities-and-csp.md)), and it has no filesystem, no socket, and no
shell.

## What the compromised renderer can do

Within its product capabilities, a compromised renderer is indistinguishable from a legitimate one — the boundary cannot
tell a hostile `invoke` from an honest one, only whether the command is permitted. So the attacker can:

- **Issue any IPC command the active window declares**, with any payload that passes contract validation
  ([CONTRACTS-AND-SCHEMAS.md](../../04-contracts/CONTRACTS-AND-SCHEMAS.md)). In the `main` window this includes reading
  snapshots, appending operations, and requesting exports
  ([IPC command surface](../../05-modules/host/ipc-command-surface.md)).
- **Read whatever those commands return** — the resolved twin at the current viewpoint, an artefact result, a blob
  fetched by hash.
- **Author canonical mutations** by appending operations, within the single-writer queue's backpressure
  ([ADR-0006](../../06-adrs/ADR-0006-tauri-trust-boundary-and-typed-ipc.md)). These are real, attributable writes (see
  _Repudiation_ below).
- **Drive the export path** to request a package — but only one redacted deny-by-default
  ([pii-and-export-redaction.md](./pii-and-export-redaction.md)).

This is the residual surface the boundary deliberately leaves open: the renderer must be able to do its job through IPC,
and a compromise inherits exactly that job and no more.

## What the compromised renderer cannot do

The boundary holds because the renderer never had these powers to lose:

- **It cannot read or write an arbitrary file.** Path resolution is the host's alone; the renderer never receives a
  filesystem path ([capabilities-and-csp.md](../../05-modules/host/capabilities-and-csp.md)). It cannot name
  `objects/sha256/…`, the op log, the runtime database, or any path outside the boundary.
- **It cannot open a socket or reach the network.** There is no local HTTP server and no open TCP port in desktop mode
  ([process-and-trust-boundary.md](../../05-modules/host/process-and-trust-boundary.md)); a strict CSP forbids loading
  remote assets ([capabilities-and-csp.md](../../05-modules/host/capabilities-and-csp.md)). There is no exfiltration
  channel.
- **It cannot reach a secret.** Sync tokens, signing keys, and credentials live in the OS key store, which only the host
  calls; the renderer never receives a raw secret value ([secrets-and-keys.md](./secrets-and-keys.md)).
- **It cannot invoke a command outside the window's manifest.** A command absent from `appcommands.toml` is denied at
  the Tauri layer before any Rust handler runs
  ([capabilities-and-csp.md](../../05-modules/host/capabilities-and-csp.md)); deny-by-default is enforced by
  construction, not by a renderer-side check it could disable.
- **It cannot run a shell, load a plugin, or gain host powers.** The renderer holds product capabilities only
  ([ADR-0006](../../06-adrs/ADR-0006-tauri-trust-boundary-and-typed-ipc.md)); there is no escalation path from a product
  command to a host capability.
- **It cannot corrupt canonical material undetected.** Blobs are verified by re-hashing on read
  ([blobs-and-integrity.md](./blobs-and-integrity.md)); the renderer owns no durable store to tamper with in the first
  place ([trust-boundary.md](./trust-boundary.md)).
- **It cannot escape attribution.** Every mutation it issues is a recorded, attributable operation in the append-only op
  log ([audit-and-logging.md](./audit-and-logging.md)).

## Scenarios mapped to STRIDE

Each row is a concrete compromise, its STRIDE category, its blast radius, and the single control that bounds it.
Categories follow the trust-boundary STRIDE table ([threat-model.md](./threat-model.md)).

| Scenario                                                                    | STRIDE                        | Blast radius if unbounded                | Bounded to                                                             | Control                                                                                                                                                                                 |
| --------------------------------------------------------------------------- | ----------------------------- | ---------------------------------------- | ---------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Injected script reads the local `model/ops` op log directly                 | Information disclosure / EoP  | Full canonical material on disk          | Nothing — no filesystem path reaches the renderer                      | Host owns path resolution ([capabilities-and-csp.md](../../05-modules/host/capabilities-and-csp.md))                                                                                    |
| Script opens a WebSocket to exfiltrate a `confidential` `DataEntity`        | Information disclosure        | Silent exfiltration of any read content  | Nothing — no socket, no remote origin, no open port                    | No renderer network; strict CSP ([process-and-trust-boundary.md](../../05-modules/host/process-and-trust-boundary.md))                                                                  |
| Script calls an undeclared `workspace_write`-style command                  | Elevation of privilege        | Arbitrary host action                    | Denied before the Rust handler runs                                    | Per-window deny-by-default manifest ([capability-scoping.md](./capability-scoping.md))                                                                                                  |
| Script drives the export command to ship a package containing personal data | Information disclosure        | PII leaves the device                    | A redacted, filtered package only                                      | Deny-by-default export redaction ([pii-and-export-redaction.md](./pii-and-export-redaction.md))                                                                                         |
| Script appends a flood of operations to corrupt or stall the twin           | Tampering / Denial of service | Write-queue saturation; bad twin content | Attributable ops, backpressured; bad content is reviewable, not silent | Single-writer queue + backpressure ([ADR-0006](../../06-adrs/ADR-0006-tauri-trust-boundary-and-typed-ipc.md)); append-only attribution ([audit-and-logging.md](./audit-and-logging.md)) |
| Script reads a key-store secret via an IPC command                          | Information disclosure        | Token/key theft, impersonation           | Nothing — the renderer never receives a raw secret                     | Host-only key-store access ([secrets-and-keys.md](./secrets-and-keys.md))                                                                                                               |
| Script fakes an unattributable mutation                                     | Repudiation                   | Untraceable change                       | Every write is a recorded, correlated operation                        | Append-only op log + correlation IDs ([audit-and-logging.md](./audit-and-logging.md))                                                                                                   |
| Script invokes a third-party plugin or shell through a result               | Elevation of privilege        | Code execution with host privilege       | Nothing — a result is data, not a capability                           | Result carries no capability ([capabilities-and-csp.md](../../05-modules/host/capabilities-and-csp.md))                                                                                 |

The pattern across the table: the compromise's blast radius collapses to "whatever the window's product commands already
permit", because every escalation path the attacker would reach for — disk, network, secrets, undeclared commands,
plugins — requires a host capability the renderer does not hold.

## The residual risk named

The boundary does not make a renderer compromise harmless. Within the active window's command set the attacker acts with
the user's authority: it can author operations the user could author, read what the user could read, and request a
(redacted) export the user could request. Two consequences follow and are accepted deliberately:

- **A compromise in the `main` window can author and read twin content** for the open workspace, because that window
  declares those commands. The bound is that it cannot reach _another_ workspace, the filesystem, the network, or any
  secret — and every write it makes is attributable and reversible through the append-only history
  ([op-fact-schema-model.md](../../05-modules/mneme/op-fact-schema-model.md), `TombstoneEntity` is supersession, not
  erasure).
- **Per-window scoping is the lever that shrinks this.** A narrow window — a reporting window that declares only
  read-snapshot and request-export ([capability-scoping.md](./capability-scoping.md)) — gives a compromise in _that_
  window no write path at all. The narrower the window's manifest, the smaller the blast radius; this is why adding a
  capability is a reviewed threat-model change
  ([capabilities-and-csp.md](../../05-modules/host/capabilities-and-csp.md)).

The trade-off is explicit: the product accepts that a compromised renderer can do the user's job, in exchange for a
single boundary at which that job is the _entire_ reachable surface, with no second path to disk, network, or secrets to
audit.

## Worked example

An attacker lands a cross-site-scripting payload in a free-text `notes` slot that the `main` window renders
([core-v1.json](../../data/meta/core-v1.json)). The CSP that should have stopped the markup is assumed bypassed. The
payload tries, in order: to read `model/ops` (fails — no filesystem path reaches the renderer); to `fetch` an attacker
URL (fails — strict CSP forbids the remote origin and there is no socket); to `invoke('export_package')` and ship the
`confidential` `DataEntity` it can see on screen (the command runs, but the host applies deny-by-default redaction and a
filter that excludes the unauthorised entity, so the package leaves with neither the entity nor the `owner` name —
[pii-and-export-redaction.md](./pii-and-export-redaction.md)); and to append a malicious `SetProperty` operation (the
write lands, backpressured and **attributable** in the op log, and is reversible by a later superseding operation). The
compromise reached exactly the `main` window's product commands and nothing beyond them; the op log names the mutation
for incident response.

## References & standards

_Normative:_

- Microsoft — **STRIDE** threat modelling. _([ADR-0023](../../06-adrs/ADR-0023-threat-model-stride-asvs.md))_
- **OWASP ASVS 5.0** — V1 Architecture, V8 Authorization. _(the controls that bound each scenario —
  [controls-asvs.md](./controls-asvs.md))_

_Informative:_

- **OWASP Top 10** — A03 Injection (XSS), A06 Vulnerable and Outdated Components. _(the two compromise routes assumed
  here)_

Recorded in the [standards register](../STANDARDS-REGISTER.md).

## Related documents

| Document                                                                          | What it covers                                           |
| --------------------------------------------------------------------------------- | -------------------------------------------------------- |
| [threat-model.md](./threat-model.md)                                              | The STRIDE frame and the compromised-renderer adversary. |
| [trust-boundary.md](./trust-boundary.md)                                          | What the renderer is and is not trusted to do.           |
| [capability-scoping.md](./capability-scoping.md)                                  | Per-window deny-by-default that bounds the command set.  |
| [Capabilities and CSP](../../05-modules/host/capabilities-and-csp.md)             | The host mechanisms that enforce the boundary.           |
| [Process and trust boundary](../../05-modules/host/process-and-trust-boundary.md) | The process model and hard invariants.                   |
