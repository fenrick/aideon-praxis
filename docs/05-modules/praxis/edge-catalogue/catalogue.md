# Catalogue

The five canonical relationships, with their real directions, endpoints, attributes, cardinality, validation, and
ArchiMate 3.2 mapping — read directly from [`docs/data/meta/core-v1.json`](../../../data/meta/core-v1.json). A worked
example walks three of them through resolution at a viewpoint.

---

## The five relationships

| `id`          | Direction       | From                                 | To                                                                    | Attributes                                                                                      | Cardinality    | Validation              | ArchiMate 3.2                                  |
| ------------- | --------------- | ------------------------------------ | --------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- | -------------- | ----------------------- | ---------------------------------------------- |
| `serves`      | source → target | `Capability`                         | `ValueStreamStage`                                                    | —                                                                                               | many-to-many   | `allowSelf: false`      | **Serving**                                    |
| `realises`    | source → target | `Application`, `TechnologyComponent` | `Capability`, `BusinessProcess`                                       | —                                                                                               | many-to-many   | —                       | **Realization**                                |
| `accesses`    | source → target | `BusinessProcess`, `Application`     | `DataEntity`                                                          | `mode` enum [read, write, readwrite], **required**                                              | (many-to-many) | `allowDuplicate: false` | **Access** (access-type read/write/read-write) |
| `hosts`       | source → target | `TechnologyComponent`                | `Application`                                                         | —                                                                                               | many-to-many   | —                       | **Assignment** (technology layer)              |
| `plan_effect` | source → target | `PlanEvent`                          | `Capability`, `BusinessProcess`, `Application`, `TechnologyComponent` | `op` enum [create, update, delete, link, unlink] **required**; `target_ref` string **required** | (many-to-many) | —                       | Implementation & Migration **planned change**  |

Cardinality values in parentheses are not stated explicitly in the seed for `accesses` and `plan_effect`; the compiler
default applies. `serves` and `accesses` are the two relationships the seed gives explicit structural rules. `accesses`
and `plan_effect` are the two that carry attribute slots — facts on the relationship itself
([`CONTEXT.md`](../../../../CONTEXT.md), _Relationship_).

---

## Attribute detail

### `accesses.mode`

| Attribute | Type | Values                       | Required |
| --------- | ---- | ---------------------------- | -------- |
| `mode`    | enum | `read`, `write`, `readwrite` | yes      |

`mode` is the ArchiMate Access _access-type_. Enum matching is case-insensitive
([validation rules](../../../03-design/metamodel/validation-rules.md)).

### `plan_effect.op` and `plan_effect.target_ref`

| Attribute    | Type   | Values                                         | Required |
| ------------ | ------ | ---------------------------------------------- | -------- |
| `op`         | enum   | `create`, `update`, `delete`, `link`, `unlink` | yes      |
| `target_ref` | string | identifier of the affected entity              | yes      |

`op` mirrors the `effectTypes` declared on the `PlanEvent` type. A `plan_effect` is how a
[Plan Event](../../../../CONTEXT.md) records the change it intends to make to a target element.

---

## ArchiMate alignment, relationship by relationship

Each direction matches the cited ArchiMate 3.2 relationship's semantics (The Open Group, ArchiMate 3.2 Specification):

- **`serves` → Serving.** Serving points from the provider to the served. A `Capability` provides the ability a
  `ValueStreamStage` consumes.
- **`realises` → Realization.** Realization points from the concrete realiser to the abstract realised. An `Application`
  realises a `Capability`.
- **`accesses` → Access.** Access points from the active/behaviour element to the data object; `mode` carries the
  read/write/read-write access type the standard defines.
- **`hosts` → Assignment.** On the technology layer, Assignment expresses that an active structure element (the
  `TechnologyComponent`) hosts/runs a behaviour or application element (the `Application`). This is the deliberate
  reverse of the superseded `deployed_on` ([superseded names](./superseded-names.md)).
