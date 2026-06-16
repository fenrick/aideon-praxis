# Identifier generation and provenance

How Mneme mints the identifiers that pin every entity, edge, fact, and operation, and the provenance every operation carries — who or what asserted it, when, and how that origin drives the claim's [content classification](../../../CONTEXT.md). The two concerns are paired because an identifier without a provenance is a row with no history, and a provenance without a stable identifier cannot be traced back. Terms follow the project glossary ([`CONTEXT.md`](../../../CONTEXT.md)).

---

## Four identifier namespaces, kept distinct

The system mints identifiers in four namespaces, and conflating any two of them is a defect. They differ in what they name, how the value is produced, and whether it is deterministic.

| Namespace                  | Names                                     | How it is minted                                                                             | Deterministic?                              |
| -------------------------- | ----------------------------------------- | -------------------------------------------------------------------------------------------- | ------------------------------------------- |
| **Metamodel symbol UUID**  | A type, relationship, or attribute _kind_ | **UUIDv5** from a fixed project namespace UUID + the symbol's stable name path               | Yes — same name always yields the same UUID |
| **Runtime entity ID**      | One entity _instance_ in the twin         | A per-instance identifier, minted once at creation and stored on `aideon_entities.entity_id` | No — a fresh identity per instance          |
| **Edge ID**                | One relationship _instance_ in the twin   | A per-instance identifier on `aideon_edges.edge_id`, like an entity ID                       | No — a fresh identity per instance          |
| **Operation ID (`op_id`)** | One append to the op log                  | Minted on the `OpEnvelope` when the operation is created; the PK of `aideon_ops`             | No — a fresh identity per mutation          |

The dividing line is **symbols versus instances versus mutations**. A metamodel symbol UUID names a _kind of thing_ and must be reproducible, so two workspaces that define `Capability` independently agree on its identity for cross-document matching ([packages and registry](../../03-design/metamodel/packages-and-registry.md)). A runtime entity or edge ID names _one occurrence_ of that kind and must be unique, not reproducible. An `op_id` names _one event_ in history and is the idempotency and tie-break key.

### Metamodel symbol UUIDs are UUIDv5

A type, relationship, or attribute carries two coordinates: a human-readable string `id` (`Capability`, `serves`, `disposition`) and a stable `uuid`. The UUIDs are **UUIDv5** values — deterministic, name-based UUIDs (RFC 9562, formerly RFC 4122) computed by the Praxis metamodel compiler from a fixed project namespace UUID and the symbol's stable name path (the type `id`, or `type-id + attribute-name`). Because UUIDv5 hashes namespace + name, the same name always yields the same UUID; the values are reproducible from source and committed in `core-v1.json` so they travel with the workspace ([packages and registry](../../03-design/metamodel/packages-and-registry.md), [metamodel ownership](../praxis/metamodel-ownership.md)).

Two rules follow, both absolute and both owned by Praxis, not Mneme:

- **A symbol UUID is never invented.** It is minted by the compiler from namespace plus name, or read from committed source — never typed by hand.
- **A published symbol UUID never changes.** Renaming a symbol's string `id` changes the name input and therefore the UUID, which is a breaking change to identity, governed as remove-plus-add ([extension and versioning](../../03-design/metamodel/extension-and-versioning.md)).

Mneme stores these UUIDs as `aideon_types.type_id`, `aideon_fields.field_id`, and edge-type IDs; it does not generate them ([sqlite](./SQLITE.md), [metamodel ownership](../praxis/metamodel-ownership.md)).

### Runtime entity and edge IDs are per-instance

An entity instance is identified by an `entity_id` and an edge instance by an `edge_id`, each minted once at creation and never reused. These are storage identifiers and do not cross the Praxis boundary as raw values: the [domain↔storage registry](../../03-design/metamodel/packages-and-registry.md) maps domain-facing keys to them, and the rest of the product addresses instances by their stable domain key — the `n:…` and `e:…` references the seed dataset uses (`n:application:automation-orchestrator`, `e:plan-cutover-capability`) — never by a storage row reference ([metamodel ownership](../praxis/metamodel-ownership.md)). An instance ID is unique, not reproducible: creating "another Automation Orchestrator" mints a new identity rather than colliding with the first.

