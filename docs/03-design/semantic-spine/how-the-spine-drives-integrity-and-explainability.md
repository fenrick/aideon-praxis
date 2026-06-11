# How the spine drives integrity and explainability

How the semantic spine is used: as the expectation the [integrity score](../../02-standards/DOCUMENTATION-STANDARD.md) (§8.1) measures against, and as the path explanations follow. For a reader implementing scoring or explanation surfaces.

---

## The spine is the integrity score's expectation

The [integrity score](../../02-standards/DOCUMENTATION-STANDARD.md) (§8.1) is a number in `[0.0, 1.0]`, **Inferred** content, defined by [ADR-0020](../../06-adrs/ADR-0020-integrity-scoring-model.md) across five dimensions. Two of those dimensions read the spine directly:

| Dimension        | How the spine informs it                                                                                                                                                                  |
| ---------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Completeness** | Are the slots and relationships the metamodel _and the spine_ expect actually present? A `Capability` with no `serves` link and no `realises` inbound is incomplete against the spine.    |
| **Connectivity** | Is the content reachable along the expected spine, with no orphan where the spine requires a link? An `Application` that realises nothing is an orphan at the Technology→Capability link. |

The other three dimensions — **Recency**, **Consistency**, **Corroboration** — are not spine-shaped: Consistency reads the [validation rules](../metamodel/validation-rules.md), Recency reads freshness policy, Corroboration reads provenance. The spine is the structural backbone of the score, not the whole score.

The composite is a weighted mean with a default gate threshold below which dependent analytics declare themselves **Bounded** (Documentation Standard §8.1, §9). A score is never shown without the ability to drill into its five dimensions.

---

## Scoring honestly when a spine role is absent

The spine asks for more than the seed implements ([spine-to-seed types](./spine-to-seed-types.md)): there is no Intent type, and Value is only partial. The scoring policy must not penalise an entity for failing to link to a role that _cannot be modelled_. The rule, therefore:

> The spine expectation is scoped to the roles the active metamodel can instantiate. A missing role with no type (today: Intent) is recorded as a **Bounded** coverage note on the score, not as a per-entity Completeness gap.

This keeps the score honest in both directions: it does not silently lower the bar to match a thin seed (the Bounded note tells the user the upper spine is unmodellable), and it does not punish every capability identically for a gap no user can close. When the [proposed spine-extension package](../metamodel/proposed-spine-extension.md) lands, the scope widens and the Bounded note is removed.

---

## The spine is the path explanations follow

Explainability traces along the spine. The two canonical directions:

- **"Why does this matter?"** walks _up_ the spine, toward the more abstract role: from an `Application`, along `realises`, to the `Capability` it realises, and (when Intent is modelled) onward to the Goal it serves.
- **"What does this affect?"** walks _down_: from a `Capability`, along inbound `realises` to the `Application`s that realise it, then along `hosts` to the `TechnologyComponent`s beneath them, then along `accesses` to the `DataEntity`s touched.

Both are **bounded** traversals with explicit fanout, depth, and size limits ([DESIGN.md](../DESIGN.md), axiom 10); a result that hits a limit is marked **Partial / Bounded** (Documentation Standard §9).

---

## Worked example — explaining Customer Insight

Using the [baseline](../../data/base/baseline.yaml) and the [edge catalogue worked example](../../05-modules/praxis/edge-catalogue/catalogue.md#worked-example):

**"Why does Customer Insight matter?"** Trace up from `n:capability:customer-insight`:

1. `Customer Insight` **serves** `Discover` (a `ValueStreamStage`) — the Value role it supports. ✔
2. Intent (a Goal behind `Discover`) is **PLANNED**, so the trace stops here with a Bounded note: _"upper spine (Intent) not modelled in this workspace."_

**Integrity of Customer Insight (illustrative):** Completeness is high (it has a `name`, a `tier`, and a `serves` link), Connectivity is high (it is realised by `Insight Hub` via `realises`, and serves `Discover`), Consistency is clean (no validation violation), but the spine coverage is Bounded at the Intent end. The composite is shown with the five-dimension drill-down and the Bounded coverage note — never as an opaque number ([ADR-0020](../../06-adrs/ADR-0020-integrity-scoring-model.md)). The numeric value depends on the configured weights in ADR-0020 and is not asserted here.

---

## References & standards

_Normative:_

- The integrity-scoring model — **[ADR-0020](../../06-adrs/ADR-0020-integrity-scoring-model.md)** and [Documentation Standard §8.1](../../02-standards/DOCUMENTATION-STANDARD.md).
- The Open Group — **ArchiMate 3.2 Specification**. The relationships the traversal follows.

_Informative:_

- Pirolli & Card — **Information Foraging**, 1999. Information scent for the drill-down direction of explanations.

## Related documents

| Document                                                              | What it covers                                 |
| --------------------------------------------------------------------- | ---------------------------------------------- |
| [The spine](./the-spine.md)                                           | The lineage scoring and explanation use.       |
| [Spine to seed types](./spine-to-seed-types.md)                       | Why Intent is Bounded today.                   |
| [Validation rules](../metamodel/validation-rules.md)                  | What the Consistency dimension reads.          |
| [Edge catalogue](../../05-modules/praxis/edge-catalogue/catalogue.md) | The relationships and the full worked example. |