- **`plan_effect` → Implementation & Migration.** A planned change emanating from a Work-Package-like `PlanEvent`,
  carrying the operation and the affected target.

---

## Worked example

The starting facts, from [`docs/data/base/baseline.yaml`](../../../data/base/baseline.yaml):

- `n:capability:customer-insight` — `Capability`, `tier = Strategic`.
- `n:valuestream-stage:discover` — `ValueStreamStage`, `Discover`.
- `n:application:insight-hub` — `Application`, `disposition = Invest`, `lifecycle = Run`.
- `n:data-entity:customer-profile` — `DataEntity`, `sensitivity = Internal`.
- `n:technology:stream-processor` — `TechnologyComponent`, `deployment = PaaS`.

The relationships:

- `e:capability-serves-discover`: `customer-insight` **serves** `discover`, `confidence: 0.95`.
- `e:insight-realises-insight`: `insight-hub` **realises** `customer-insight`, `criticality: High`.
- `e:insight-accesses-profile`: `insight-hub` **accesses** `customer-profile`, `mode: readwrite`.
- `e:stream-hosts-insight`: `stream-processor` **hosts** `insight-hub`.

**The viewpoint.** As-of valid time = 2026-06-11 (today); as-of asserted time = latest; layer = actual; scenario = base
case; scope = the subgraph reachable from `customer-insight` within 3 hops ([`CONTEXT.md`](../../../../CONTEXT.md),
_Viewpoint_).

**Resolution, step by step:**

1. **Validate endpoints.** `serves`: `Capability → ValueStreamStage` ✔. `realises`: `Application → Capability` ✔.
   `accesses`: `Application → DataEntity`, `mode` present ✔. `hosts`: `TechnologyComponent → Application` ✔.
2. **Resolve facts at the viewpoint.** Each relationship is a [fact](../../../../CONTEXT.md) with a valid-time interval.
   All four have open-ended validity (`valid_to` null) in the actual layer, base case, so each holds at 2026-06-11. None
   is superseded; each [effective interval](../../../../CONTEXT.md) covers the as-of instant.
3. **Build the effective graph.** The resolved subgraph: `Discover` ← (serves) ← `Customer Insight` ← (realises) ←
   `Insight Hub` → (accesses, readwrite) → `Customer Profile`, with `Stream Processor` → (hosts) → `Insight Hub`. This
   is the [effective graph](../../../../CONTEXT.md) at this viewpoint.
4. **Spine reading.** Walking _up_ from `Insight Hub`: it realises `Customer Insight`, which serves `Discover` (the
   Value role). The Intent role above `Discover` is **PLANNED**
   ([spine-to-seed types](../../../03-design/semantic-spine/spine-to-seed-types.md)), so an upward explanation stops
   with a Bounded note.

**The result.** A four-relationship subgraph, all facts **Fresh** (computed against current canonical material), all
**Asserted** (seeded by an explicit baseline commit). The `serves` relationship carries `confidence: 0.95` and
`realises` carries `criticality: High` as relationship slots. The integrity reading of this subgraph and its Bounded
upper-spine note is walked in
[how the spine drives integrity and explainability](../../../03-design/semantic-spine/how-the-spine-drives-integrity-and-explainability.md#worked-example---explaining-customer-insight).

---

## References & standards

_Normative:_

- The Open Group — **ArchiMate 3.2 Specification**. Serving, Realization, Access, Assignment and the Implementation &
  Migration layer.

## Related documents

| Document                                                                 | What it covers                      |
| ------------------------------------------------------------------------ | ----------------------------------- |
| [Superseded names](./superseded-names.md)                                | The old→new relationship mapping.   |
| [Temporal model](./temporal-model.md)                                    | Relationships as first-class facts. |
| [Constraints and rules](./constraints-and-rules.md)                      | The rules enforced on every write.  |
| [Relationship types](../../../03-design/metamodel/relationship-types.md) | The metamodel-layer projection.     |
| [`baseline.yaml`](../../../data/base/baseline.yaml)                      | The seed dataset the example uses.  |