### Operation IDs pin one mutation

Every mutation is an `OpEnvelope` whose `op_id` is the stable identity of that one append ([op-fact-schema-model](./op-fact-schema-model.md)). The `op_id` does three jobs:

- **Idempotency** — `(partition_id, op_id)` is the primary key of `aideon_ops`, so re-presenting the same operation on import or sync is a no-op ([export-import-replay](./export-import-replay.md), [ADR-0018](../../06-adrs/ADR-0018-idempotency-and-deduplication.md)).
- **Provenance link** — every derived property and existence fact carries the `op_id` it derived from in its primary key, so a fact is always traceable to the exact operation that produced it ([sqlite](./SQLITE.md)).
- **Resolution tie-break of last resort** — when two facts share a valid interval and an identical HLC, the lexicographically larger `op_id` wins, keeping resolution deterministic ([bitemporal-and-hlc](./bitemporal-and-hlc.md), precedence chain rule 4).

A causal dependency between operations is recorded by `op_id` in `aideon_op_deps`, so an operation whose predecessor is missing is reported on import rather than applied blind ([export-import-replay](./export-import-replay.md)).

---

## Provenance is carried by the operation

Every operation records **who or what asserted it, and when**, and because facts derive from operations, that provenance attaches to every fact. The `OpEnvelope` carries it directly ([op-fact-schema-model](./op-fact-schema-model.md)):

| Provenance element  | Where it lives                                          | What it answers                                                                                                               |
| ------------------- | ------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| **Actor**           | `OpEnvelope.actor_id` → `aideon_actors`                 | _Who_ asserted it — a person, an import job, an AI process, or a connector run.                                               |
| **Source**          | The actor's `metadata_json` and the operation's context | _What kind_ of origin — manual authoring, file import, AI suggestion accepted, or connector sync.                             |
| **When (asserted)** | `OpEnvelope.asserted_at` (an `Hlc`)                     | _When_ the claim entered canonical history — the audit axis, totally ordered ([bitemporal-and-hlc](./bitemporal-and-hlc.md)). |

Provenance is the operation's **origin**, and the glossary keeps it strictly distinct from two neighbours it is easy to confuse ([`CONTEXT.md`](../../../CONTEXT.md), _Content classification_): it is **not** the [content classification](../../../CONTEXT.md) (the _kind_ of claim — Asserted / Inferred / Generated), and it is **not** confidence (a separate quality signal). A fact has a provenance, a content classification, and an asserted time independently.

### Provenance drives content classification

Although the two axes are distinct, the origin recorded by an operation _drives_ which content classification its fact carries — the classification is not free-floating, it follows from how the claim came to be ([Documentation Standard §9](../../02-standards/DOCUMENTATION-STANDARD.md)):

| Operation origin                                                                                              | Resulting content classification                                                      |
| ------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| A person authors a Change Event; an import or connector lands a claim; a Generated suggestion is **accepted** | **Asserted** — controlled truth, not silently overwritten by automation.              |
| The system derives a claim by declared rule, structure, or analytics                                          | **Inferred** — traceable to its inputs, recomputed when they change.                  |
| An LLM/ML process produces a draft, summary, or suggested mapping                                             | **Generated** — a suggestion until accepted; never treated as fact before acceptance. |

The acceptance path is the load-bearing case. A Generated claim is never mutated into an Asserted one in place: **acceptance is a new operation** that records an Asserted claim attributed to the accepting person, with the original Generated item kept as provenance ([`CONTEXT.md`](../../../CONTEXT.md), _Generated_). This is the same append-only discipline the op log applies everywhere — the Generated suggestion remains on the log, traceable, and the Asserted fact that supersedes it carries its own `op_id` and actor.

---

## Worked example — the identifiers and provenance of one seed fact

Trace the `disposition` claim on the seed `Application` `Automation Orchestrator`, asserted as `Migrate` effective the start of FY26 ([op-fact-schema-model](./op-fact-schema-model.md), worked example):

