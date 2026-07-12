# Pylon Interchange — design intent (PLANNED)

> **Status: PLANNED.** This is design intent for a surface that does not yet exist. It will land at `src/engines/pylon`
> when the [Pylon](../../05-modules/pylon/README.md) crate exists
> ([DOCUMENTATION-STANDARD.md §10](../../02-standards/DOCUMENTATION-STANDARD.md)).

The interchange surface, facing [Pylon](../../05-modules/pylon/README.md) (introduced by ADR-0013). It renders inside
the one shell ([shell.md](../shell.md)) and presents file-based, manual import and export — ArchiMate Open Exchange,
CSV/Excel, EA-tool connectors — as trust-sensitive review workflows. Distinct from automated discovery
([skopos-discovery](../skopos-discovery/README.md)).

## Surface it provides

- An import proposal-and-review surface and an export surface with mapping reports.

## Module it faces

[Pylon](../../05-modules/pylon/README.md) — file/manual import/export and connectors.

## Key interactions

- Import is deterministic and reviewable before it commits; export is deny-by-default with redaction
  ([hig/import-and-export.md](../../03-design/hig/import-and-export.md)).
- Mapping reports and exceptions render with the honest-state vocabulary
  ([error-loading-empty.md](../error-loading-empty.md)).

## Related documents

| Document                                                             | What it covers                                          |
| -------------------------------------------------------------------- | ------------------------------------------------------- |
| [Pylon](../../05-modules/pylon/README.md)                            | The planned module this surface faces.                  |
| [hig/import-and-export.md](../../03-design/hig/import-and-export.md) | The import/export review patterns this surface follows. |
| [README.md](../README.md)                                            | The renderer architecture this surface will follow.     |
