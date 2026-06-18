# Aegis Risk — design intent (PLANNED)

> **Status: PLANNED.** This is design intent for a surface that does not yet exist. It will land at `src/engines/aegis` when the [Aegis](../../05-modules/aegis/README.md) crate exists ([DOCUMENTATION-STANDARD.md §10](../../02-standards/DOCUMENTATION-STANDARD.md)).

The risk, controls, and compliance surface, facing [Aegis](../../05-modules/aegis/README.md) (introduced by ADR-0031). It renders inside the one shell ([shell.md](../shell.md)) and presents a risk register and a control library mapped onto the twin, with regulatory obligations over capabilities and data.

## Surface it provides

- A risk register and control library as views over typed twin content.
- Obligation tracking mapped to capabilities and data entities, resolved at a viewpoint.

## Module it faces

[Aegis](../../05-modules/aegis/README.md) — risk register, control library, and regulatory-obligation tracking, stored as facts in [Mneme](../../05-modules/mneme/README.md) and resolved through [Chrona](../../05-modules/chrona/README.md).

## Key interactions

- Read risk and control entities at a viewpoint; author changes as commands ([editing-flow.md](../../03-design/ux/editing-flow.md)).
- Integrity and confidence on mapped content follow the unified scales ([DOCUMENTATION-STANDARD.md §8](../../02-standards/DOCUMENTATION-STANDARD.md)).

## Related documents

| Document                                  | What it covers                                      |
| ----------------------------------------- | --------------------------------------------------- |
| [Aegis](../../05-modules/aegis/README.md) | The planned module this surface faces.              |
| [README.md](../README.md)                 | The renderer architecture this surface will follow. |
