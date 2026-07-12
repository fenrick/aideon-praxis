# Sophia Assist — design intent (PLANNED)

> **Status: PLANNED.** This is design intent for a surface that does not yet exist. It will land at `src/engines/sophia`
> when the [Sophia](../../05-modules/sophia/README.md) crate exists
> ([DOCUMENTATION-STANDARD.md §10](../../02-standards/DOCUMENTATION-STANDARD.md)).

The AI-assistance surface, facing [Sophia](../../05-modules/sophia/README.md) (introduced by ADR-0014). It renders
inside the one shell ([shell.md](../shell.md)) and presents LLM-assisted authoring and enrichment behind centralised
guardrails, grounded in [Lexis](../../05-modules/lexis/README.md) retrieval. All assistant output is Generated content
until accepted.

## Surface it provides

- An assistant entry, assisted responses, guided authoring, and accept/reject affordances under review-before-commit.

## Module it faces

[Sophia](../../05-modules/sophia/README.md) — LLM-assisted authoring and enrichment behind guardrails; output is
Generated.

## Key interactions

- Generated content is marked with the provenance treatment and is a suggestion until accepted; acceptance is a new
  Asserted operation ([CONTEXT.md](../../../CONTEXT.md),
  [honest-state-treatments.md](../../03-design/design-system/honest-state-treatments.md)).
- Assistant flows follow the assisted-work guidance and the Sophia guardrails
  ([hig/assisted-work.md](../../03-design/hig/assisted-work.md),
  [hig/provenance-and-generated-work.md](../../03-design/hig/provenance-and-generated-work.md)).

## Related documents

| Document                                                     | What it covers                                      |
| ------------------------------------------------------------ | --------------------------------------------------- |
| [Sophia](../../05-modules/sophia/README.md)                  | The planned module this surface faces.              |
| [hig/assisted-work.md](../../03-design/hig/assisted-work.md) | The assisted-work patterns this surface follows.    |
| [README.md](../README.md)                                    | The renderer architecture this surface will follow. |
