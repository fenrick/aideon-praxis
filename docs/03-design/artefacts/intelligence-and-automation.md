# Intelligence and Automation

The line between assistance, analysis, automation, and authority. This document draws that line: the model is the authority, intelligence is a tool, and automation creates work rather than silently changing truth. Several documents link to this exact path because the rule it states is load-bearing across the product.

## The governing rule

**The model remains the authority. The assistant and the analytical engine are tools. Intelligence assists; it does not take authority.**

This is not a hedging caveat — it is the structural basis on which users can trust the product. If automation silently rewrites accepted business truth, the product will appear smarter right up until the day people stop trusting it. Every mechanism below is constrained by this rule.

## LLM assistance — via Sophia

LLMs help users understand and work with the model. They do not become a second source of truth and they do not become a back door around review. Assistance is owned by **[Sophia](../../05-modules/sophia/README.md)** (planned, [ADR-0014](../../06-adrs/ADR-0014-ai-assistance-and-generated-provenance-sophia.md)), which runs LLM-assisted work behind centralised guardrails. Useful modes:

- **Natural-language entry** — lower the cost of reaching the right artefact, entity, or action.
- **Summarisation** — turn dense selections into readable briefings and handovers.
- **Mapping assistance** — fuzzy-match suggestions during import and review.
- **Guided authoring** — reduce blank-page friction for new artefacts and entities.
- **Comparison and narrative** — explain scenario differences in language as well as structure.

All Sophia output is **Generated** ([content-classification.md](./content-classification.md)) and grounded in twin content rather than free generation (Lewis et al., Retrieval-Augmented Generation, 2020). Each suggestion is disclosed per a model card (Mitchell et al., Model Cards, 2019).

| Guardrail                       | Behaviour                                                                        |
| ------------------------------- | -------------------------------------------------------------------------------- |
| Suggested writes are reviewable | No LLM action lands in the model without explicit acceptance.                    |
| Generated stays labelled        | The Generated label is not removed until a human accepts.                        |
| Classification preserved        | A generated suggestion is never conflated with accepted fact.                    |
| Context-grounded                | The assistant explains using model and artefact context, not free improvisation. |
| No authority bypass             | The assistant cannot approve its own suggestions.                                |

## ML signals — via Metis

ML has a different job from the LLM assistant: it finds patterns at scale and does not converse. ML computation is owned by **[Metis](../../05-modules/metis/README.md)** ([analytics/metis-analytics.md](../analytics/metis-analytics.md)). Useful outputs: anomaly detection in model quality, stale-data detection, clustering and duplication across applications/services/capabilities, risk scoring across portfolios, impact prediction, and trend analysis over temporal snapshots.

ML output arrives as **signals, rankings, warnings, and suggested review tasks** — Inferred or Generated content, never a silent rewrite of accepted truth. Signals are prompts for human judgement, not replacements for it, and they surface as reviewable items through [signal surfaces](../signal-surfaces/README.md) — not as ambient background cleverness that has already decided something.

## Automation — creates work, not silent edits

Automation keeps the model from going stale without manual upkeep. It operates under explicit rules and is owned by **[Continuum](../../05-modules/continuum/README.md)** (orchestration) with governance flows underpinned by **[Themis](../../05-modules/themis/README.md)** (planned).

Automation **may**:

- create freshness reminders and stewardship tasks;
- trigger review requests and approval flows;
- raise import exceptions and impact-triggered notifications;
- update accepted-work status on running operations.

Automation **may not**:

- silently rewrite accepted business facts;
- promote Generated content to Asserted without explicit human confirmation;
- execute consequential operations outside the visible [accepted-work](../ux/accepted-work-ux.md) path.

Imports, large comparisons, recalculations, scenario promotions, and export generation run as explicit accepted-work operations with visible status — not as vague spinners ([ACCEPTED-WORK-AND-EVENTS.md](../../04-contracts/ACCEPTED-WORK-AND-EVENTS.md)). That bright line — automation creates work, the human commits truth — is the same rule the [forces of change](../forces-of-change/entropy.md) rest on: detected entropy becomes a flagged opportunity or a steward task, never a silent fix.

## The trade-off

Refusing to let automation commit truth means the product will sometimes surface a signal the user already knows about, and will ask for an acceptance step that a more aggressive product would skip. That cost is accepted deliberately: the alternative — quiet, confident, occasionally wrong automatic edits — destroys the trust the whole product depends on.

## References & standards

_Normative:_

- Lewis et al. — **Retrieval-Augmented Generation**, 2020. Grounding LLM output in twin content. ([Sophia](../../05-modules/sophia/README.md), [ADR-0014](../../06-adrs/ADR-0014-ai-assistance-and-generated-provenance-sophia.md).)
- Mitchell et al. — **Model Cards for Model Reporting**, 2019. Disclosure for generated and ML output.

_Informative:_

- **NIST AI Risk Management Framework** (AI RMF 1.0). Guardrail and provenance posture.

Recorded in the [standards register](../../02-standards/STANDARDS-REGISTER.md).

## Related documents

| Document                                                        | What it covers                                 |
| --------------------------------------------------------------- | ---------------------------------------------- |
| [content-classification.md](./content-classification.md)        | Why Generated never becomes Asserted silently. |
| [signal-surfaces/README.md](../signal-surfaces/README.md)       | How ML signals surface as reviewable prompts.  |
| [analytics/metis-analytics.md](../analytics/metis-analytics.md) | The analytical engine behind ML signals.       |
| [Sophia (planned)](../../05-modules/sophia/README.md)           | The AI-assistance module.                      |
| [Continuum](../../05-modules/continuum/README.md)               | The orchestration behind automation.           |
