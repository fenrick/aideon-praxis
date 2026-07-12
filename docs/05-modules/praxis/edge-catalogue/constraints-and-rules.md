# Constraints and rules

The rules the Rust core enforces on every relationship write, and the context a write must supply. Integrity and
validation are authoritative in the core; client-side checks are UX feedback only ([Praxis README](../README.md)). The
rules below are read from [`core-v1.json`](../../../data/meta/core-v1.json) and the
[validation rules](../../../03-design/metamodel/validation-rules.md).

---

## Enforced rules

1. **The relationship `type` must be one of the five canonical relationships** ([catalogue](./catalogue.md)). A
   relationship of an unknown type is rejected.
2. **Endpoints must respect `from`/`to`.** The source entity's type must be in the relationship's `from` set and the
   target's in its `to` set. For example, `serves` accepts only `Capability → ValueStreamStage`; an `Application` source
   is rejected.
3. **`serves` forbids self-links** (`allowSelf: false`). A `serves` relationship from an entity to itself is rejected.
4. **`accesses` forbids duplicates** (`allowDuplicate: false`). A second `accesses` between the same source and target
   is rejected.
5. **Required relationship attributes must be present.** `accesses.mode` is required; `plan_effect.op` and
   `plan_effect.target_ref` are required. A write missing one is rejected.
6. **Attribute values are checked** against kind, length, and enum rules under the global validation block (enum
   matching is case-insensitive) ([validation rules](../../../03-design/metamodel/validation-rules.md)).
7. **`plan_effect` originates only from a `PlanEvent`** — the only type in its `from` set. No other entity may be the
   source of a planned change.
8. **Referential integrity holds.** Both endpoints must exist; deleting an entity with live relationships is rejected
   rather than left dangling.

The seed does **not** declare `allowSelf` or `allowDuplicate` for `realises`, `hosts`, or `plan_effect`; their
structural behaviour is the compiler default unless an [extension](./extensions.md) adds a rule. This is stated rather
than assumed, so a reader does not infer a constraint the seed does not carry.

---

## The write contract

Any operation that creates or updates a relationship must supply:

- the relationship `id` (one of the five canonical relationships);
- the source entity identifier and the target entity identifier;
- all required relationship attributes (`mode` for `accesses`; `op` and `target_ref` for `plan_effect`);
- explicit **valid-time** bounds, or an open upper bound for an ongoing relationship
  ([temporal model](./temporal-model.md));
- an explicit **scenario** context (the base case if none is named);
- the **layer** the write targets (actual, plan, or another).

Time and scenario are model-level context, not UI filters ([DESIGN.md](../../../03-design/DESIGN.md), axiom 3); a
relationship write without them is incomplete.

---

## How these rules feed the integrity score

These rules are what the **Consistency** dimension of the
[integrity score](../../../02-standards/DOCUMENTATION-STANDARD.md) (§8.1) reads: a subgraph that violates none of them
scores well on Consistency. Endpoint and direction conformance also feed **Connectivity** — a relationship pointing the
wrong way, or an entity orphaned where the [spine](../../../03-design/semantic-spine/the-spine.md) expects a link,
lowers the score ([ADR-0020](../../../06-adrs/ADR-0020-integrity-scoring-model.md)). The rules are enforced _at write
time_ (a violation is rejected) and _read again at score time_ (the score reflects structural gaps the rules permit but
the spine discourages).

---

## References & standards

_Normative:_

- The Open Group — **ArchiMate 3.2 Specification**. Endpoint constraints follow each relationship's defined
  source/target element types.
- **JSON Schema 2020-12**. Attribute kind/length/enum validation.
- The integrity-scoring model — **[ADR-0020](../../../06-adrs/ADR-0020-integrity-scoring-model.md)**.

## Related documents

| Document                                                             | What it covers                                         |
| -------------------------------------------------------------------- | ------------------------------------------------------ |
| [Catalogue](./catalogue.md)                                          | The five relationships and their endpoints/attributes. |
| [Validation rules](../../../03-design/metamodel/validation-rules.md) | The metamodel-layer statement of the same checks.      |
| [Temporal model](./temporal-model.md)                                | The time/scenario context every write supplies.        |
| [Extensions](./extensions.md)                                        | How additional rules arrive via extension packages.    |
