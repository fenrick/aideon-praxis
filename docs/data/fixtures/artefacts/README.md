# Artefact result fixtures

The expected-output oracle for artefact execution — the first being the **catalogue** form
([catalogue-result](../../../04-contracts/artefact-results/catalogue-result.md)). Each fixture is a request/result pair:
a request that names an artefact, a viewpoint, and the catalogue's scope/sort/page, and the exact result an
implementation must return when it executes that request against the seed metamodel
([`core-v1.json`](../../meta/core-v1.json)) and the seed dataset ([`baseline.yaml`](../../base/baseline.yaml)). A build
is checked against these files: the result an engine produces must equal the result fixture under the canonical
serialisation.

The catalogue is the first artefact fixtured because it exercises resolution, scope, sort, pagination, per-element
classification, integrity, and honest-state — without the deterministic-graph-layout problem a `view` or `map` would add
([golden-journey](../../../build-contracts/golden-journey.md), step 7;
[ADR-0033](../../../06-adrs/ADR-0033-artefact-execution-model.md)).

---

## Files

| File                                                                                             | What it is                                                                                                                            |
| ------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------- |
| [`catalogue-application-portfolio.request.json`](./catalogue-application-portfolio.request.json) | The request: the `application-portfolio-health` catalogue at a named viewpoint over `type=Application`, with columns, sort, and page. |
| [`catalogue-application-portfolio.result.json`](./catalogue-application-portfolio.result.json)   | The exact expected result: page one — rows, per-cell value + classification, the integrity block, and the pagination cursor.          |

---

## The catalogue under test

- **Artefact:** `application-portfolio-health`, form `catalogue`, family `application-portfolio`
  ([families](../../../03-design/artefacts/families.md), [forms](../../../03-design/artefacts/forms.md)).
- **Viewpoint:**
  `{ validAsOf: 2026-06-11, assertedAsOf: latest, layer: actual, scenario: base, scope: type=Application }`. The
  viewpoint is part of the operation contract and is carried back on the result
  ([ADR-0033](../../../06-adrs/ADR-0033-artefact-execution-model.md),
  [viewpoint-shape](../../../04-contracts/temporal-and-scenario/viewpoint-shape.md)).
- **Scope** resolves to the three seed `Application` entities ([data/README](../../README.md) guardrail counts):
  `Insight Hub`, `Journey Studio`, `Automation Orchestrator`.
- **Sort:** by `name` ascending, with the deterministic tie-break by stable identifier required by the contract
  ([catalogue-result](../../../04-contracts/artefact-results/catalogue-result.md),
  [artefact-execution](../../../05-modules/praxis/artefact-execution.md)).
- **Page:** `offset 0, pageSize 2`. Sorted ascending by name, page one is `Automation Orchestrator` then `Insight Hub`;
  `Journey Studio` is on page two.

---

## Why each value is what it is

The result is fully determined by the seed; nothing in it is free choice.

- **`name`, `vendor`, `disposition`, `lifecycle` are `asserted`.** They read directly off the seed `Application` slots
  and are seeded facts ([baseline.yaml](../../base/baseline.yaml),
  [content-classification](../../../03-design/artefacts/content-classification.md)). The values are quoted verbatim from
  the seed:
  - `n:application:automation-orchestrator` — `Automation Orchestrator`, `Praxis Cloud`, `Migrate`, `Plan`.
  - `n:application:insight-hub` — `Insight Hub`, `Praxis Cloud`, `Invest`, `Run`.
- **`health` is `derived: true` and `inferred`.** It is not a seed slot; Praxis computes it by rolling up the
  `criticality` of each application's `realises` edge
  ([artefact-execution](../../../05-modules/praxis/artefact-execution.md), worked example). It is `inferred`, never
  `asserted`, because no human stated it.
  - `Automation Orchestrator` realises `Automation Fabric` with `criticality = Medium`
    (`e:automation-realises-automation`) → `At risk`.
  - `Insight Hub` realises `Customer Insight` with `criticality = High` (`e:insight-realises-insight`) → `Healthy`.
- **`page.total` is `3`, `hasMore` is `true`.** Three applications match; two are on this page. A paged result is
  **complete-in-pages**, so `resultState` is `["fresh"]` and `coverage` is `null` — `Journey Studio` is absent here but
  not missing ([catalogue-result](../../../04-contracts/artefact-results/catalogue-result.md), pagination semantics).
- **`integrity`** carries a result-level `score`, its `gateThreshold`, and `bounded`
  ([ADR-0020](../../../06-adrs/ADR-0020-integrity-scoring-model.md)). The score is **design-intent** until the scoring
  model is implemented; the fixture pins the shape and the `bounded: false` gate outcome for this complete result, not
  the exact `score`. An implementation that computes a different score does not fail the structural oracle, but the gate
  outcome (`bounded: false`, no `partialBounded` state) must hold.

---

## Honest-state notes

- **The `health` roll-up rule is design-intent.** The mapping from a set of `realises.criticality` values to a
  `Healthy | At risk | …` label is not yet pinned by a contract; the catalogue-result worked example fixes the two
  values used here, and the roll-up function itself is owned by the artefact/analytics design. An implementation must
  reproduce these two labels for these two applications; the general function is not asserted by this fixture.
- **The integrity `score` is design-intent** (see above); only its shape and the `bounded: false` gate outcome are
  pinned ([ADR-0020](../../../06-adrs/ADR-0020-integrity-scoring-model.md)).
- **The result is read-only.** Executing this catalogue resolves and reads; it never writes
  ([ADR-0033](../../../06-adrs/ADR-0033-artefact-execution-model.md)). Re-running it at the same viewpoint against the
  same snapshot returns this same result — the rebuild-equivalence assertion of the
  [golden journey](../../../build-contracts/golden-journey.md) (step 10) compares a deterministic hash over this result
  before and after a runtime wipe.

---

## Related documents

| Document                                                                         | What it covers                                                                                           |
| -------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| [M3 build contract](../../../build-contracts/M3-artefacts.md)                    | The milestone this fixture is the oracle for.                                                            |
| [catalogue-result](../../../04-contracts/artefact-results/catalogue-result.md)   | The normative `body` shape this fixture instantiates.                                                    |
| [artefact-results README](../../../04-contracts/artefact-results/README.md)      | The common envelope (`artefactId`, `form`, `viewpoint`, `resultState`, `coverage`, `integrity`, `body`). |
| [content-classification](../../../03-design/artefacts/content-classification.md) | The per-cell `asserted` / `inferred` / `generated` rules.                                                |
| [data/README](../../README.md)                                                   | The seed dataset, the id/ref format, and the guardrail counts.                                           |
