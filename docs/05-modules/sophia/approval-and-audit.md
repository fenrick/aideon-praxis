# Approval and audit

What Sophia may suggest, what it may never do on its own, how a human approves a suggestion, and how prompts, responses, and tool-calls are audited. For practitioners who must be able to answer "what did the AI do, on whose authority, and can I prove it later?"

> **PLANNED.** No `aideon_sophia` crate exists; this is design intent per [ADR-0014](../../06-adrs/ADR-0014-ai-assistance-and-generated-provenance-sophia.md). This document resolves, as design intent, the approval and audit facets that [ADR-0014](../../06-adrs/ADR-0014-ai-assistance-and-generated-provenance-sophia.md) leaves open under the AI RMF.

## What Sophia may suggest, and what it may never do

Sophia's authority is bounded by one invariant: **all output is Generated, and Sophia writes no fact** ([guardrails and provenance](./guardrails-and-provenance.md), [ADR-0014](../../06-adrs/ADR-0014-ai-assistance-and-generated-provenance-sophia.md)). That divides every action cleanly:

| Sophia may suggest (Generated)                                    | Sophia may never do autonomously                                              |
| ----------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| Draft a description for an entity or relationship.                | Write an Asserted fact (only human acceptance does, via the canonical path).  |
| Propose a relationship between entities (e.g. a `realises` link). | Promote its own suggestion to Asserted, even at High confidence.              |
| Suggest a slot value or classification.                           | Mutate a Generated item in place to look Asserted.                            |
| Enrich a sparse entity from retrieved grounding.                  | Open an egress, call a model the host did not configure, or hold credentials. |

The line is not "low-risk versus high-risk suggestions"; it is that **no suggestion is a fact until a human accepts it**, regardless of confidence. There is no auto-acceptance ([guardrails and provenance](./guardrails-and-provenance.md)). High confidence is a prompt to review, never a licence to assert ([ADR-0021](../../06-adrs/ADR-0021-confidence-and-trust-scale.md)).

## The human approval workflow

Promotion from suggestion to fact is always an explicit human act, and in a governed deployment that act may itself route through approval. A Sophia suggestion appears `Awaiting review` ([Documentation Standard §9](../../02-standards/DOCUMENTATION-STANDARD.md)), and acceptance flows through the same governance path as any other pending change:

- **Acceptance writes a new Asserted operation through the normal canonical path**, attributed to the accepting human, with the original Generated suggestion retained as provenance; rejection writes nothing ([guardrails and provenance](./guardrails-and-provenance.md)).
- **Where policy requires sign-off, acceptance routes through [Themis](../themis/approvals-and-workflow.md) approvals.** Themis decides whether the action is `Permit`, `Deny`, or `RequireApproval` ([Themis capability policy](../themis/capability-policy.md)); a Sophia suggestion that touches governed content waits in an approver's queue until the approval workflow completes ([ADR-0030](../../06-adrs/ADR-0030-governance-themis.md)).
- **Sophia suggestions are one of the queues a steward works.** The Steward participation mode reviews pending changes — imports from [Pylon](../pylon/README.md), generated suggestions from Sophia, conflict resolutions from [Koinon](../koinon/README.md) — and the approval workflow decides which need sign-off before they become Asserted ([Themis approvals and workflow](../themis/approvals-and-workflow.md)).

The single-user desktop is the degenerate case: Themis returns `Permit` (one principal, full authority), and acceptance is a one-click promotion that still writes an attributed operation. The governed multi-approver case and the single-user case use the **same canonical write and the same `Awaiting review` state**, so the audit story is identical in both.

## The audit trail: prompts, responses, and tool-calls

Sophia's actions are auditable through the product's single audit discipline, not a parallel AI log. Audit derives from the append-only op log plus observability; it is a view over canonical material, never a second source of truth ([audit-and-logging.md](../../02-standards/security/audit-and-logging.md), [ADR-0030](../../06-adrs/ADR-0030-governance-themis.md)).

This gives two complementary records:

- **The acceptance is auditable as an operation.** When a human accepts a suggestion, the resulting Asserted operation is attributable through the op log like any other mutation ([ADR-0001](../../06-adrs/ADR-0001-workspace-is-canonical-authority.md)); the Generated suggestion retained as its provenance carries the lineage from prompt to fact ([guardrails and provenance](./guardrails-and-provenance.md)). "Who accepted what the AI suggested" is answerable from canonical material.
- **The generation is auditable through structured logging.** A Sophia generation is a host-side workflow, so it carries a `correlation_id` and trace context that tie the renderer request → host command → model call → response, reconstructable end to end ([audit-and-logging.md](../../02-standards/security/audit-and-logging.md), [ADR-0019](../../06-adrs/ADR-0019-observability-and-trace-context.md)). The audit record of a generation includes the prompt composed, the model invoked (by its model-card reference, [model cards](./model-cards.md)), the grounding used, and the response — and, where a multi-step assistant makes tool-calls, each tool-call as a child span of the generation.

