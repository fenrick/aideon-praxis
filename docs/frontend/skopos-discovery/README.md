# Skopos Discovery — design intent (PLANNED)

> **Status: PLANNED.** This is design intent for a surface that does not yet exist. It will land at `src/workspaces/skopos` when the [Skopos](../../05-modules/skopos/README.md) crate exists ([DOCUMENTATION-STANDARD.md §10](../../02-standards/DOCUMENTATION-STANDARD.md)).

The automated-discovery and reality-sync surface, facing [Skopos](../../05-modules/skopos/README.md) (introduced by ADR-0032). It renders inside the one shell ([shell.md](../shell.md)) and presents continuous ingestion from cloud platforms, CMDBs, and monitoring that keeps the `actual` layer fresh — the entropy feeder for Kairos. Distinct from manual/file interchange ([pylon-interchange](../pylon-interchange/README.md)).

## Surface it provides

- Discovery-source status, reconciliation review, and the freshness of the `actual` layer.

## Module it faces

[Skopos](../../05-modules/skopos/README.md) — continuous ingestion and reality-sync, running as durable jobs through [Continuum](../../05-modules/continuum/README.md).

## Key interactions

- Runs are job-driven, provenance-preserving, and replayable; the surface reuses the automation run and provenance patterns ([continuum-automation](../continuum-automation/README.md)).
- Reconciliation exceptions surface as Awaiting-review result state ([error-loading-empty.md](../error-loading-empty.md)).

## Related documents

| Document                                                  | What it covers                                       |
| --------------------------------------------------------- | ---------------------------------------------------- |
| [Skopos](../../05-modules/skopos/README.md)               | The planned module this surface faces.               |
| [continuum-automation](../continuum-automation/README.md) | The run and provenance patterns this surface reuses. |
| [README.md](../README.md)                                 | The renderer architecture this surface will follow.  |