1. **The slot's symbol identifiers.** The claim targets the slot `(automation-orchestrator, disposition)`. The `disposition` attribute is a UUIDv5 symbol — in `core-v1.json` it is `cba320a9-7e3c-5597-b42f-284aad9a6406`, on the `Application` type `ab0aefe4-902f-5f99-8ce3-eae00286ebe0`. These are read from the committed seed, **not invented**, and Mneme stores them as `field_id` and `type_id` ([slots and effective schema](../../03-design/metamodel/slots-and-effective-schema.md), [sqlite](./SQLITE.md)).
2. **The instance identifier.** `Automation Orchestrator` is one entity instance, addressed by the domain key `n:application:automation-orchestrator`. The registry maps that key to a runtime `entity_id`; the rest of the product never sees the storage row reference ([packages and registry](../../03-design/metamodel/packages-and-registry.md)).
3. **The operation identifier and provenance.** An architect authoring a Change Event compiles it to a `SetProperty` operation. The `OpEnvelope` is minted with a fresh `op_id`, `actor_id` = the architect, and `asserted_at` = `Hlc::now()`. Source is manual authoring, so the derived fact is **Asserted** content.
4. **The fact and its links.** Mneme appends the operation, then derives the fact `disposition = "Migrate" [2026-01-01, null)`, `actual` layer, base case. The property-fact row's primary key carries the `op_id` from step 3, so the fact is traceable to its operation, its actor, and its asserted instant in one read ([sqlite](./SQLITE.md), property-fact key).
5. **A later AI-assisted correction.** Sophia ([planned](../../02-standards/DOCUMENTATION-STANDARD.md), §10) suggests `disposition = "Eliminate"`. As a suggestion it is **Generated** content and changes nothing. When a steward **accepts** it, a _new_ `SetProperty` operation is appended — a new `op_id`, the steward's `actor_id`, a larger HLC — deriving an **Asserted** fact that outranks `Migrate` at the latest belief. Neither the `Migrate` fact nor the Generated suggestion is deleted; both remain on the log, and a belief-pinned read still returns `Migrate` ([bitemporal-and-hlc](./bitemporal-and-hlc.md)).

One claim, four distinct identifier namespaces — symbol UUID, instance ID, op ID, and (via the registry) the domain key — and a provenance chain that survives every supersession.

> **Design intent.** Sophia, the module that produces Generated content under guardrails, is [planned](../../02-standards/DOCUMENTATION-STANDARD.md) (§10) — no crate exists yet. The acceptance path described here is the contract it will write through; the Asserted/Inferred/Generated axis and the append-on-acceptance rule are in force today for any producer of claims.

---

## References & standards

_Normative:_

- **RFC 9562** (obsoletes RFC 4122) — UUID, including version-5 name-based UUIDs. The minting scheme for metamodel symbol identifiers.
- Fowler; Young — **Event Sourcing & CQRS**. Provenance survives because the append-only log is truth; facts and their origins are derived, never overwritten.

## Related documents

| Document                                                                        | What it covers                                                           |
| ------------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| [The op / fact / schema model](./op-fact-schema-model.md)                       | The `OpEnvelope` these identifiers and this provenance ride on.          |
| [Bitemporal model and the HLC](./bitemporal-and-hlc.md)                         | The asserted-time axis and the op-id tie-break.                          |
| [SQLite specification](./SQLITE.md)                                             | Where `op_id`, `entity_id`, `actor_id`, and the symbol UUIDs are stored. |
| [Export, import, replay](./export-import-replay.md)                             | How `op_id` makes ingest idempotent and dependency-checked.              |
| [Packages and the registry](../../03-design/metamodel/packages-and-registry.md) | How UUIDv5 symbol IDs are minted and how the registry hides storage IDs. |
| [Metamodel ownership](../praxis/metamodel-ownership.md)                         | Why Praxis owns symbol identity and Mneme stores it.                     |
| [`CONTEXT.md`](../../../CONTEXT.md)                                             | Content classification, provenance, Asserted / Inferred / Generated.     |
