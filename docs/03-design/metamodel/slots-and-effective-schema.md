# Slots and the effective schema

What a slot is, how inheritance flattens the authored metamodel into a compiled effective schema, and a worked compilation using a seed type. For a reader who has seen the [type tables](./entity-types.md) and now needs to understand how a type's full rule set is derived.

---

## A slot is the addressable claim target

A **slot** is the stable question a [fact](../../../CONTEXT.md) answers — independent of the value, valid time, asserted time, layer, and scenario. An attribute, a relationship, a membership, a classification, or a metric is each a _kind_ of slot, never the definition of one ([`CONTEXT.md`](../../../CONTEXT.md), _Slot_).

In the seed, slots appear in two places:

- **Attribute slots** on an entity type — `Capability.tier`, `Application.disposition`, `DataEntity.sensitivity`.
- **Attribute slots on a relationship** — `accesses.mode`, `plan_effect.op`, `plan_effect.target_ref`. Because a [relationship](../../../CONTEXT.md) is itself addressable, these are slots on the relationship, with facts over time, not slots on either endpoint.

A slot defines a resolution key: facts about the same slot compete or compose according to that slot's cardinality and resolution rule. This is why "field", "attribute", and "cell" are the terms the glossary marks `_Avoid_` — each names one kind of slot, not the general claim target.

---

## Inheritance: `extends`

A type may name a parent with `extends`. In the seed, only one type does: `ValueStreamStage` declares `"extends": "Stage"`. A type's effective attribute set is its parent's recursively flattened set, overridden by its own declarations. Inheritance is single (one parent), resolved depth-first, and cycles are a hard error rejected at load time.

> **Honest-state note.** The seed declares `ValueStreamStage extends Stage`, but `core-v1.json` does **not** declare a `Stage` type. As written, compiling `ValueStreamStage` requires a `Stage` definition to be supplied by an overlay package, or the `extends` reference is unresolved. This is a known gap in the seed; it is flagged here rather than papered over, per the [Documentation Standard §9](../../02-standards/DOCUMENTATION-STANDARD.md). The reconciliation is to either declare `Stage` as an abstract base type in a package or drop the `extends` clause. Until then, `ValueStreamStage`'s own attributes (`name`, `purpose`, `owner`) are its effective set.

---

## Compilation to an effective schema

The [effective schema](../../../CONTEXT.md) is the compiled, flattened slot-and-rule set for a single type after inheritance and metamodel rules are applied. It is derived and used by validation and resolution; it is never authored directly. The compiler:

1. resolves `extends` depth-first, flattening parent attributes into the child;
2. overlays the child's own attribute declarations (a same-named child attribute wins);
3. attaches the global [validation rules](./validation-rules.md) (string/text length, enum case-insensitivity) and any per-type required flags;
4. records each slot's stable `uuid` for identity ([packages and the registry](./packages-and-registry.md)).

The result is the per-type set that `validate_node` checks every write against. Resolution reads the same set to know which slots a type carries and their cardinality.

---

## Worked compilation — `Capability`

`Capability` declares no `extends`, so its effective schema is exactly its own declarations from [`core-v1.json`](../../data/meta/core-v1.json):

| Slot        | Kind   | Required | Enum / constraint                                  | Stable `uuid` (from seed)              |
| ----------- | ------ | -------- | -------------------------------------------------- | -------------------------------------- |
| `name`      | string | **yes**  | ≤ 256 chars                                        | `89efcd94-5145-5439-8023-9424c6c381f8` |
| `tier`      | enum   | no       | Strategic \| Core \| Supporting (case-insensitive) | `c27ee320-dea9-5263-b362-d94c4a22bb77` |
| `lifecycle` | enum   | no       | Target \| Current \| Retire (case-insensitive)     | `23917fa3-e91c-57af-9650-9e8e58b1d18a` |

A write creating `n:capability:customer-insight` with `name = "Customer Insight"`, `tier = "Strategic"` is checked against this effective schema: `name` present and ≤ 256 ✔; `tier` matches an enum variant ✔ (and would match `"strategic"` too, by case-insensitivity); `lifecycle` absent is allowed (not required). The write validates. A write with `tier = "Tactical"` fails the enum check and is rejected as a typed `ValidationFailed` error.

The UUID column is read from the seed and **not invented**: these are the values `core-v1.json` commits. How they are minted is [explained here](./packages-and-registry.md).

---

## References & standards

_Normative:_

- The Open Group — **ArchiMate 3.2 Specification**. Specialization (the inheritance relationship the `extends` clause models).
- Fowler; Young — **Event Sourcing & CQRS**. Derived read models — the effective schema is derived from the authored document.

## Related documents

| Document                                                | What it covers                                                |
| ------------------------------------------------------- | ------------------------------------------------------------- |
| [What the metamodel is](./what-is-the-metamodel.md)     | The authored vs compiled distinction.                         |
| [Entity types](./entity-types.md)                       | The attribute slots each type declares.                       |
| [Packages and the registry](./packages-and-registry.md) | How the compiled batch is published and how UUIDs are minted. |
| [Validation rules](./validation-rules.md)               | The rules the effective schema enforces on write.             |
