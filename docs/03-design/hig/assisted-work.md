# HIG: Assisted Work

How Aideon presents assistant entry, assisted responses, guided authoring, mapping suggestions, and review-before-commit. Assistance is useful only when it helps the user reach the right work faster without becoming a second authority. Apply this page when designing or reviewing natural-language entry, assistant panels, generated summaries, mapping suggestions, guided authoring, or comparison narratives.

It does not cover background ML signals ([signal-surfaces/README.md](../signal-surfaces/README.md)), ordinary search ([Lexis](../../05-modules/lexis/README.md)), or raw model execution — it is about user-facing assisted interaction.

---

## The principle

The assistant is a tool inside the workspace, not a substitute for it. It may help the user find the right artefact, summarise a dense selection, suggest a mapping, propose a draft, or explain a scenario difference in plain language. It **must not** quietly redefine truth, commit business changes without review, or speak with more authority than the underlying evidence deserves. Good assisted work feels like the product helping a competent user move faster; bad assisted work feels like a second interface trying to replace the product's structure.

## The Sophia guardrails

All assistance is produced by [Sophia](../../05-modules/sophia/README.md) (planned) — LLM-assisted authoring and enrichment behind centralised guardrails — and everything it produces is **Generated** content until accepted ([DOCUMENTATION-STANDARD.md §10](../../02-standards/DOCUMENTATION-STANDARD.md)). The guardrails are not optional UI dressing; they are the contract the interface presents:

- **Grounded, not free.** Output is grounded in twin content rather than freely generated ([Lewis et al., Retrieval-Augmented Generation, 2020](../../02-standards/STANDARDS-REGISTER.md)); a response that could not be grounded says so plainly rather than masquerading as grounded guidance.
- **Disclosed.** Generated output carries the Generated treatment ([design-system/honest-state-treatments.md](../design-system/honest-state-treatments.md)) and, where relevant, model-card-style disclosure of intended use and limitations ([Mitchell et al., Model Cards, 2019](../../02-standards/STANDARDS-REGISTER.md)).
- **Suggestion until accepted.** Acceptance writes a new Asserted operation; the assistant prepares work, it does not sneak it into the model ([CONTEXT.md](../../../CONTEXT.md)).

## Entry and framing

Assistant entry begins from a real product context where possible: current workspace, current selection, current viewpoint (time, scenario, layer), current artefact or task. If the assistant is answering in a vacuum, the response says so — context-free help is sometimes useful but **must not** masquerade as grounded product guidance.

## Assisted responses

An assisted response makes three things clear: what context it used, what sort of output it is returning, and what the user can do next. The output may be a destination, a summary, a draft, a mapping suggestion, or a comparison note — different things that **should** look different. A search-like answer does not pretend to be a decision; a draft does not pretend to be settled truth ([provenance-and-generated-work.md](./provenance-and-generated-work.md)).

## Guided authoring

When the assistant helps author, it reduces blank-page cost rather than inventing a parallel authoring model: proposing artefacts, section structures, survey questions, description drafts, or likely next steps. The user can review, edit, reject, and continue manually without falling out of the normal task flow, and authoring still flows through the Change Event model ([interaction-model.md](./interaction-model.md)).

## Mapping and review before commit

Mapping suggestions behave like review candidates, not silent auto-corrections: the user sees the proposed match, why it was proposed, what confidence or caveat applies ([DOCUMENTATION-STANDARD.md §8.2](../../02-standards/DOCUMENTATION-STANDARD.md)), and what accepting it will change. Anything that could change truth, promote a scenario, create a durable relationship, or alter an export scope stays reviewable before commit.

## Accessibility

Assistant entry, responses, alternative actions, and review controls are keyboard-usable and screen-reader legible. A user can tell whether a response is a summary, suggestion, draft, or action target without relying on colour or layout inference alone ([design-system/accessibility.md](../design-system/accessibility.md)).

## Content rules

Assisted copy says what it did in plain language and names uncertainty, incomplete scope, and review status directly. Avoid confidence theatre, chatty filler, and vague "helpful" language that hides whether the system actually grounded the answer.

## Worked example

From a selection of three applications, the user asks the assistant to suggest a missing `serves` relationship. The response is framed as a _mapping suggestion_: it names the selection it used, shows the proposed relationship with a Medium confidence label and its caveat, and offers accept / edit / reject. Accepting authors a Change Event that writes the Asserted relationship ([CONTEXT.md](../../../CONTEXT.md)); until then the suggestion carries the Generated treatment and changes nothing in the twin.

## References & standards

_Normative:_

- Lewis et al. — **Retrieval-Augmented Generation**, 2020. Grounding output in twin content ([Sophia](../../05-modules/sophia/README.md)).
- Mitchell et al. — **Model Cards**, 2019. Disclosure for generated suggestions.

_Informative:_

- **NIST AI Risk Management Framework** (AI RMF 1.0). Guardrail posture.

## Related documents

| Document                                                               | What it covers                                   |
| ---------------------------------------------------------------------- | ------------------------------------------------ |
| [Sophia](../../05-modules/sophia/README.md)                            | The AI-assistance module and its guardrails.     |
| [provenance-and-generated-work.md](./provenance-and-generated-work.md) | Presenting Generated output honestly.            |
| [signal-surfaces/README.md](../signal-surfaces/README.md)              | Output as prompts for judgement.                 |
| [interaction-model.md](./interaction-model.md)                         | Review-before-commit and the Change Event model. |
