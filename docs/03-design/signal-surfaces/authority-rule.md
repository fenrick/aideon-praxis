# The authority rule

The single principle every signal surface obeys: a signal is a prompt for judgement, not a replacement for it. This page states the rule, its four prohibitions, and the one permission it grants. Anyone designing a surface that flags, ranks, recommends, or creates work reads this first.

---

## The principle

The human is the authority over the model. A signal exists to help a person decide; it must never decide on their behalf. This is the surface-level expression of the model-is-authority rule that governs all intelligence and automation in the product ([artefacts/intelligence-and-automation.md](../artefacts/intelligence-and-automation.md)).

A signal **may** flag a condition, rank a set, recommend an action, or create a review task. A signal **must not**:

- **Commit business truth.** Acting on a signal writes an Asserted operation, and that write is a human's accepted action — never the signal's. A signal is Inferred or Generated content (§9, content classification); it is never silently promoted to Asserted.
- **Silently mutate an artefact.** A signal must not edit, re-rank, or rewrite an artefact result behind the user's back. Any change to the model flows through an explicit, attributable operation.
- **Resolve itself.** A signal does not mark itself accepted, dismissed, or done. Completion of the work a signal creates requires a human action ([signal-families.md](./signal-families.md), Review tasks).
- **Disguise itself as settled truth.** A signal must be visually distinct from Asserted content. The differentiation is part of the rule, not decoration ([integration-with-artefacts.md](./integration-with-artefacts.md)).

The one permission: a signal **may** drive accepted work into the model — but only after explicit human acceptance, and the resulting operation is attributed to the person, with the originating signal recorded as provenance.

## Why the rule holds

The product's value is a twin a user can trust as a controlled record. A signal that could commit truth, or resolve itself, would make the model's contents depend on an analytic or generative process the user did not choose to accept. That erodes the Asserted layer the whole twin rests on. The cost of the rule is that the system cannot "just fix" a problem it detects: every correction needs a human in the loop. That cost is deliberate — it keeps authority with the person.

## Worked example

Metis ranks applications by dependency concentration and flags `Insight Hub` (`n:application:insight-hub`, disposition Invest) as the highest-concentration node because three relationships (`realises`, `accesses`, `hosts`) converge on it. The signal **may** present the ranking and recommend a review. It **must not** change `Insight Hub`'s disposition, re-weight its `realises` relationship to `Customer Insight` (`e:insight-realises-insight`, criticality High), or close itself once shown. If the architect accepts the recommendation and lowers the criticality, that is an Asserted operation attributed to the architect, with the Metis signal cited as the prompt.

## References & standards

_Informative:_

- Nielsen — **10 Usability Heuristics**, 1994 (user control and freedom; the system never traps the user in an automatic outcome). Recorded in the [standards register](../../02-standards/STANDARDS-REGISTER.md).

## Related documents

| Document                                                                                | What it covers                                                                  |
| --------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| [artefacts/intelligence-and-automation.md](../artefacts/intelligence-and-automation.md) | The model-is-authority rule across all intelligence and automation.             |
| [required-elements.md](./required-elements.md)                                          | The six elements a signal must surface to be a first-class surface.             |
| [suppression-and-lifecycle.md](./suppression-and-lifecycle.md)                          | How a signal is reviewed, accepted, suppressed, or rerun — never self-resolved. |
| [trust-and-honesty.md](../trust-and-honesty.md)                                         | The honesty obligations this rule serves.                                       |
| [DOCUMENTATION-STANDARD.md](../../02-standards/DOCUMENTATION-STANDARD.md)               | Content classification (§9): Asserted / Inferred / Generated.                   |
