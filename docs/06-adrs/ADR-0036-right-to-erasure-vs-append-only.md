# ADR-0036: Right to Erasure vs the Append-Only Op Log

- Status: Accepted
- Date: 2026-06-16
- Depends-On: ADR-0001 (workspace is canonical authority), ADR-0003 (content-addressed object store)
- Relates-To: ADR-0030 (governance — Themis), ADR-0018 (idempotency and deduplication), ADR-0007 (deterministic package
  export)

## Context

The workspace is append-only by design: the op log is the canonical authority and every change is a forward-only
operation, never an in-place edit ([ADR-0001](./ADR-0001-workspace-is-canonical-authority.md)). A delete is a
`TombstoneEntity` operation — supersession, not erasure
([op-fact-schema-model.md](../05-modules/mneme/op-fact-schema-model.md)). This is what makes the log safe to replay,
export, import, and sync, and what makes audit derive from a single source of truth
([audit-and-logging.md](../02-standards/security/audit-and-logging.md)).

That property collides head-on with a legal right to erasure. Under GDPR Article 17 a data subject may require that
personal data concerning them be erased, and the controller must comply within the law's limits. "Append-only, nothing
is ever deleted" is not, on its face, compatible with "erase this person's data." The collision is recorded as an open
question in two places already — retention against the append-only invariant
([ADR-0030](./ADR-0030-governance-themis.md) open question;
[audit-and-logging.md](../02-standards/security/audit-and-logging.md)) — and this ADR fixes the durable decision so the
contradiction stops being deferred.

Three properties constrain the answer. First, idempotent replay: the same `(partition, op_id)` must be a no-op on
replay, and a package replayed twice must yield the same twin ([ADR-0018](./ADR-0018-idempotency-and-deduplication.md)).
Second, convergence under sync: peers reconcile by replaying operations, so a physically removed operation that other
peers still hold would re-materialise ([ADR-0034](./ADR-0034-merge-correctness-and-convergence.md)). Third, blob
integrity by hash: an object's address is the hash of its bytes, so altering a blob in place is detected as corruption
([blobs-and-integrity.md](../02-standards/security/blobs-and-integrity.md),
[ADR-0003](./ADR-0003-content-addressed-object-store.md)). Any erasure model must reconcile with all three.

## Governance Framing

- **Decision type:** Invariant (structural history is preserved; personal payloads are erasable) + stable seam (the
  erasure operation and its effect on resolution).
- **Known future pressure:** hosted multi-tenant mode where erasure must propagate to peers; jurisdiction-specific
  retention overriding or delaying erasure; regulators asking to demonstrate that erased data is unrecoverable;
  subject-access and rectification requests reusing the same machinery.
- **What stays stable:** the op log stays append-only and idempotent; structural history (an entity existed, a
  relationship held over an interval) survives erasure; erasure is itself a recorded, attributable, forward-only
  operation.
- **What is provisional:** the exact field-level redaction policy (which slots are "personal payload"); the
  retention-vs-erasure precedence expression; the GC cadence that reclaims shredded blob space.
- **What is deferred:** propagation of an erasure operation to sync peers and the proof that no peer retains the
  shredded key ([ADR-0034](./ADR-0034-merge-correctness-and-convergence.md)); hosted-mode legal-hold workflow.
- **Why hard to reverse:** the erasure operation's shape becomes a contract every replay, export, and sync path must
  honour; once data is crypto-shredded the bytes are gone by design, so a wrong model is not recoverable after the fact.

## Decision

Erasure is achieved by **crypto-shredding personal blob content plus tombstone-and-redaction of personal payloads in the
op log, while preserving structural history and the hash chain.** True physical deletion of operations from the log is
rejected. Concretely:

1. **Erasure is a forward-only operation, not an in-place delete.** An `ErasePersonalData` operation is appended to the
   log, attributed and timestamped like any mutation
   ([op-fact-schema-model.md](../05-modules/mneme/op-fact-schema-model.md)), naming the slots and blobs to erase. The
   log stays append-only; the erasure is part of the history, consistent with retention being a recorded forward-only
   operation ([ADR-0030](./ADR-0030-governance-themis.md)).

