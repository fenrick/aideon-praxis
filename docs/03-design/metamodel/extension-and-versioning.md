# Extension and versioning

How the metamodel evolves: Semantic Versioning per [ADR-0017](../../06-adrs/ADRS.md), forward-only evolution, and the rules by which a package extends the model per partition. For a reader who needs to add a type, attribute, or relationship without breaking an existing workspace.

---

## SemVer governs the document version

The metamodel document carries a `version` string (the seed is `1.0.0`). It follows **Semantic Versioning 2.0.0** (Semantic Versioning 2.0.0; [ADR-0017](../../06-adrs/ADRS.md)):

| Change                                                                                                            | SemVer bump | Why                                                            |
| ----------------------------------------------------------------------------------------------------------------- | ----------- | -------------------------------------------------------------- |
| Add a new type, relationship, or optional attribute                                                               | **minor**   | Additive; existing instances still validate.                   |
| Relax a rule (e.g. raise `string.maxLength`)                                                                      | **minor**   | Previously valid data stays valid.                             |
| Remove or rename a published `id`; change a UUID; change an attribute kind; tighten a rule so existing data fails | **major**   | Breaking — identity or validity of existing instances changes. |
| Editorial change with no effect on validity (labels, descriptions)                                                | **patch**   | No structural effect.                                          |

Overlay packages must align on the same `version` string as the base, or the merge is a hard error ([packages and the registry](./packages-and-registry.md)). This is deliberately strict: it stops a partition from silently mixing two incompatible language versions.

---

## Evolution is forward-only

Schema evolution is forward-only; the mechanism is explicit, op-based migration, never an in-place rewrite of history ([DESIGN.md](../DESIGN.md), evolution rules; [ADR-0009](../../06-adrs/ADR-0009-temporal-model-valid-interval-layer-policy-viewpoint.md)). The append-only operation log is canonical, so a schema change is itself recorded as operations: existing facts are never edited in place, and a migration writes new facts (or supersedes old ones by closing their valid-time intervals) rather than mutating them.

The trade-off this closes: it forecloses the convenience of "just edit the old schema". In exchange, any past [viewpoint](../../../CONTEXT.md) remains resolvable — "show the model as the schema stood last quarter" is always answerable, because the schema's own history is preserved like any other fact.

---

## How a package extends per partition

A package extends the model by being installed as an overlay in a [partition](../DESIGN.md) ([packages and the registry](./packages-and-registry.md)). The permitted extensions, and the rules that keep them non-breaking:

- **A new type** with a previously unused `id` may be added freely. Its UUID is minted by the compiler ([packages and the registry](./packages-and-registry.md)), never assigned by hand.
- **A new relationship** between existing types may be added freely, with its own endpoints and attributes.
- **A new optional attribute** may be appended to an existing type.
- **A required attribute may not be added** to an existing type in a minor version: existing instances lack it and would fail validation. Adding one is a major change with a migration.
- **No published `id` or UUID is removed or renamed** without a major version and a migration.
- **No published attribute kind is changed.**
- **Inheritance cycles are rejected** at load time.

A rename is modelled as remove-plus-add: the old `id` is retired (major) and a new `id` is introduced, with a migration mapping instances across. There is no in-place rename, because the UUID is derived from the name and would change ([packages and the registry](./packages-and-registry.md)).

---

## Worked example — adding a Motivation layer

The [proposed spine-extension package](./proposed-spine-extension.md) is a worked instance of these rules: it adds new types (`Driver`, `Goal`, `Outcome`, …) and new relationships (`influences`, `serves` from Outcome, …) — all additive, all minor-version changes against the seed, with UUID minting deferred to the compiler. It is marked **PROPOSED** because it has not been authored into `core-v1.json`; documenting it does not make it exist.

---

## References & standards

_Normative:_

- **Semantic Versioning 2.0.0**. The version-bump rules — [ADR-0017](../../06-adrs/ADRS.md).
- **RFC 9562** — UUIDv5. Why a rename changes identity.

## Related documents

| Document                                                                          | What it covers                                       |
| --------------------------------------------------------------------------------- | ---------------------------------------------------- |
| [Packages and the registry](./packages-and-registry.md)                           | How packages merge and how UUIDs are minted.         |
| [Validation rules](./validation-rules.md)                                         | What "existing data stays valid" is checked against. |
| [Proposed spine extension](./proposed-spine-extension.md)                         | A worked additive package (PROPOSED).                |
| [Edge catalogue extensions](../../05-modules/praxis/edge-catalogue/extensions.md) | How relationship extensions are marked.              |
