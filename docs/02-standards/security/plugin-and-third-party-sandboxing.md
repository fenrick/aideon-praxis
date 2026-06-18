# Plugin and Third-Party Sandboxing

How third-party plugins and connectors are sandboxed: the capability surface a plugin is granted, what it can never reach, and why the sandbox is the absence of capability rather than a policy a plugin author opts into. The product has no third-party plugin API today, so most of this is **design intent, not built** — it states the boundary a plugin will sit behind when one is introduced, modelled on the artefact-execution sandbox that already holds ([process-and-trust-boundary.md](../../05-modules/host/process-and-trust-boundary.md)).

The planned interchange module **Pylon** (connectors and file import/export) and AI module **Sophia** (LLM-assisted authoring) are the first surfaces that bring third-party code or third-party services close to the twin ([DOCUMENTATION-STANDARD.md §10](../DOCUMENTATION-STANDARD.md), module taxonomy). A reader needs to know, before either lands, what such an extension may touch and what the boundary forbids by construction.

## The model: sandbox by absence of capability

The product already sandboxes executing artefacts without a per-artefact policy: an artefact reaches only what an engine read may reach, because the engine layer holds no filesystem, network, or host-crate access, and a result is **data, not a capability** ([process-and-trust-boundary.md](../../05-modules/host/process-and-trust-boundary.md), [capabilities-and-csp.md](../../05-modules/host/capabilities-and-csp.md), [ADR-0033](../../06-adrs/ADR-0033-artefact-execution-model.md)). Third-party extensions adopt the same discipline:

- **The sandbox is the absence of capability, enforced by construction.** An extension is granted a narrow, named capability surface and inherits no host capability. There is no extension-author knob that widens the set of things it can reach ([capabilities-and-csp.md](../../05-modules/host/capabilities-and-csp.md)).
- **All side effects stay in the host.** Filesystem, network, and OS access are the host's alone ([trust-boundary.md](./trust-boundary.md)); an extension that needs to read a file or call a remote service asks the host through a mediated, capability-gated command, and the host decides whether and how to perform it.
- **Untrusted input is deny-by-default.** Whatever an extension produces — imported content, a generated suggestion — is treated as hostile until validated against the metamodel and surfaced as `Awaiting review` rather than executed ([trust-boundary.md](./trust-boundary.md), [ADR-0023](../../06-adrs/ADR-0023-threat-model-stride-asvs.md)). An extension is a source of untrusted input, like an import file or the renderer.

## The capability surface a plugin is granted (design intent)

When a third-party extension API lands, the surface it is granted is narrow and explicit, mediated by the host:

| Capability                        | Granted as                                                    | Bound                                                                                                                       |
| --------------------------------- | ------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| **Read the twin at a viewpoint**  | A host-mediated read, the same path an artefact uses          | Only the resolved facts/relationships the viewpoint exposes; never the raw op log or runtime database.                      |
| **Propose operations**            | Compiled to reviewable operations, deny-by-default            | Never a silent write — proposals are `Awaiting review` until accepted, then written through the canonical path.             |
| **Reference a blob by hash**      | A `sha256` reference in a result                              | The bytes are fetched, if needed, through a separate capability-gated command — never inlined by the extension.             |
| **Outbound network (connectors)** | A host-brokered request to an explicitly allowlisted endpoint | Only the host opens the socket; the extension names a target the host's allowlist permits, or the call is denied.           |
| **Use a secret (connectors)**     | The host injects the credential at the point of use           | The extension never receives the raw secret; it remains in the OS key store ([secrets-and-keys.md](./secrets-and-keys.md)). |

The default answer to any capability not in this list is no, consistent with the deny-by-default posture across the boundary ([capability-scoping.md](./capability-scoping.md)). Adding a capability to the surface is a reviewed threat-model change, scored on the governance reversibility rubric, exactly as a new IPC command is ([capabilities-and-csp.md](../../05-modules/host/capabilities-and-csp.md)).

## What a plugin can never reach

These hold by construction, mirroring the artefact-execution boundary ([process-and-trust-boundary.md](../../05-modules/host/process-and-trust-boundary.md)):

