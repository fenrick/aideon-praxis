# Koinon Collaboration — design intent (PLANNED)

> **Status: PLANNED.** This is design intent for a surface that does not yet exist. It will land at `src/workspaces/koinon` when the [Koinon](../../05-modules/koinon/README.md) crate exists ([DOCUMENTATION-STANDARD.md §10](../../02-standards/DOCUMENTATION-STANDARD.md)).

The collaboration surface, facing [Koinon](../../05-modules/koinon/README.md) (introduced by ADR-0029, owning the sync-and-conflict model of [ADR-0005](../../06-adrs/ADR-0005-sync-and-conflict-model.md)). It renders inside the one shell ([shell.md](../shell.md)) and presents presence, the shared workspace, and the merge/conflict experience.

## Surface it provides

- Presence and a shared-workspace view over operations-only exchange.
- A first-class merge and conflict-resolution experience.

## Module it faces

[Koinon](../../05-modules/koinon/README.md) — sync, presence, shared workspace, and the merge/conflict model.

## Key interactions

- Conflicts are first-class and never auto-resolved: a conflict list with stable identifiers, a return-to-safe-state path, and no partial merges ([ux/multi-user-conflict-ux.md](../../03-design/ux/multi-user-conflict-ux.md)).
- Merge is a host-managed operation; the renderer keeps the user in the same time context and renders host-produced results ([chrona-time](../chrona-time/README.md)).

## Related documents

| Document                                                                     | What it covers                                      |
| ---------------------------------------------------------------------------- | --------------------------------------------------- |
| [Koinon](../../05-modules/koinon/README.md)                                  | The planned module this surface faces.              |
| [ux/multi-user-conflict-ux.md](../../03-design/ux/multi-user-conflict-ux.md) | The conflict-resolution UX this surface follows.    |
| [README.md](../README.md)                                                    | The renderer architecture this surface will follow. |
