# Kerux Reporting — design intent (PLANNED)

> **Status: PLANNED.** This is design intent for a surface that does not yet exist. It will land at `src/engines/kerux` when the [Kerux](../../05-modules/kerux/README.md) crate exists ([DOCUMENTATION-STANDARD.md §10](../../02-standards/DOCUMENTATION-STANDARD.md)).

The reporting and publishing surface, facing [Kerux](../../05-modules/kerux/README.md) (introduced by ADR-0015). It renders inside the one shell ([shell.md](../shell.md)) and presents deterministic briefings, roadmaps, and packaged outputs with redaction by default and the executing viewpoint preserved.

## Surface it provides

- Configuration and preview of briefings, roadmaps, and packaged outputs for consumption.

## Module it faces

[Kerux](../../05-modules/kerux/README.md) — deterministic reporting and publishing with redaction by default.

## Key interactions

- A published output is an artefact result at a preserved viewpoint ([CONTEXT.md](../../../CONTEXT.md)); the surface shows the viewpoint and redaction state honestly ([error-loading-empty.md](../error-loading-empty.md)).
- Export is capability-gated and redacted by default ([hig/import-and-export.md](../../03-design/hig/import-and-export.md)).

## Related documents

| Document                                  | What it covers                                      |
| ----------------------------------------- | --------------------------------------------------- |
| [Kerux](../../05-modules/kerux/README.md) | The planned module this surface faces.              |
| [README.md](../README.md)                 | The renderer architecture this surface will follow. |
