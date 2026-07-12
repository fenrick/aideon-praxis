# Validation rules

The validation rules the seed metamodel declares, and how they are enforced on every write. Read directly from the
`validation` block of [`docs/data/meta/core-v1.json`](../../data/meta/core-v1.json). Validation is authoritative in the
Rust core; client-side checks are UX feedback only and the core never defers to them.

---

## Global attribute rules

| Rule                 | Value in the seed | Applies to                                                                                             |
| -------------------- | ----------------- | ------------------------------------------------------------------------------------------------------ |
| `string.maxLength`   | **256**           | every `string` attribute (e.g. all `name` slots, `Application.vendor`, `TechnologyComponent.provider`) |
| `text.maxLength`     | **4096**          | every `text` attribute (`BusinessProcess.description`, `MetaModelEntry.payload`)                       |
| `enum.caseSensitive` | **false**         | every `enum` attribute on a type or relationship                                                       |

Case-insensitivity means `tier = "strategic"` matches the declared variant `Strategic`. The matched value is checked
against the declared variant list; an unlisted value is rejected.

---

## Per-relationship structural rules

The seed declares two structural rules ([relationship types](./relationship-types.md)):

| Relationship | Rule             | Value     | Effect                                                                           |
| ------------ | ---------------- | --------- | -------------------------------------------------------------------------------- |
| `serves`     | `allowSelf`      | **false** | A `serves` relationship from an entity to itself is rejected.                    |
| `accesses`   | `allowDuplicate` | **false** | A second `accesses` relationship between the same source and target is rejected. |

The seed does not declare `allowSelf` or `allowDuplicate` for `realises`, `hosts`, or `plan_effect`; their structural
behaviour is the compiler default unless an overlay package adds a rule.

---

## How a write is validated

`validate_node` and `validate_edge` run at write time against the compiled registry
([packages and the registry](./packages-and-registry.md)).

**Node (entity) validation:**

1. the `type` must match a known type descriptor;
2. every value is type-checked against its attribute kind ([entity types](./entity-types.md));
3. required attributes must be present and non-null;
4. string and text lengths are checked against the global rules;
5. enum values are matched against the declared variant list under the case-insensitivity rule.

**Edge (relationship) validation:**

1. the relationship `type` must match a known relationship descriptor;
2. the source entity's type must appear in the relationship's `from` set;
3. the target entity's type must appear in the relationship's `to` set;
4. `allowSelf` and `allowDuplicate` are applied where declared;
5. relationship attributes (e.g. `accesses.mode`, `plan_effect.op` and `target_ref`) undergo the same
   kind/length/enum/required checks as entity attributes.

A failure is a typed `ValidationFailed` error with a human-readable message, surfaced directly to the UI without
exposing internals.

---

## Worked example — accepted and rejected writes

Against the seed and [baseline](../../data/base/baseline.yaml):

- **Accepted.** Create `accesses` from `n:application:insight-hub` to `n:data-entity:customer-profile` with
  `mode = "readwrite"`. Source `Application` ∈ `accesses.from` ✔; target `DataEntity` ∈ `accesses.to` ✔; required `mode`
  present and a valid enum variant ✔. No prior `accesses` between this pair, so `allowDuplicate: false` is satisfied ✔.
- **Rejected — duplicate.** A second `accesses` between the same `insight-hub` and `customer-profile` pair fails on
  `accesses.allowDuplicate = false`.
- **Rejected — missing required attribute.** An `accesses` with no `mode` fails: `mode` is required on the relationship.
- **Rejected — self-link.** A `serves` from `n:capability:customer-insight` to itself fails on
  `serves.allowSelf = false`.
- **Rejected — bad enum.** A `Capability` with `tier = "Tactical"` fails the enum match: `Tactical` is not a declared
  variant of `tier`.

How these rules feed the **Consistency** dimension of the
[integrity score](../../02-standards/DOCUMENTATION-STANDARD.md) (§8.1) is set out in
[how the spine drives integrity and explainability](../semantic-spine/how-the-spine-drives-integrity-and-explainability.md).

---

## References & standards

_Normative:_

- **JSON Schema 2020-12**. The validation vocabulary for attribute kinds and constraints.
- The Open Group — **ArchiMate 3.2 Specification**. Endpoint constraints follow each relationship's defined
  source/target element types.

## Related documents

| Document                                                                                 | What it covers                                             |
| ---------------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| [Entity types](./entity-types.md)                                                        | The attribute kinds and enums these rules check.           |
| [Relationship types](./relationship-types.md)                                            | The endpoint sets edge validation checks against.          |
| [Constraints and rules](../../05-modules/praxis/edge-catalogue/constraints-and-rules.md) | The module-level statement of the same relationship rules. |
| [`core-v1.json`](../../data/meta/core-v1.json)                                           | The `validation` block these tables read from.             |
