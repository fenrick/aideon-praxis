# Themis Governance — design intent (PLANNED)

> **Status: PLANNED.** This is design intent for a surface that does not yet exist. It will land at `src/workspaces/themis` when the [Themis](../../05-modules/themis/README.md) crate exists ([DOCUMENTATION-STANDARD.md §10](../../02-standards/DOCUMENTATION-STANDARD.md)).

The governance surface, facing [Themis](../../05-modules/themis/README.md) (introduced by ADR-0030). It renders inside the one shell ([shell.md](../shell.md)) and presents identity, RBAC, approval workflows, retention, audit, and capability policy. On the desktop default (single user) the policy is trivial; this surface comes into its own in hosted mode and the Steward participation mode.

## Surface it provides

- Role and capability administration, approval queues, retention and audit views.

## Module it faces

[Themis](../../05-modules/themis/README.md) — identity, RBAC, approvals, retention, audit, and capability policy, deny-by-default.

## Key interactions

- Every governance action is capability-gated and explains its impact before it runs ([continuum-automation](../continuum-automation/README.md)).
- Approval and review align with the collaboration and review patterns ([hig/collaboration-and-review.md](../../03-design/hig/collaboration-and-review.md)).

## Related documents

| Document                                    | What it covers                                      |
| ------------------------------------------- | --------------------------------------------------- |
| [Themis](../../05-modules/themis/README.md) | The planned module this surface faces.              |
| [README.md](../README.md)                   | The renderer architecture this surface will follow. |