- **The filesystem directly.** Path resolution is the host's alone ([capabilities-and-csp.md](../../05-modules/host/capabilities-and-csp.md)); an extension cannot name a file to read or write, nor reach the op log, the blob store, or the runtime database.
- **Arbitrary network.** No engine or extension opens a socket of its own; outbound calls are host-brokered to an allowlist ([trust-boundary.md](./trust-boundary.md), [audit-and-logging.md](./audit-and-logging.md) "local by default"). There is no open TCP port in desktop mode an extension could bind ([process-and-trust-boundary.md](../../05-modules/host/process-and-trust-boundary.md)).
- **A raw secret.** Credentials stay in the OS key store and are injected by the host at the point of use ([secrets-and-keys.md](./secrets-and-keys.md)); a connector authenticates without ever holding the token in plaintext outside the host's control.
- **The renderer or arbitrary IPC commands.** An extension is not granted the product capabilities the renderer holds; it cannot invoke a command or call back across the seam ([capabilities-and-csp.md](../../05-modules/host/capabilities-and-csp.md)).
- **A silent write to the twin.** A proposed operation is reviewable, never executed unattributed ([ADR-0023](../../06-adrs/ADR-0023-threat-model-stride-asvs.md)); acceptance writes it through the canonical, attributable op log ([audit-and-logging.md](./audit-and-logging.md)).
- **Another extension's capabilities or another workspace.** Each extension's surface is scoped to its own mediated commands and the open workspace; there is no shared ambient authority.

## Pylon connectors and Sophia models (design intent)

The two planned surfaces fit the model as follows:

- **Pylon connectors** ingest from external systems (CMDB, EA tools, files). A connector is a source of untrusted input: its output is validated against the metamodel and lands as reviewable operations, never trusted because the connector ran ([trust-boundary.md](./trust-boundary.md), [ADR-0023](../../06-adrs/ADR-0023-threat-model-stride-asvs.md)). Its outbound network access is host-brokered to an allowlisted endpoint with a host-injected credential; the connector itself opens no socket and holds no raw secret.
- **Sophia models** produce **Generated** content ([CONTEXT.md](../../../CONTEXT.md), [ADR-0014](../../06-adrs/ADR-0014-ai-assistance-and-generated-provenance-sophia.md)). A model — local or a remote service behind a host-brokered, allowlisted call — receives only the viewpoint-scoped context the host chooses to send (itself PII-redacted, [pii-and-export-redaction.md](./pii-and-export-redaction.md)), and its output is a suggestion until acceptance writes a new Asserted operation. It is never silently promoted ([trust-boundary.md](./trust-boundary.md)). The product does not call external LLM or telemetry endpoints except behind the host with an explicit allowlist.

Both reduce to the same invariant: a third party may _propose_ and may _read what the host shows it_, but every side effect — disk, network, secret, write — is the host's, performed deny-by-default.

## Worked example (design intent)

A Pylon CMDB connector (design intent) refreshes the `actual` layer for the seed `TechnologyComponent` entities ([core-v1.json](../../data/meta/core-v1.json)). The connector asks the host to call its CMDB endpoint; the host checks the endpoint against the allowlist, injects the API token from the OS key store ([secrets-and-keys.md](./secrets-and-keys.md)) — the connector never sees it — and returns the response. The connector maps the response to proposed `SetProperty` operations on `TechnologyComponent` slots. None is written: each is validated against the metamodel and surfaced as `Awaiting review` ([ADR-0023](../../06-adrs/ADR-0023-threat-model-stride-asvs.md)); a steward accepts them, and acceptance writes attributable operations through the canonical op log ([op-fact-schema-model.md](../../05-modules/mneme/op-fact-schema-model.md)). The connector reached the network only through the host's broker, never held the secret, and wrote nothing directly.

## References & standards

_Normative:_

- **OWASP ASVS 5.0** — V1 Architecture, V8 Authorization. _(deny-by-default capability surface — [controls-asvs.md](./controls-asvs.md))_
- Microsoft — **STRIDE**. _(Elevation-of-privilege framing for third-party code — [ADR-0023](../../06-adrs/ADR-0023-threat-model-stride-asvs.md))_

_Informative:_

- Saltzer & Schroeder — **The Protection of Information in Computer Systems**, 1975. _(least privilege; the principle the sandbox-by-absence model applies)_

Recorded in the [standards register](../STANDARDS-REGISTER.md).

## Related documents

| Document                                                                          | What it covers                                            |
| --------------------------------------------------------------------------------- | --------------------------------------------------------- |
| [Process and trust boundary](../../05-modules/host/process-and-trust-boundary.md) | The artefact-execution sandbox this model extends.        |
| [Capabilities and CSP](../../05-modules/host/capabilities-and-csp.md)             | The host capability mechanism extensions sit behind.      |
| [capability-scoping.md](./capability-scoping.md)                                  | Deny-by-default scoping and the policy/enforcement split. |
| [trust-boundary.md](./trust-boundary.md)                                          | Why all side effects stay in the host.                    |
| [secrets-and-keys.md](./secrets-and-keys.md)                                      | Where connector credentials live and how they are used.   |