2. **Personal blob content is crypto-shredded.** A blob carrying personal data is encrypted under a per-blob key wrapped
   in the OS key store ([encryption-at-rest.md](../02-standards/security/encryption-at-rest.md),
   [secrets-and-keys.md](../02-standards/security/secrets-and-keys.md)). Erasure destroys that wrapped key, rendering
   the bytes unrecoverable without rewriting the blob or breaking its content address. The hash-addressed object's name
   is unchanged, so the hash chain and every reference to it remain valid
   ([blobs-and-integrity.md](../02-standards/security/blobs-and-integrity.md)); the bytes simply no longer decrypt. A
   reference to a shredded blob resolves to a `Failed` coverage state naming the erased object, never silently wrong
   bytes ([content-addressed-blobs.md](../05-modules/mneme/content-addressed-blobs.md)).

3. **Personal payloads in property facts are redacted, structure is kept.** For personal data held in fact values rather
   than blobs (a name, an email in a `pii: true` slot —
   [pii-and-export-redaction.md](../02-standards/security/pii-and-export-redaction.md)), the `ErasePersonalData`
   operation supersedes the value with a redaction tombstone: the slot's _structural_ existence and its valid-time
   interval survive, the _personal value_ does not. The earlier operation is not removed from the log; its payload is
   overwritten in storage with the redaction so the value cannot be recovered, and the resolver returns the redaction
   for every viewpoint, including belief-pinned reads. The entity-existed, relationship-held-over-this-interval shape of
   history is preserved; the person's identifying content is gone.

4. **True physical deletion of operations is rejected.** Removing an operation from the log would break idempotent
   replay ([ADR-0018](./ADR-0018-idempotency-and-deduplication.md)) — a re-imported package would re-create the erased
   data — and break convergence under sync, where peers replaying their copies would re-materialise it
   ([ADR-0034](./ADR-0034-merge-correctness-and-convergence.md)). Crypto-shredding and payload redaction give the same
   outcome the law requires (the personal data is unrecoverable) without the structural breakage physical deletion
   causes.

5. **The invariant, stated.** _Structural history is preserved; personal content is erasable._ After erasure, the twin
   still records that an entity existed and that relationships held over their intervals — the architecture's integrity,
   lineage, and audit reasoning still hold — but no personal data concerning the subject can be resolved or recovered
   from the workspace.

## Considered Options

- **True physical deletion of operations from the op log (rejected):** the most literal reading of Article 17, but it
  breaks the two properties the whole storage model rests on — idempotent replay
  ([ADR-0018](./ADR-0018-idempotency-and-deduplication.md)) and convergence under sync
  ([ADR-0034](./ADR-0034-merge-correctness-and-convergence.md)) — and removing an entry mid-log severs causal `deps`. It
  also leaves no attributable record that an erasure occurred, which retention and audit require.
- **Tombstone only, leaving the personal payload in the log (rejected):** trivial to implement and keeps replay clean,
  but it does not erase anything — the personal value is still in `model/ops` on disk and in any export. It satisfies
  "hide on read", not "erase", and would not survive scrutiny under Article 17.
- **Re-write the whole log without the personal operations (rejected):** produces a clean log but changes every
  downstream `op_id`/hash, invalidating exports, sync state, and any external reference; it is a history rewrite the
  workspace model forbids ([ADR-0001](./ADR-0001-workspace-is-canonical-authority.md)).
- **Crypto-shred + tombstone-redaction preserving structure (chosen):** erases the personal content irrecoverably (key
  destroyed; payload overwritten) while keeping the log append-only, replay idempotent, the hash chain intact, and
  structural history auditable. It is the only option that reconciles Article 17 with all three constraints.

## Consequences

- **The cost is named: erasure requires encryption at rest to be built.** Crypto-shredding a blob depends on per-blob
  key envelopes ([encryption-at-rest.md](../02-standards/security/encryption-at-rest.md)), which are **design intent,
  not built**. Until encryption at rest lands, blob erasure degrades to overwriting the blob bytes — which changes the
  content address and so must be modelled as a new object plus a tombstone of the old reference, a heavier and less
  clean path. Payload redaction of fact values does not depend on encryption and can land first.