Two constraints bind that logging without exception:

- **No secret and no PII in a log or telemetry record.** Sophia's audit lines route through the same redaction discipline as exports ([audit-and-logging.md](../../02-standards/security/audit-and-logging.md), [pii-and-export-redaction.md](../../02-standards/security/pii-and-export-redaction.md)). A prompt grounded on a `pii: true` slot is redacted before it is logged, so the audit trail records that a generation happened and on what shape of grounding, without becoming a second copy of personal data.
- **Telemetry is local by default.** Sophia's generation telemetry joins the local NDJSON log; it is not shipped over the network by default ([audit-and-logging.md](../../02-standards/security/audit-and-logging.md), [ADR-0006](../../06-adrs/ADR-0006-tauri-trust-boundary-and-typed-ipc.md)).

## Leak-prevention: the prompt can carry no more than the requester could see

The strongest leak-prevention property is structural, not a filter bolted on afterwards: **the prompt is composed only from grounding the requester's viewpoint already resolves** ([data access and scope](./data-access-and-scope.md)). Because Lexis retrieval inherits the requester's as-of time, layer, scenario, and scope ([grounding and retrieval](./grounding-and-retrieval.md)), the model is never handed a wider slice of the twin than the human who asked. A suggestion cannot exfiltrate data the requester could not already read, because the model was never given that data.

This closes the prompt-injection-driven exfiltration path that output filtering alone cannot ([guardrails and provenance](./guardrails-and-provenance.md), prompt-injection section): even if retrieved content tried to coax the model into revealing more, there is no "more" in the prompt to reveal. For a hosted model, the same viewpoint-scoped grounding is additionally PII-redacted before it crosses the egress boundary ([data access and scope](./data-access-and-scope.md)), so the prompt that leaves the device is bounded twice — by viewpoint and by redaction.

## Worked example

In a hosted deployment, an architect asks Sophia to suggest a `disposition` for the seed `Application` `n:application:automation-orchestrator`. Sophia returns a Generated suggestion of `disposition = Retire` at Medium confidence, `Awaiting review`, with a model card.

1. **Generation is audited.** The host logs the generation under one `correlation_id`: the composed prompt (PII-redacted before logging), the model invoked by its card reference, the viewpoint-scoped grounding, and the response. Nothing personal and no credential appears in the line.
2. **Approval routes through Themis.** Retiring an application with downstream dependencies is governed, so Themis returns `RequireApproval`; the suggestion waits in a control owner's queue under the Steward mode ([Themis approvals and workflow](../themis/approvals-and-workflow.md)).
3. **Acceptance writes an attributed operation.** The control owner accepts; a new Asserted operation sets `disposition = Retire`, attributed to the approver, with the Sophia suggestion retained as provenance. The op log now answers "who decided to retire this, on what AI suggestion, and when" from canonical material.
4. **No leak was possible.** The grounding came only from what the architect's viewpoint resolved, so the suggestion could not have surfaced an entity from an unselected scenario or a layer the architect was not viewing.

Had the architect instead rejected the suggestion, the twin would be unchanged and only the generation's audit line would remain — proof that the AI suggested, and a human declined.

## References & standards

_Normative:_

- **OWASP ASVS 5.0** — V8 Authorization (the approval posture), V7 Error/Logging (the audit posture). _([audit-and-logging.md](../../02-standards/security/audit-and-logging.md), [Themis capability policy](../themis/capability-policy.md))_

_Informative:_

- **NIST AI Risk Management Framework** (AI RMF 1.0). The governance posture for accountability over generated content.
- **OpenTelemetry**; W3C **Trace Context**. The correlation model a generation's audit record uses ([ADR-0019](../../06-adrs/ADR-0019-observability-and-trace-context.md)).

Recorded in the [standards register](../../02-standards/STANDARDS-REGISTER.md).

## Related documents

| Document                                                                            | What it covers                                                 |
| ----------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| [Sophia README](./README.md)                                                        | The module index and invariants.                               |
| [Guardrails and provenance](./guardrails-and-provenance.md)                         | The Generated-until-accepted invariant approval rests on.      |
| [Data access and scope](./data-access-and-scope.md)                                 | The viewpoint bound that makes leak-prevention structural.     |
| [Themis approvals and workflow](../themis/approvals-and-workflow.md)                | The approval workflow a governed acceptance routes through.    |
| [audit-and-logging.md](../../02-standards/security/audit-and-logging.md)            | The single audit discipline a generation is recorded under.    |
| [ADR-0014](../../06-adrs/ADR-0014-ai-assistance-and-generated-provenance-sophia.md) | The decision that fixes acceptance as the only path to a fact. |
