# Temporal model

How relationships behave in time: each is a first-class [fact](../../../../CONTEXT.md) with a valid-time interval, an
obsolete relationship is closed not deleted, and a planned future relationship is expressed via `plan_effect` in a
scenario. This aligns the catalogue with the product's bitemporal model
([ADR-0009](../../../06-adrs/ADR-0009-temporal-model-valid-interval-layer-policy-viewpoint.md)).

---

## A relationship is a first-class fact

A relationship is not a boolean that is either present or absent. It is a fact carrying a value, its
[slots](../../../03-design/metamodel/slots-and-effective-schema.md), a [layer](../../../../CONTEXT.md), a
[scenario](../../../../CONTEXT.md), a **valid-time** interval `[valid_from, valid_to)`, and an **asserted time**
([`CONTEXT.md`](../../../../CONTEXT.md), _Fact_). A relationship therefore _holds over a span_, and its own attributes
(`accesses.mode`, the `confidence` on a `serves` instance) are themselves facts that can change over time without the
relationship being recreated.

Resolution treats relationships exactly like other facts: a [viewpoint](../../../../CONTEXT.md) returns only the
relationships whose effective interval intersects the as-of valid time, under the chosen layer policy and scenario. Two
snapshots at different valid times can therefore show different relationship sets from the same canonical log
([Snodgrass, _Developing Time-Oriented Database Applications in SQL_, 1999](../../../02-standards/STANDARDS-REGISTER.md);
interval reasoning per Allen, 1983).

---

## Closing intervals, not deleting

A relationship that held in the past and no longer holds is **not deleted**. Its validity is _closed_: a later operation
sets its `valid_to`, so it stops applying at that instant but remains in history. Asking for a past viewpoint still
shows it; asking for now does not.

This is a direct consequence of the append-only operation log being canonical
([DESIGN.md](../../../03-design/DESIGN.md), axiom 2): history is never rewritten, so "delete" is modelled as "this claim
stopped being true at time T", not as erasure. The trade-off is storage and resolution cost — closed relationships are
kept and must be filtered out at read time — accepted because it makes every past state auditable and reconstructable.

---

## Planned future relationships via `plan_effect`

A relationship that is _expected_ to come into existence as a result of a planned change is not asserted into the actual
layer ahead of time. It is expressed through a [`plan_effect`](./catalogue.md) relationship originating from the
relevant [Plan Event](../../../../CONTEXT.md), with `op = link` and a `target_ref`, materialised in the appropriate
non-actual layer or [scenario](../../../../CONTEXT.md).

From the [baseline](../../../data/base/baseline.yaml): `e:plan-cutover-capability` is a `plan_effect` from
`n:plan-event:fy26-channel-cutover` to `n:capability:journey-orchestration` with `op: link`,
`target_ref: n:capability:journey-orchestration`, and the Plan Event's `effective_at` is `2026-05-01`. This records the
_intent_ to create a link; the twin resolves the produced facts, not the Plan Event directly
([`CONTEXT.md`](../../../../CONTEXT.md), _Plan Event_). The link becomes part of the actual layer only when the change
is realised by an operation, not by the existence of the plan.

This keeps Plan and Actual cleanly separated: a viewpoint on the actual layer never sees a relationship that has only
been planned, while a viewpoint on the plan layer or the relevant scenario does — which is what variance analysis (plan
vs actual) requires.

---

## Worked example — a relationship over time

`e:insight-accesses-profile` (`insight-hub` **accesses** `customer-profile`, `mode: readwrite`) is asserted with
open-ended validity in the actual layer. Three later situations:

1. **The access narrows to read-only from 2027.** A later operation does not edit the fact in place; it writes a new
   `accesses` fact (or updates the `mode` slot from a new valid-from), and the original `readwrite` claim's effective
   interval becomes `[seed, 2027)`. A viewpoint at 2026 resolves `readwrite`; one at 2028 resolves `read`.
2. **The access ends.** A later operation closes the relationship's `valid_to` at the decommission date. A "now"
   viewpoint omits it; a viewpoint before the date still shows it.
3. **A future access is planned.** A `plan_effect` from a Plan Event records `op: link` to a new `DataEntity`; the
   actual layer does not show the access until the plan is realised.

---

## References & standards

_Normative:_

- The temporal model — **[ADR-0009](../../../06-adrs/ADR-0009-temporal-model-valid-interval-layer-policy-viewpoint.md)**
  (valid-interval, layer-as-policy, viewpoint).
- Snodgrass — _Developing Time-Oriented Database Applications in SQL_, 1999. Bitemporal valid vs asserted time.
- Allen — _Maintaining Knowledge about Temporal Intervals_, 1983. Interval relations for intersection/containment.

## Related documents

| Document                                            | What it covers                                                |
| --------------------------------------------------- | ------------------------------------------------------------- |
| [Catalogue](./catalogue.md)                         | The relationships and their attributes.                       |
| [Constraints and rules](./constraints-and-rules.md) | The write contract, including required time/scenario context. |
| [`CONTEXT.md`](../../../../CONTEXT.md)              | Fact, valid time, layer, scenario, Plan Event.                |
