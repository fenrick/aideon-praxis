# Tasks and Change Events

How the twin is changed: through named tasks that compile into operations via a Change Event, never through free-form
graph mutation. This file states the authoring contract, how a task becomes operations, and why a multi-operation task
is atomic. For a reader who needs to know what happens between a user's intent and an appended operation.

---

## Tasks, not raw mutation

Users and consuming modules change the twin through named tasks — create an element, link two elements, set an
attribute, apply a planned change — not by writing graph nodes and edges directly. This is an invariant: the interaction
model is task-first, and a blank-canvas, raw-graph-first entry point is not exposed
([DESIGN.md](../../03-design/DESIGN.md)). A task carries domain-language validation on top of the structural rules, so
the user works in terms of capabilities and applications, not rows.

A task is the authoring surface; it does not itself persist. It is compiled into the canonical authoring object — a
[Change Event](../../../CONTEXT.md) — which captures intent and context (owner, rationale, source, approval state,
grouping, dependencies, lifecycle) and, when applied, compiles into one or more [operations](../../../CONTEXT.md). A
[Plan Event](../../../CONTEXT.md) is the Change Event subtype that authors a non-actual layer.

---

## From Change Event to operations

The chain is deliberate and one-directional:

```text
task (domain intent)
  → Change Event (intent + context + approval state)
    → operation(s) (canonical, append-only mutations)
      → Mneme op log (the only canonical store)
```

Each operation is one of the canonical mutations — create, update, delete, link, unlink — recorded in the op log with
its claim payload, valid-from, layer, scenario, provenance, and asserted time ([`CONTEXT.md`](../../../CONTEXT.md),
_Operation_). Praxis validates every operation against the compiled effective schema _before_ Mneme appends it:

- the entity type must be declared in the metamodel;
- a relationship's endpoints must exist and match the relationship's declared `from`/`to` type constraints
  ([edge catalogue](./edge-catalogue/constraints-and-rules.md));
- a relationship type that declares `allowSelf: false` rejects a self-referencing relationship, and one that declares
  `allowDuplicate: false` rejects a redundant relationship between the same endpoints;
- deleting an entity with live relationships is rejected — referential integrity holds at write time.

A validation failure stops the compile; no partial operation reaches the op log.

---

## Atomicity of multi-operation tasks

A single task often compiles into several operations — "apply a planned migration" might update an `Application`'s
`disposition`, add a `plan_effect` relationship from a `PlanEvent`, and set a date. The contract is that **a
multi-operation task is atomic**: either every operation in the task validates and is appended, or none is. There is no
state in which half a task landed.

Atomicity rests on two things. First, validation runs against the _whole_ operation set before any append, so an
endpoint created earlier in the same task is visible to a relationship created later in it, and a violation anywhere
rejects the whole set. Second, the append is ordered behind a single-writer discipline in Mneme, so a concurrent write
that would invalidate the task surfaces as a conflict rather than a silent interleave
([canonical vs derived](../../01-architecture/boundary/canonical-vs-derived.md)). A task that races another and loses is
reported as a conflict, not applied partially.

The trade-off this closes: a very large task cannot stream its operations to storage incrementally — it is validated and
committed as a unit, which bounds how large a single task should be. Bulk ingestion that genuinely needs streaming is an
import job, not a task ([accepted work and events](../../04-contracts/ACCEPTED-WORK-AND-EVENTS.md)).

---

## Worked example — applying the FY26 channel cutover

From the [baseline](../../data/base/baseline.yaml), the `PlanEvent` **FY26 Q2 Channel Cutover**
(`n:plan-event:fy26-channel-cutover`, `effective_at = 2026-05-01`) authors two `plan_effect` relationships:

- `e:plan-cutover-capability`: `plan_effect` to `n:capability:journey-orchestration` with `op = link`;
- `e:plan-cutover-application`: `plan_effect` to `n:application:journey-studio` with `op = update`.

Authoring this as one task produces one Change Event of subtype Plan Event, which compiles to the two `plan_effect`
operations on the `plan` layer. Praxis validates both before append: each `plan_effect` must originate from a
`PlanEvent` and carry the required `op` and `target_ref` attributes ([edge catalogue](./edge-catalogue/catalogue.md)).
If either fails — say `target_ref` is missing — neither operation is appended and the task is reported as a validation
failure. If both pass, both are appended atomically, and the twin resolves the produced facts at any viewpoint whose
as-of valid time is on or after `2026-05-01`.

---

## Related documents

| Document                                                                             | What it covers                                                      |
| ------------------------------------------------------------------------------------ | ------------------------------------------------------------------- |
| [Edge catalogue — constraints and rules](./edge-catalogue/constraints-and-rules.md)  | The structural rules every relationship write is validated against. |
| [Temporal and scenario context](../../04-contracts/TEMPORAL-AND-SCENARIO-CONTEXT.md) | The commit and scenario contract tasks resolve against.             |
| [Merge and conflict](./merge-and-conflict.md)                                        | How a task that races and loses is surfaced.                        |
| [Mneme module](../mneme/README.md)                                                   | The op log a Change Event compiles into.                            |
| [`CONTEXT.md`](../../../CONTEXT.md)                                                  | Change Event, Plan Event, operation — the canonical definitions.    |
| [`baseline.yaml`](../../data/base/baseline.yaml)                                     | The seed dataset the example uses.                                  |
