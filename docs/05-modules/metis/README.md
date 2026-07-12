# Metis — analytics

Metis is the analytical engine of the Aideon twin: deterministic, bounded graph computation — centrality, impact, paths,
and cost — over a snapshot owned by Praxis and stored by Mneme. Every Metis result is **Inferred** content, derived and
reproducible, never canonical. The human remains the authority; Metis produces evidenced signals that support judgement,
not decisions that replace it.

> **Implementation status.** The `metis` crate (`aideon_metis`) is currently a placeholder. The analytics families, the
> named algorithms, the bounds, and the evidence model in this folder are **design intent** — the specification the
> engine is built to — and are labelled as such where they describe behaviour not yet in code. The boundary,
> determinism, and honest-state obligations are normative now and constrain the implementation when it lands.

This README is the index and the cross-cutting narrative; each focused topic lives in its own file, per the
[Documentation Standard §4](../../02-standards/DOCUMENTATION-STANDARD.md) granularity rule.

---

## Contents

1. [What Metis computes](./what-metis-computes.md) — the centrality, impact, path, and cost families.
2. [Algorithms and bounds](./algorithms-and-bounds.md) — the named algorithms, their complexity, and
   iteration/approximation limits.
3. [Determinism and bounds](./determinism-and-bounds.md) — the deterministic input scope and how truncation,
   approximation, and warnings are serialised.
4. [Impact and change magnitude](./impact-and-change-magnitude.md) — blast radius and the magnitude vector Kairos sizes
   from.
5. [Cost and TCO](./cost-and-tco.md) — the cost family, and how the FinOps (Oikos) concern folds in here.
6. [Explainable evidence](./explainable-evidence.md) — contributing nodes and paths, and the sampling rule for huge
   graphs.
7. [Model cards](./model-cards.md) — per-output disclosure for any ML-derived result.
8. [Accepted-work execution](./accepted-work-execution.md) — how heavy jobs run as accepted work.
9. [Boundaries](./boundaries.md) — what Metis depends on and the acyclic rule.

---

## One-line responsibility

Metis computes scores, impact sets, paths, and cost rollups over a bounded graph snapshot at an explicit viewpoint, and
returns them with the evidence and honest-state flags that let the rest of the product present them defensibly.

---

## The invariants

- **Derived, never canonical.** A Metis result is a view of the model at the instant it was computed, carrying its
  viewpoint; it is never the source of truth for any entity, relationship, or state
  ([canonical vs derived](../../01-architecture/boundary/canonical-vs-derived.md)). It goes stale when its projection is
  invalidated ([ADR-0027](../../06-adrs/ADR-0027-projection-consistency-model.md)).
- **Deterministic and reproducible.** Given the same input — workspace boundary, viewpoint, and filtered projection —
  the same algorithm produces the same output. No job reads ambient mutable state or a non-deterministic source
  ([determinism and bounds](./determinism-and-bounds.md)).
- **Bounded and honest.** Every job declares memory and time budgets; a job that hits a bound halts and reports it. A
  truncated result says so; an approximated result is marked; an incomplete-input result carries a warning rather than
  silent overconfidence ([algorithms and bounds](./algorithms-and-bounds.md)).
- **One-directional dependency.** Metis reads snapshots and projections through Mneme traits and consumes Praxis
  contract types; neither Praxis nor Mneme depends on Metis, and Metis depends on no sibling engine
  ([boundaries](./boundaries.md)).

---

## How Metis fits the product

Praxis frames the domain question — "most critical capabilities", "blast radius for this application", "what changed
between baseline and scenario" — and delegates the graph computation to Metis. Metis computes the answer and returns
ranked items, impact sets, path bundles, and cost rollups with their contributing evidence; Praxis presents the result
and its explanation ([explainability](../praxis/explainability.md)). The composition routes through the host, not
through a Praxis→Metis or Metis→Praxis import, preserving the acyclic engine graph
([ADR-0011](../../06-adrs/ADR-0011-module-taxonomy-and-boundaries.md)).

Two downstream consumers depend on Metis output in particular:

- **Kairos** (planned) sizes investments from the change-magnitude vector Metis computes
  ([impact and change magnitude](./impact-and-change-magnitude.md);
  [ADR-0028](../../06-adrs/ADR-0028-investment-and-portfolio-planning-kairos.md)).
- **Signal surfaces** present Metis rankings and risk diagnostics to the user
  ([SIGNAL-SURFACES.md](../../03-design/SIGNAL-SURFACES.md)).

---

## References & standards

_Normative:_

- Newman — _Networks_, 2nd ed., 2018. Centrality definitions and their interpretation.
- Page & Brin — **PageRank**, 1998; Freeman — **betweenness centrality**, 1977; Brandes — fast betweenness, 2001. Named,
  bounded centrality algorithms.
- Dijkstra, 1959; Bellman–Ford — shortest paths.
- Mitchell et al. — **Model Cards for Model Reporting**, 2019. Per-output disclosure for ML results.

Full bibliography: [STANDARDS-REGISTER.md](../../02-standards/STANDARDS-REGISTER.md).

## Related documents

| Document                                                                         | What it covers                                               |
| -------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| [Analytics design](../../03-design/analytics/README.md)                          | The product framing of analytics.                            |
| [Signal surfaces](../../03-design/SIGNAL-SURFACES.md)                            | How analytic outputs surface to the user.                    |
| [Praxis module](../praxis/README.md)                                             | The semantic engine that frames the questions Metis answers. |
| [Accepted work and events](../../04-contracts/ACCEPTED-WORK-AND-EVENTS.md)       | The job lifecycle heavy analytics run under.                 |
| [Projection and invalidation](../../04-contracts/PROJECTION-AND-INVALIDATION.md) | How projections stay valid and when results go stale.        |
| [Module dependency map](../../01-architecture/module-dependency-map.md)          | The crate dependency graph and the acyclic invariant.        |
