# ADR-0042: Change Event Atomic Batches

- Status: Accepted
- Date: 2026-07-19
- Depends-On: ADR-0001, ADR-0002, ADR-0027, ADR-0038

## Context

One user task can produce several canonical operations. Committing each operation independently can expose a partial
entity or relationship after a crash. M1 therefore needs one durable boundary for the complete task while preserving
legacy ungrouped operation records.

## Decision

- Every task-first M1 authoring request produces one Change Event and one non-empty, contiguous operation group.
- Each grouped operation carries top-level `transaction_id` and a required, identical `change_event` object with:
  `change_event_id`, `event_kind`, `owner_actor_id`, `rationale`, `source`, `approval_state`, `group_id`,
  `dependency_event_ids`, and `lifecycle`.
- The group commits only when immediately followed by this canonical marker:

  ```text
  record_type: "change-event-commit"
  format_version: 1
  transaction_id: UUID
  operation_ids: ordered, non-empty, unique UUID list
  operation_count: exact list length
  operations_digest: lowercase BLAKE3-256
  ```

- `operations_digest` covers the exact concatenation of the ordered canonical JSONL operation bytes, including every
  terminating LF. The marker itself is not included.
- The writer builds the complete operation group and marker before I/O, appends them as one buffer, and performs one
  terminal `fsync`. SQLite applies all covered operations and advances the replay head in one transaction afterward.
- Legacy ungrouped operation records remain committed by their own append-and-`fsync`.
- Replay buffers grouped operations until a valid marker. It rejects orphan markers, interleaving, mismatched ids,
  transaction ids, metadata, counts, owner actors, or digests as corruption.
- An incomplete grouped suffix in the loose segment is recoverable by truncating from the first grouped operation. An
  incomplete group in a sealed segment is corruption.
- `ReplayHead.applied_record_count` counts operations, not marker lines. Its byte offset advances past the marker and
  its last digest remains the final covered operation digest.
- Workspaces containing markers require manifest feature `atomic_change_event_batches`; an existing workspace writes and
  syncs that feature before its first grouped append.
- Accepted authoring work requires top-level `IpcRequest.idempotencyKey`. Durable acceptance is recorded before the
  acknowledgement; terminal success is emitted only after the canonical group commits.

## Consequences

- A task is either absent or fully visible after recovery; partial entity and relationship authoring is impossible.
- Readers that do not support grouped commit markers refuse the workspace instead of misreading provisional records.
- Commit markers are physical segment records but not operations. Segment checksums cover their bytes and physical
  record count; replay and projection counters continue to count operations.
