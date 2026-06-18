# Model management

Which models are permitted, how one is selected, and how it is configured behind the host — vendor-neutral and policy-shaped. For practitioners deciding how to run Sophia in a given deployment without coupling the design to any one model.

> **PLANNED.** No `aideon_sophia` crate exists; this is design intent per [ADR-0014](../../06-adrs/ADR-0014-ai-assistance-and-generated-provenance-sophia.md). This document resolves, as design intent, the model-management facet of ADR-0014's open questions; the model itself is explicitly provisional and replaceable.

## The model is provisional; the policy around it is not

The governing decision fixes that the model is replaceable and the guardrails around it are not ([ADR-0014](../../06-adrs/ADR-0014-ai-assistance-and-generated-provenance-sophia.md)). Model management is therefore written as a **policy over an adapter**, never as a choice of vendor. This document names no model and no provider; it states which properties a permitted model must satisfy and how the host selects and configures one. A deployment that swaps the model changes a configured adapter, not the design.

The single load-bearing rule: **a model is reached only through the host capability, behind a typed adapter** ([guardrails and provenance](./guardrails-and-provenance.md), [ADR-0006](../../06-adrs/ADR-0006-tauri-trust-boundary-and-typed-ipc.md)). There is no second path to a model — not from the renderer, not from another engine.

## What makes a model permitted

A model is permitted in a deployment only when it satisfies the obligations the rest of Sophia's design assumes. These are properties of how a model is integrated, not of any vendor:

- **It is disclosed by a model card** ([model cards](./model-cards.md)) — intended use, limitations, and known failure modes — so every output it produces can carry that disclosure. A model with no card cannot satisfy the per-output disclosure obligation and is not permitted.
- **It is reachable behind the typed adapter** — a local runtime on the device, or a hosted endpoint on the host's egress allowlist ([data access and scope](./data-access-and-scope.md)). A model reachable only by a path that bypasses the host capability is not permitted, because it would puncture the trust boundary.
- **Its egress posture is known and recorded** — local (nothing leaves the device) or a named, allowlisted hosted endpoint whose residency the deployment accepts ([data access and scope](./data-access-and-scope.md)).
- **It produces Generated output and asserts nothing** — the model's role is bounded to drafting and enrichment; promotion to Asserted is always the separate human acceptance step ([guardrails and provenance](./guardrails-and-provenance.md)). No model is permitted to write a fact.

The exact configuration schema — where the permitted-model list and per-model parameters live in workspace or app configuration — is design intent and follows the desktop config conventions (platform app-data directories via Tauri-provided paths), not a repo-relative file.

## Selecting a model: local first, hosted by deliberate configuration

Selection follows the offline-first default ([ADR-0006](../../06-adrs/ADR-0006-tauri-trust-boundary-and-typed-ipc.md)):

- **The default is a local model.** Sophia runs against a model on the device, so the egress boundary is closed and no data leaves ([data access and scope](./data-access-and-scope.md)). The cost is stated plainly: local-model quality is bounded ([ADR-0014](../../06-adrs/ADR-0014-ai-assistance-and-generated-provenance-sophia.md)).
- **A hosted model is a deliberate, configured variant**, not a fallback the system reaches for silently. Choosing a hosted model is choosing to open an egress to an allowlisted endpoint and to accept its residency ([data access and scope](./data-access-and-scope.md)); the choice is recorded, and the redaction posture applies to everything that leaves.

The trade-off named: the local default trades suggestion quality for a closed egress boundary and a simple residency story; a hosted model trades that closed boundary for higher quality. The design refuses to make the high-quality, open-egress option the default, because the offline posture is the property a user can reason about without a network-trust assumption.

The host never silently escalates from local to hosted. If the configured model is local and unavailable, Sophia degrades to the offline behaviour below; it does not reach for a hosted model to fill the gap, because that would turn an availability event into an unintended egress.

## Configured behind the host allowlist — no renderer-side model calls

Both model location and credentials live with the host, never the renderer:

- **The renderer never calls a model and never holds model credentials** ([guardrails and provenance](./guardrails-and-provenance.md)). It issues a typed Sophia command; the host resolves the configured model, composes the grounded prompt, and calls the adapter.
- **A hosted endpoint is on the host's outbound allowlist.** Desktop mode forbids renderer HTTP and open local ports ([security-constraints.md](../../01-architecture/boundary/security-constraints.md)); a hosted-model call is a host-originated request to an allowlisted endpoint, governed by the host capability and the security posture, not a connection the renderer can open.
- **Credentials follow the host's secret handling** — held by the host, never logged, never crossing the IPC seam to the renderer ([secrets-and-keys.md](../../02-standards/security/secrets-and-keys.md), [audit-and-logging.md](../../02-standards/security/audit-and-logging.md)).

## Offline behaviour when no model is available

Because the default is offline and the host never silently escalates, "no model available" is a first-class, honest state, not an error to paper over. When no permitted model can be reached — no local model installed, or a configured hosted endpoint unreachable — Sophia:

- **withholds generation rather than inventing a degraded substitute** — there is no "best-effort" model swap;
- **surfaces the unavailability explicitly**, so the absence of a suggestion is visible as an unavailable assistant, not silence that reads as "nothing to suggest";
- **leaves the twin entirely unchanged** — with no generation there is nothing to accept, so the Generated-until-accepted invariant is trivially upheld ([guardrails and provenance](./guardrails-and-provenance.md)).

This mirrors the product's general honesty obligation: an unavailable capability says so ([Documentation Standard §9](../../02-standards/DOCUMENTATION-STANDARD.md)), rather than producing output whose provenance it cannot stand behind.

## Worked example

A deployment configures the local-model default and leaves Sophia offline. A steward asks for a description of the seed `Capability` `n:capability:automation-fabric`; the local model produces a Generated suggestion grounded in retrieved context, with a model card and a Medium confidence band ([model cards](./model-cards.md)). Nothing leaves the device.

A second deployment configures a hosted model by adding its endpoint to the host allowlist and accepting its residency. The same request now sends a PII-redacted prompt to that endpoint ([data access and scope](./data-access-and-scope.md)); the response is Generated, carries the hosted model's card, and is `Awaiting review`. Credentials for the endpoint never reach the renderer.

In a third case the local model is not installed and no hosted model is configured. Sophia returns no suggestion and surfaces "assistant unavailable"; the steward sees an explicit unavailable state, the twin is untouched, and there is nothing to accept.

## References & standards

_Normative:_

- Mitchell et al. — **Model Cards for Model Reporting**, 2019. The disclosure a permitted model must carry ([model cards](./model-cards.md)).

_Informative:_

- **NIST AI Risk Management Framework** (AI RMF 1.0). The governance posture for selecting and operating a generative model.

Recorded in the [standards register](../../02-standards/STANDARDS-REGISTER.md).

## Related documents

| Document                                                                            | What it covers                                                        |
| ----------------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| [Sophia README](./README.md)                                                        | The module index and invariants.                                      |
| [Guardrails and provenance](./guardrails-and-provenance.md)                         | Why the model sits behind a host capability and asserts nothing.      |
| [Data access and scope](./data-access-and-scope.md)                                 | The egress boundary local vs hosted selection determines.             |
| [Model cards](./model-cards.md)                                                     | The per-output disclosure a permitted model must satisfy.             |
| [security-constraints.md](../../01-architecture/boundary/security-constraints.md)   | The desktop egress baseline a hosted model works within.              |
| [ADR-0014](../../06-adrs/ADR-0014-ai-assistance-and-generated-provenance-sophia.md) | The decision that fixes the model as provisional and offline-default. |