- **Structural-history survival is a deliberate trade-off.** A regulator or subject who reads "the entity existed over
  this interval" after erasure sees structure, not personal content. This is defensible — structure is not personal data
  once the identifying payload is gone — but it must be documented to the subject, and the field-level policy of what
  counts as "personal payload" versus "structure" is provisional (Governance Framing).
- **Erasure interacts with belief-pinned reads.** A redacted value is returned for _every_ viewpoint, including a
  historical-belief read that would otherwise surface the superseded original
  ([op-fact-schema-model.md](../05-modules/mneme/op-fact-schema-model.md)); erasure is the one case where a later
  operation reaches back across the asserted-time axis, because the law requires the old value be unrecoverable, not
  merely superseded.
- **Sync propagation is the deferred hard part.** In hosted/multi-peer mode an erasure must reach every peer and every
  peer must destroy its copy of the shredded key; proving no peer retains it is deferred to the sync model
  ([ADR-0034](./ADR-0034-merge-correctness-and-convergence.md), [ADR-0030](./ADR-0030-governance-themis.md)).
- **Exports honour erasure for free.** Because the deterministic export pipeline already redacts PII deny-by-default and
  verifies redaction over derivations and blobs
  ([pii-and-export-redaction.md](../02-standards/security/pii-and-export-redaction.md),
  [ADR-0007](./ADR-0007-deterministic-package-export.md)), an export taken after erasure carries neither the shredded
  blob bytes nor the redacted payload.
- **Worked example:** a `DataEntity` records a contact's name in a `pii: true` slot and attaches their signed consent
  PDF as a blob ([core-v1.json](../05-modules/mneme/op-fact-schema-model.md) seed types). On an erasure request, an
  `ErasePersonalData` operation is appended: it supersedes the name slot with a redaction tombstone (the slot's interval
  survives, the name does not), and destroys the consent PDF's wrapped per-blob key (the object stays at
  `objects/sha256/…`, its bytes no longer decrypt). A later replay of the workspace package re-applies the same
  operations idempotently and reproduces the _erased_ state, not the original; audit still shows that an entity existed
  and that an erasure was performed, attributed and timestamped.

## Follow-ups / Open Questions

- Define the field-level policy that classifies a slot as "personal payload" (erasable) versus "structure" (preserved),
  grounded in the `pii: true` schema tag
  ([pii-and-export-redaction.md](../02-standards/security/pii-and-export-redaction.md)).
- Specify the `ErasePersonalData` operation payload and how the resolver applies a redaction tombstone across the
  asserted-time axis ([op-fact-schema-model.md](../05-modules/mneme/op-fact-schema-model.md)).
- Land encryption at rest with per-blob key envelopes so crypto-shredding is available
  ([encryption-at-rest.md](../02-standards/security/encryption-at-rest.md)).
- Resolve erasure propagation and the "no peer retains the key" proof under sync
  ([ADR-0034](./ADR-0034-merge-correctness-and-convergence.md)).
- Express retention-vs-erasure precedence and legal hold in Themis policy ([ADR-0030](./ADR-0030-governance-themis.md)).

## References & standards

- **Regulation (EU) 2016/679 (GDPR), Article 17** — Right to erasure ('right to be forgotten') _(normative: the legal
  obligation this ADR reconciles)_.
- Fowler; Young — **Event Sourcing & CQRS** _(informative: why the log is truth and physical deletion is disruptive)_.
- **NIST SP 800-88** — Media Sanitization _(informative: cryptographic erasure / crypto-shredding as a sanitisation
  technique)_.

## Related documents

| Document                                                                            | What it covers                                                 |
| ----------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| [ADR-0001](./ADR-0001-workspace-is-canonical-authority.md)                          | The append-only op log this decision reconciles erasure with.  |
| [op-fact-schema-model.md](../05-modules/mneme/op-fact-schema-model.md)              | Tombstone-as-supersession and the operation surface.           |
| [pii-and-export-redaction.md](../02-standards/security/pii-and-export-redaction.md) | The PII classification and redaction machinery erasure reuses. |
| [encryption-at-rest.md](../02-standards/security/encryption-at-rest.md)             | The per-blob key envelopes crypto-shredding depends on.        |
| [ADR-0030](./ADR-0030-governance-themis.md)                                         | Retention policy and the open question this ADR closes.        |
