# Signal surfaces

How ML, system, and analytics outputs are presented as prompts for human judgement. This folder defines the required surface elements, the authority rule that bounds every signal, the suppression and lifecycle contract, how signals attach to artefacts and the inspector, and which module produces which signal. It is for anyone designing or rendering a surface that flags, ranks, recommends, or creates work from the twin.

A **signal** is a system-generated prompt for a decision: a warning, a ranking, a recommendation, or a review task. It is distinct from accepted-work status, validation errors, provenance notices, and assistant chat. Those surfaces interact with signals but never collapse into one undifferentiated alert layer.

---

## Contents

1. [The authority rule](./authority-rule.md) — a signal prompts judgement; it never commits truth, mutates artefacts, or resolves itself.
2. [Required surface elements](./required-elements.md) — the six elements every signal must surface, or it stays in raw diagnostics.
3. [Signal families](./signal-families.md) — warnings, rankings, recommendations, and review tasks, and what each must declare.
4. [Confidence and strength](./confidence-and-strength.md) — strength on the unified confidence scale; confidence versus integrity; hard rule versus score versus heuristic.
5. [Suppression and lifecycle](./suppression-and-lifecycle.md) — suppression as a first-class, logged action; the fired → reviewed → accepted / suppressed / rerun lifecycle.
6. [Integration with artefacts](./integration-with-artefacts.md) — inline versus inspector rail; cross-cutting density; freshness; signal versus artefact provenance.
7. [Ownership by module](./ownership-by-module.md) — which module produces which signal, and the host's render-only role.

---

## The authority rule, in one paragraph

Signals are prompts for judgement, not replacements for it. A signal may flag, rank, recommend, or create work; it must not commit business truth, must not silently mutate artefacts, and must not resolve itself. The human is the authority over the model. A signal that cannot declare what it is, why it fired, how strong it is, and what the user can do with it does not graduate beyond raw diagnostics. The full statement is in [the authority rule](./authority-rule.md).

---

## References & standards

_Informative:_

- Pirolli & Card — **Information Foraging**, 1999. Information scent governs where signals attach and how drill-down to evidence is placed ([integration with artefacts](./integration-with-artefacts.md)).
- Nielsen — **10 Usability Heuristics**, 1994. Visibility of system status and user control underpin the lifecycle and suppression contract.

Recorded in the [standards register](../../02-standards/STANDARDS-REGISTER.md). The unified scales (§8) and honest-state vocabulary (§9) are referenced from the [Documentation Standard](../../02-standards/DOCUMENTATION-STANDARD.md), never redefined here.

## Related documents

| Document                                                                                | What it covers                                                                  |
| --------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| [artefacts/intelligence-and-automation.md](../artefacts/intelligence-and-automation.md) | The model-is-authority rule and how automation creates work, not silent edits.  |
| [artefacts/explanation-surfaces.md](../artefacts/explanation-surfaces.md)               | Inspector, inline, and companion explanation; drill-down and information scent. |
| [trust-and-honesty.md](../trust-and-honesty.md)                                         | The honesty obligations signals inherit.                                        |
| [ux/README.md](../ux/README.md)                                                         | The interaction and inspector contract signals render through.                  |
| [DESIGN-SYSTEM.md](../DESIGN-SYSTEM.md)                                                 | The visual treatment that differentiates a signal from settled truth.           |
| [DOCUMENTATION-STANDARD.md](../../02-standards/DOCUMENTATION-STANDARD.md)               | The unified scales (§8) and honest-state vocabulary (§9).                       |
