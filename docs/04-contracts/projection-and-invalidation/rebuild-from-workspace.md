# Rebuild from workspace

Any projection can be rebuilt from the canonical workspace at any time. This is a hard invariant, and it is the oracle
against which [incremental maintenance](./consistency-model.md) is checked.

---

## The lossless guarantee

The canonical authority is the workspace folder and its append-only op log
([ADR-0001](../../06-adrs/ADR-0001-workspace-is-canonical-authority.md)). Because the op log is the complete, ordered
record of every mutation, replaying it reconstructs any derived projection exactly. A missing or corrupt projection is
therefore a performance cost, never data loss — the rebuild is lossless.

## The rebuild procedure

For a given `projection_id`:

1. Mark the projection as `rebuilding` in the projection metadata table ([freshness-states.md](./freshness-states.md)).
2. Read op segments from the workspace folder in op-log order.
3. Apply each segment through the projection's build function.
4. Write the completed projection to the local derived database at `.aideon/runtime/`.
5. Record `last_refreshed_at` and set state to `fresh`.
6. Notify any waiting read handles.

A rebuild does not require network access, external services, or a sync peer. The workspace folder is sufficient.

## Rebuild as the oracle

Rebuild is the ground truth. The [consistency model](./consistency-model.md) requires that an `incremental` projection's
delta-apply produce the same state a full rebuild would (Gupta & Mumick, 1995). This makes rebuild both the correctness
oracle and the recovery path:

- The `batch_rebuild` [freshness class](./freshness-classes.md) relies on this procedure as its primary refresh
  mechanism.
- The `incremental` class falls back to a full rebuild when the delta log is missing or inconsistent.
- A projection-version mismatch between the descriptor and the stored projection always triggers a full rebuild before
  the projection is served.

## References & standards

- Fowler; Young — **Event Sourcing & CQRS** _(normative: rebuild a read model by replaying the log)_.
- Gupta & Mumick — **Maintenance of Materialized Views**, 1995 _(normative: rebuild as the equivalence oracle)_.

## Related documents

| Document                                                                        | What it covers                                         |
| ------------------------------------------------------------------------------- | ------------------------------------------------------ |
| [consistency-model.md](./consistency-model.md)                                  | Why rebuild is the oracle for incremental maintenance. |
| [ADR-0001](../../06-adrs/ADR-0001-workspace-is-canonical-authority.md)          | The workspace-is-canonical invariant rebuild rests on. |
| [Mneme: export, import, replay](../../05-modules/mneme/export-import-replay.md) | The replay mechanism a rebuild uses.                   |
