# The Artefact Contract

Every artefact declares a contract. It is not optional metadata appended after the fact; it is the minimum information required for a result to be trustworthy. An artefact that cannot answer for itself will eventually be trusted by habit rather than by understanding.

## The four questions

Any artefact surface must answer four questions. If one has no good answer, the artefact is not complete.

1. **What am I looking at?** — purpose and scope.
2. **Why does it look this way?** — evidence and reasoning.
3. **How solid is it?** — confidence, freshness, and content classification.
4. **What can I do next?** — the valid actions from this result.

These map onto the drill-down path: a result leads to its explanation and provenance, and from there to a valid action ([explanation-surfaces.md](./explanation-surfaces.md)).

## Contract fields

| Field                      | What it declares                                                                                                                                                |
| -------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Purpose**                | One sentence: what this artefact is for.                                                                                                                        |
| **Question answered**      | The specific question it is designed to address.                                                                                                                |
| **Audience**               | The role or [participation mode](../participation-and-trust/participation-modes.md) it serves.                                                                  |
| **Viewpoint**              | The valid time, asserted time, layer or layer policy, scenario, and scope it executes at.                                                                       |
| **Inclusion rules**        | What is in scope and what is explicitly excluded.                                                                                                               |
| **Confidence**             | The reliability of the result, on the [confidence scale](../../02-standards/DOCUMENTATION-STANDARD.md) (§8.2) — never an unqualified claim.                     |
| **Evidence**               | Where the content comes from — source entities, imports, inputs.                                                                                                |
| **Content classification** | Whether each element is Asserted, Inferred, or Generated ([content-classification.md](./content-classification.md)).                                            |
| **Result state**           | Whether any element is stale, partial, rebuilding, in progress, or awaiting review ([Documentation Standard §9](../../02-standards/DOCUMENTATION-STANDARD.md)). |
| **Next action**            | What the user can do from this result.                                                                                                                          |

The confidence and integrity values use the unified scales ([§8](../../02-standards/DOCUMENTATION-STANDARD.md)); the result states use the unified honest-state vocabulary ([§9](../../02-standards/DOCUMENTATION-STANDARD.md)). This document does not redefine them.

## The viewpoint is part of identity

The execution viewpoint is declared as part of the artefact's identity and is visible on every surface that renders the result. It is not implicit, and it is not assumed from session state. The full frame — as-of valid time, as-of asserted time, layer/policy, scenario, scope — is fixed by [ADR-0009](../../06-adrs/ADR-0009-temporal-model-valid-interval-layer-policy-viewpoint.md) and carried per the [temporal and scenario context contract](../../04-contracts/TEMPORAL-AND-SCENARIO-CONTEXT.md).

## Worked example

The "Application Portfolio Health" artefact ([what-is-an-artefact.md](./what-is-an-artefact.md)) declares its contract as:

- **Purpose:** show the health of the application estate.
- **Question:** which applications exist, what they support, how healthy are they?
- **Audience:** Expert and Read-only modes.
- **Viewpoint:** `{valid: 2026-06-11, asserted: latest, layer: actual, scenario: base, scope: type=Application}`.
- **Evidence:** the `Application` entities and their `realises` relationships in `baseline.yaml`.
- **Content classification:** `disposition` and `lifecycle` are **Asserted** (seeded); a derived health roll-up across the `realises` edges would be **Inferred**.
- **Confidence:** **High** (`≥ 0.85`) for the seeded rows; the integrity gate is satisfied because each `Application` carries the slots the [effective schema](../metamodel/slots-and-effective-schema.md) expects.

A reader can answer all four questions from the result without leaving it. That is the test the contract sets.

## Related documents

| Document                                                                                | What it covers                                      |
| --------------------------------------------------------------------------------------- | --------------------------------------------------- |
| [content-classification.md](./content-classification.md)                                | The Asserted/Inferred/Generated display rules.      |
| [explanation-surfaces.md](./explanation-surfaces.md)                                    | Where the four questions are answered in the shell. |
| [trust-and-honesty.md](../trust-and-honesty.md)                                         | The honesty obligations the contract enforces.      |
| [TEMPORAL-AND-SCENARIO-CONTEXT.md](../../04-contracts/TEMPORAL-AND-SCENARIO-CONTEXT.md) | The viewpoint contract.                             |
