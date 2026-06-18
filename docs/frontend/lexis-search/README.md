# Lexis Search — design intent (PLANNED)

> **Status: PLANNED.** This is design intent for a surface that does not yet exist. It will land at `src/engines/lexis` when the [Lexis](../../05-modules/lexis/README.md) crate exists ([DOCUMENTATION-STANDARD.md §10](../../02-standards/DOCUMENTATION-STANDARD.md)).

The search and discovery surface, facing [Lexis](../../05-modules/lexis/README.md) (introduced by ADR-0012). It renders inside the one shell ([shell.md](../shell.md)) and presents full-text and semantic retrieval over entities, relationships, and artefact results — bounded and scoped to a viewpoint.

## Surface it provides

- A query input and result display over the twin, with results scoped to the active viewpoint.

## Module it faces

[Lexis](../../05-modules/lexis/README.md) — full-text and semantic/vector retrieval, bounded and viewpoint-aware.

## Key interactions

- The renderer issues a query at a viewpoint and renders host-returned, bounded results ([data-fetching.md](../data-fetching.md)); a capped result set carries the Partial/Bounded result state ([error-loading-empty.md](../error-loading-empty.md)).
- Selecting a result drives the global selection model and the inspector ([ux/selection-model.md](../../03-design/ux/selection-model.md)).

## Related documents

| Document                                  | What it covers                                      |
| ----------------------------------------- | --------------------------------------------------- |
| [Lexis](../../05-modules/lexis/README.md) | The planned module this surface faces.              |
| [README.md](../README.md)                 | The renderer architecture this surface will follow. |
