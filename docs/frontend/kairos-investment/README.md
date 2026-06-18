# Kairos Investment — design intent (PLANNED)

> **Status: PLANNED.** This is design intent for a surface that does not yet exist. It will land at `src/engines/kairos` when the [Kairos](../../05-modules/kairos/README.md) crate exists ([DOCUMENTATION-STANDARD.md §10](../../02-standards/DOCUMENTATION-STANDARD.md)).

The investment and portfolio-planning surface, facing [Kairos](../../05-modules/kairos/README.md) (introduced by ADR-0028). It renders inside the one shell ([shell.md](../shell.md)) and presents the planning of portfolio, programme, and project work driven by the two forces of change — entropy and action — planned backward from a target date.

## Surface it provides

- Portfolio, programme, and project planning views over the twin, scoped to a viewpoint.
- Sizing and sequencing of change against a target date, with plan facts authored as Plan Events in a non-actual layer ([CONTEXT.md](../../../CONTEXT.md)).

## Module it faces

[Kairos](../../05-modules/kairos/README.md) — opportune-time planning, paired with [Chrona](../../05-modules/chrona/README.md) (sequential time vs the moment to act). Skopos feeds the entropy signal.

## Key interactions

- Read plan/forecast layers at a viewpoint; author Plan Events as commands ([editing-flow.md](../../03-design/ux/editing-flow.md)).
- Surface opportunities and their evidence through the signal surfaces and the honest-state vocabulary ([error-loading-empty.md](../error-loading-empty.md)).

## Related documents

| Document                                    | What it covers                                      |
| ------------------------------------------- | --------------------------------------------------- |
| [Kairos](../../05-modules/kairos/README.md) | The planned module this surface faces.              |
| [README.md](../README.md)                   | The renderer architecture this surface will follow. |
