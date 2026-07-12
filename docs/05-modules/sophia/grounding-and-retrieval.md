# Grounding and retrieval

Why Sophia grounds generation in retrieved twin content rather than generating freely, and how that grounding rides on
Lexis. For practitioners reasoning about why an AI suggestion is about the actual model and not an invention.

> **PLANNED.** No `aideon_sophia` crate exists; this is design intent per
> [ADR-0014](../../06-adrs/ADR-0014-ai-assistance-and-generated-provenance-sophia.md).

## Grounding, not free generation

Sophia grounds its output in twin content retrieved through [Lexis](../lexis/README.md) rather than generating freely
(Lewis et al., **Retrieval-Augmented Generation**, 2020). This is retrieval-augmented generation: before producing a
suggestion, the host retrieves relevant twin content and composes it into the prompt, so the model reasons over the
actual model rather than its own priors
([ADR-0014](../../06-adrs/ADR-0014-ai-assistance-and-generated-provenance-sophia.md)).

The trade-off named: free generation has higher fluency and more invention; grounding in twin content is the discipline
that keeps suggestions about the actual model, at the cost of being bounded by what retrieval surfaces
([ADR-0014](../../06-adrs/ADR-0014-ai-assistance-and-generated-provenance-sophia.md)).

## Grounding reduces invention and gives traceable support

Two things follow from grounding ([ADR-0014](../../06-adrs/ADR-0014-ai-assistance-and-generated-provenance-sophia.md)):

- It **reduces invention** — the model is steered by retrieved entities and relationships, so it is less likely to
  propose entities the twin does not contain.
- It gives each suggestion **traceable supporting content** — the retrieved context is the evidence behind the
  suggestion, carried with it as part of its provenance.

A suggestion that **cannot be grounded** is surfaced as low-confidence or withheld, not presented as confident.
Ungrounded fluency is exactly the failure mode grounding exists to prevent.

## How retrieval rides on Lexis (via the host)

Sophia and Lexis do not call each other directly — that would breach the acyclic engine graph
([ADR-0011](../../06-adrs/ADR-0011-module-taxonomy-and-boundaries.md)). The **host composes** them: it issues a Lexis
retrieval, then passes the retrieved context into the Sophia generation request. This matters for honesty as well as
architecture, because Lexis retrieval is **viewpoint-aware and bounded**
([Lexis viewpoint-aware search](../lexis/viewpoint-aware-search.md)):

- Grounding context is scoped to the reader's viewpoint, so Sophia does not ground a suggestion on entities that do not
  exist at the reader's as-of valid time, layer, or scenario.
- The context is bounded, so the retrieval window is a finite slice of the twin — a provisional parameter
  ([ADR-0014](../../06-adrs/ADR-0014-ai-assistance-and-generated-provenance-sophia.md)), and the boundedness of the
  evidence is honest about what was and was not considered.

## Worked example

A steward asks Sophia to suggest how the seed `Application` `n:application:journey-studio` relates to the capability
map. The host issues a Lexis retrieval at the steward's viewpoint, which returns the `Capability`
`n:capability:journey-orchestration` ("Journey Orchestration") and nearby entities as candidates. Sophia grounds on that
retrieved context and suggests a `realises` relationship from the application to the capability, citing the retrieved
descriptions as its support, at Medium confidence. Because the retrieval was viewpoint-aware, a capability that exists
only in an unselected scenario is not in the grounding context and is not proposed. If retrieval returned nothing
relevant, Sophia withholds the suggestion or marks it low-confidence rather than inventing a target
([ADR-0014](../../06-adrs/ADR-0014-ai-assistance-and-generated-provenance-sophia.md)).

## References & standards

_Normative:_

- Lewis et al. — **Retrieval-Augmented Generation**, 2020. The grounding method.

Recorded in the [standards register](../../02-standards/STANDARDS-REGISTER.md).

## Related documents

| Document                                                                            | What it covers                                             |
| ----------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| [Sophia README](./README.md)                                                        | The module index and invariants.                           |
| [Guardrails and provenance](./guardrails-and-provenance.md)                         | What happens to a grounded suggestion once produced.       |
| [Lexis module](../lexis/README.md)                                                  | The viewpoint-aware, bounded retrieval grounding rides on. |
| [ADR-0014](../../06-adrs/ADR-0014-ai-assistance-and-generated-provenance-sophia.md) | The decision that fixes the grounding obligation.          |
