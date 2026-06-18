# M3 build contract — Artefacts and analytics

The build contract for the **Artefacts + analytics** milestone, the end of the MVP: an artefact executes against the twin at a named viewpoint and renders deterministically, and bounded analytics run within their documented limits and report their bounds honestly. M3 is the final milestone of the [golden journey](./golden-journey.md) (step 7) and the point at which the twin stops being authoring infrastructure and becomes something a single architect can read an answer out of. It builds on M0's portable workspace, M1's metamodel-validated facts, and M2's time-and-scenario resolution; it is the precondition for nothing in the MVP — completing it completes the MVP ([ROADMAP](../00-index/ROADMAP.md)). This contract takes [ADR-0033](../06-adrs/ADR-0033-artefact-execution-model.md), the [artefact-result contracts](../04-contracts/artefact-results/README.md), and the seed package as fixed inputs and pins the expected catalogue result an implementation is checked against.

The **catalogue is the first artefact built**, and the only artefact form this contract pins an oracle for. Per [ADR-0033](../06-adrs/ADR-0033-artefact-execution-model.md) and the [build plan](./README.md), the catalogue exercises resolution, scope, sort, pagination, per-element classification, integrity, and honest-state — every property the artefact-execution boundary must get right — **without** the deterministic-graph-layout problem a `view` or `map` would add. Layout determinism is a separate, harder problem; the MVP proves the execution contract on the form that does not need it.

---

## Outcome

When M3 is complete, on the seed metamodel and seed dataset:

- **One catalogue artefact executes from the twin.** `praxis_artefact_execute_catalogue` runs the `application-portfolio-health` catalogue at a named viewpoint over `scope=type=Application`, resolves the three seed applications, applies the requested sort and page, classifies each cell, and returns the [catalogue result](../04-contracts/artefact-results/catalogue-result.md) shape ([ADR-0033](../06-adrs/ADR-0033-artefact-execution-model.md)).
- **The result is deterministic.** The same artefact, at the same viewpoint, against the same snapshot, returns a byte-equal result under the canonical serialisation; ties break by stable identifier so page order is reproducible ([artefact-execution](../05-modules/praxis/artefact-execution.md)). This is the assertion that closes the [golden journey](./golden-journey.md): re-executing after a runtime wipe (step 10) returns the same catalogue rows.
- **Provenance and integrity are carried, not assumed.** Each cell carries its own `classification` (`asserted` for seed slots, `inferred` for the derived `health` roll-up); the result carries a result-level `integrity` block and a `resultState` ([content-classification](../03-design/artefacts/content-classification.md), [ADR-0020](../06-adrs/ADR-0020-integrity-scoring-model.md)).
- **Honest-state is structural.** A paged result is `["fresh"]` with `coverage: null` — pagination is completeness-in-pages, never `partialBounded`. A result whose inputs changed shows `stale`, never silently fresh; a bound that capped coverage shows `partialBounded` with explicit `coverage` ([artefact-results README](../04-contracts/artefact-results/README.md), [DOCUMENTATION-STANDARD §9](../02-standards/DOCUMENTATION-STANDARD.md)).
- **Bounded analytics report their bounds.** Metis centrality (PageRank, Brandes' betweenness) and bounded impact run within documented iteration, convergence, depth, fanout, and time limits; a result that hit a limit is marked `approximated` or `truncated` with its coverage stated, never blocked and never silently complete ([algorithms-and-bounds](../05-modules/metis/algorithms-and-bounds.md)).
- **The boundary holds.** The renderer reaches artefact execution and analytics only through typed IPC commands allowed in `appcommands.toml`; the engine resolves no path and opens no socket; the result is data, not instructions ([capabilities-and-csp](../05-modules/host/capabilities-and-csp.md), artefact-execution boundary).

---

## In scope

- Executing the **catalogue** form: scope resolution to a typed entity set, read-slot column projection, a `derived` column computed by Praxis, deterministic sort with stable-identifier tie-break, and pagination with a `pageSize` ceiling of 200 ([catalogue-result](../04-contracts/artefact-results/catalogue-result.md), [artefact-execution](../05-modules/praxis/artefact-execution.md)).
- Binding the artefact definition and its parameters to a **viewpoint** at execution time, and carrying that viewpoint back on the result ([ADR-0033](../06-adrs/ADR-0033-artefact-execution-model.md), [viewpoint-shape](../04-contracts/temporal-and-scenario/viewpoint-shape.md)).
- Per-element **content classification** set by Praxis from supporting facts — `asserted` for resolved seed slots, `inferred` for derived columns ([content-classification](../03-design/artefacts/content-classification.md)).
- The common result **envelope**: `artefactId`, `form`, `viewpoint`, `resultState[]`, `coverage`, `integrity`, `body` ([artefact-results README](../04-contracts/artefact-results/README.md)).
- **Result-state honesty**: `fresh` / `stale` / `rebuilding` / `partialBounded` / `failed`, multiple at once where applicable; pagination is not `partialBounded` ([DOCUMENTATION-STANDARD §9](../02-standards/DOCUMENTATION-STANDARD.md)).
- **Bounded analytics** in Metis: PageRank, Brandes' betweenness, and bounded breadth-first impact, each with iteration/convergence/depth/fanout/time bounds and `approximated` / `truncated` flags ([algorithms-and-bounds](../05-modules/metis/algorithms-and-bounds.md)). Analytics results that participate in a derived column (the `health` roll-up over `realises.criticality`) feed the catalogue.
- The **MVP IPC/event surface** the golden journey M0–M3 needs, captured as the [MVP command registry](./mvp-command-registry.md), and the **MVP UI state machines** for the surfaces that render M3's result ([mvp-ui-state-machines](./mvp-ui-state-machines.md)).

## Out of scope

- **Other artefact forms with layout** — `view`, `map`, `matrix`, `report`, `page` are specified ([forms](../03-design/artefacts/forms.md), [matrix-result](../04-contracts/artefact-results/matrix-result.md), [view-result](../04-contracts/artefact-results/view-result.md), [map-result](../04-contracts/artefact-results/map-result.md)) but their deterministic-layout problem is post-MVP. M3 pins an oracle only for the catalogue.
- **The integrity scoring algorithm** — ADR-0020 fixes the model and the result shape; the exact `score` value is design-intent until the scorer is implemented. M3 pins the integrity block's shape and gate outcome, not the number ([ADR-0020](../06-adrs/ADR-0020-integrity-scoring-model.md)).
- **The `health` roll-up rule in general** — the fixture pins the two labels the worked example needs; the general mapping from a set of `realises.criticality` values to a health label is owned by the artefact/analytics design and is not asserted ([artefact-execution](../05-modules/praxis/artefact-execution.md)).
- **Action artefacts** — the read-only/execute variant is what M3 builds; the write variant is design intent, not built ([ADR-0033](../06-adrs/ADR-0033-artefact-execution-model.md)).
- **Generated content** — the `generated` classification exists in the enum but no LLM produces content in the MVP; Sophia is M5 ([ROADMAP](../00-index/ROADMAP.md), [ADR-0014](../06-adrs/ADR-0014-ai-assistance-and-generated-provenance-sophia.md)).
- **Optimistic UI writes and cross-window state sync** — settled out of the MVP by the UI state-machine contract ([mvp-ui-state-machines](./mvp-ui-state-machines.md), [ADR-0026](../06-adrs/ADR-0026-frontend-state-architecture.md)).
- **Interchange, search, reporting, AI, multi-user** — M4–M6, each owned by a planned module ([ROADMAP](../00-index/ROADMAP.md)).

---

## Authoritative sources

| Tier     | Source                                                                     | What it fixes                                                                                                           |
| -------- | -------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| ADR      | [ADR-0033](../06-adrs/ADR-0033-artefact-execution-model.md)                | Artefacts are time-valid definitions; execution binds to a viewpoint, is read-only, and carries provenance per element. |
| ADR      | [ADR-0020](../06-adrs/ADR-0020-integrity-scoring-model.md)                 | The integrity score, gate threshold, and `bounded` outcome on every result.                                             |
| ADR      | [ADR-0027](../06-adrs/ADR-0027-projection-consistency-model.md)            | When a cached result is `stale` and when it is recomputed; rebuild equivalence.                                         |
| ADR      | [ADR-0016](../06-adrs/ADR-0016-error-envelope-rfc9457.md)                  | The error envelope a failed execution is carried in.                                                                    |
| ADR      | [ADR-0011](../06-adrs/ADR-0011-module-taxonomy-and-boundaries.md)          | Praxis owns artefact execution; Metis owns analytics.                                                                   |
| Schema   | [`ipc-manifest.json`](../contracts/ipc-manifest.json)                      | The `praxis_artefact_execute_catalogue` command and the analytics command surface.                                      |
| Contract | [catalogue-result](../04-contracts/artefact-results/catalogue-result.md)   | The catalogue `body` — columns, rows, cells, sort, page.                                                                |
| Contract | [artefact-results README](../04-contracts/artefact-results/README.md)      | The common envelope and the shared `page` block.                                                                        |
| Contract | [content-classification](../03-design/artefacts/content-classification.md) | The per-cell `asserted` / `inferred` / `generated` rules.                                                               |
| Standard | [DOCUMENTATION-STANDARD §9](../02-standards/DOCUMENTATION-STANDARD.md)     | The honest-state vocabulary (content classification × result state).                                                    |
| Module   | [artefact-execution](../05-modules/praxis/artefact-execution.md)           | The filter/sort/page/bounds semantics and the worked catalogue example.                                                 |
| Module   | [algorithms-and-bounds](../05-modules/metis/algorithms-and-bounds.md)      | The named analytics algorithms and their bounds.                                                                        |
| Fixture  | [`core-v1.json`](../data/meta/core-v1.json) (`version` 1.0.0)              | The seed metamodel — `Application` and its slots.                                                                       |
| Fixture  | [`baseline.yaml`](../data/base/baseline.yaml)                              | The seed dataset the catalogue rows are drawn from.                                                                     |

---

## Contracts and fixtures this milestone produces

| Path                                                                                                                                                   | What it pins                                                                                                                                                                                 |
| ------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [`docs/data/fixtures/artefacts/README.md`](../data/fixtures/artefacts/README.md)                                                                       | The catalogue oracle: why each value is what it is, the `health` roll-up provenance, and the design-intent notes (integrity score, roll-up rule).                                            |
| [`docs/data/fixtures/artefacts/catalogue-application-portfolio.request.json`](../data/fixtures/artefacts/catalogue-application-portfolio.request.json) | The request: the `application-portfolio-health` catalogue at a named viewpoint over `type=Application`, with columns, sort `name asc`, and page `{ offset 0, pageSize 2 }`.                  |
| [`docs/data/fixtures/artefacts/catalogue-application-portfolio.result.json`](../data/fixtures/artefacts/catalogue-application-portfolio.result.json)   | The exact expected result: page one (`Automation Orchestrator`, `Insight Hub`), per-cell value + classification, integrity block, `page { total 3, hasMore true }`, `resultState ["fresh"]`. |
| [`docs/build-contracts/mvp-command-registry.md`](./mvp-command-registry.md)                                                                            | The MVP IPC/event surface for the golden journey, the sync-vs-`AcceptedJob` threshold, and the workspace-event manifest gap as a tracked follow-up.                                          |
| [`docs/build-contracts/mvp-ui-state-machines.md`](./mvp-ui-state-machines.md)                                                                          | The state table for each MVP surface, the keyboard/accessibility contract, persistence across reload and renderer restart, and the settled single-user frontend choices.                     |

The result fixture is the catalogue oracle: an implementation's output must equal it under the canonical serialisation (with the integrity `score` exempt as design-intent — only its shape and `bounded: false` gate outcome are pinned).

---

## Module ownership

| Concern                                                                                                                               | Owner                                                                                                                              |
| ------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| The artefact definition (time-valid content) and its catalogue execution: scope, columns, derived columns, sort, page, classification | **Praxis** ([artefact-execution](../05-modules/praxis/artefact-execution.md))                                                      |
| Resolving the entity set and read slots at the viewpoint the execution binds to                                                       | **Mneme** read path / **Chrona** resolution ([resolution-rules](../04-contracts/temporal-and-scenario/resolution-rules.md))        |
| The bounded analytics that feed a derived column (centrality, impact, roll-ups) and their `approximated` / `truncated` flags          | **Metis** ([algorithms-and-bounds](../05-modules/metis/algorithms-and-bounds.md))                                                  |
| The integrity score and gate carried on the result                                                                                    | **Metis** / integrity scorer ([ADR-0020](../06-adrs/ADR-0020-integrity-scoring-model.md))                                          |
| Carrying the typed command surface to the renderer; capability enforcement                                                            | **Host** (typed IPC only; no renderer HTTP; no open ports)                                                                         |
| Rendering the result, honest-state, and viewpoint-keyed caching                                                                       | **Renderer** ([mvp-ui-state-machines](./mvp-ui-state-machines.md), [ADR-0026](../06-adrs/ADR-0026-frontend-state-architecture.md)) |

The renderer never re-slices a catalogue: filter, sort, and pagination are Praxis's, returned in the result and reflected, not recomputed ([catalogue-result](../04-contracts/artefact-results/catalogue-result.md)).

---

## Implementation sequence

1. **Resolve the scope** at the viewpoint: `scope=type=Application` against the M2 resolution path returns the three seed applications at `{ valid 2026-06-11, layer actual, scenario base }`.
2. **Project the columns**: read the `name`, `vendor`, `disposition`, `lifecycle` slots (`asserted`); compute the `derived` `health` column by rolling up each application's `realises.criticality` (`inferred`).
3. **Sort and paginate**: order by `name` ascending with the stable-identifier tie-break; return page one (`offset 0`, `pageSize 2`); set `page.total = 3`, `hasMore = true`.
4. **Assemble the envelope**: set `viewpoint`, `resultState ["fresh"]`, `coverage null`, and the `integrity` block; the result must equal the result fixture under the canonical serialisation (integrity `score` exempt).
5. **Wire honest-state**: prove a paged result is `["fresh"]` (not `partialBounded`); prove a stale-input result reports `stale` per ADR-0027; prove a bound-capped result (a forced low size/time bound) reports `partialBounded` with `coverage`.
6. **Wire bounded analytics**: run PageRank, Brandes' betweenness, and bounded impact within their limits; confirm a limit-hit result is `approximated` / `truncated` with coverage, and that the analytics feeding the `health` column are deterministic.
7. **Prove rebuild equivalence**: execute the catalogue, delete `.aideon/runtime/`, reopen and rebuild, re-execute, and confirm the catalogue rows are identical by a deterministic hash ([golden-journey](./golden-journey.md) step 10).

---

## Golden-journey segment

M3 is **step 7** of the [golden journey](./golden-journey.md):

- **Step 7 — Execute one catalogue artefact.** `praxis_artefact_execute_catalogue` at a named viewpoint with a scope, sort, and page. **Oracle:** the result JSON — rows, per-row provenance/classification, pagination cursor, integrity — equals [`catalogue-application-portfolio.result.json`](../data/fixtures/artefacts/catalogue-application-portfolio.result.json).

M3's result is also the subject of the journey's **final assertion** (step 10): after deleting and rebuilding the derived runtime, re-executing step 7 returns the same catalogue rows, proving canonical-vs-derived equivalence ([ADR-0027](../06-adrs/ADR-0027-projection-consistency-model.md)).

What the journey proves at M3: an artefact executes against the twin and renders deterministically ([golden-journey](./golden-journey.md), "What the journey proves").

---

## Exit tests

| Assertion                                                                                                                                                                                                                        | Oracle                                                                                                                                     |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| Executing `application-portfolio-health` at `{ valid 2026-06-11, layer actual, scenario base, scope type=Application }`, sort `name asc`, `pageSize 2`, returns page one with rows `Automation Orchestrator` then `Insight Hub`. | [`catalogue-application-portfolio.result.json`](../data/fixtures/artefacts/catalogue-application-portfolio.result.json)                    |
| Each application's `name`, `vendor`, `disposition`, `lifecycle` cells are `asserted` with the seed values quoted verbatim.                                                                                                       | result fixture + [baseline.yaml](../data/base/baseline.yaml)                                                                               |
| The `health` cell is `derived` and `inferred`: `Automation Orchestrator` → `At risk` (realises `Automation Fabric`, `criticality Medium`); `Insight Hub` → `Healthy` (realises `Customer Insight`, `criticality High`).          | result fixture + [artefact-execution](../05-modules/praxis/artefact-execution.md) worked example                                           |
| The `page` block is `{ offset 0, pageSize 2, total 3, hasMore true }`; `resultState` is `["fresh"]` and `coverage` is `null` — a paged result is not `partialBounded`.                                                           | result fixture + [catalogue-result](../04-contracts/artefact-results/catalogue-result.md) pagination semantics                             |
| A second execution at the same viewpoint against the same snapshot returns a byte-equal result (integrity `score` exempt).                                                                                                       | result fixture (re-compare)                                                                                                                |
| Re-executing after deleting and rebuilding `.aideon/runtime/` returns identical catalogue rows by deterministic hash.                                                                                                            | [golden-journey](./golden-journey.md) step 10, [ADR-0027](../06-adrs/ADR-0027-projection-consistency-model.md)                             |
| A `pageSize` request above 200 is capped at 200.                                                                                                                                                                                 | [catalogue-result](../04-contracts/artefact-results/catalogue-result.md), [artefact-execution](../05-modules/praxis/artefact-execution.md) |
| Sort ties break by stable identifier, so equal-keyed rows keep a reproducible order across pages.                                                                                                                                | [artefact-execution](../05-modules/praxis/artefact-execution.md)                                                                           |
| A catalogue whose canonical input changed after execution reports `stale`, never silently `fresh`.                                                                                                                               | [ADR-0027](../06-adrs/ADR-0027-projection-consistency-model.md)                                                                            |
| A forced size/time bound returns the computed rows marked `partialBounded` with explicit `coverage`.                                                                                                                             | [artefact-results README](../04-contracts/artefact-results/README.md)                                                                      |
| Bounded impact seeded at `n:application:automation-orchestrator` with depth 3 completes un-truncated; a fanout-capped run returns a `truncated` impact set stating coverage.                                                     | [algorithms-and-bounds](../05-modules/metis/algorithms-and-bounds.md) worked example                                                       |
| PageRank hitting its iteration cap before convergence returns an `approximated` result, not a failure.                                                                                                                           | [algorithms-and-bounds](../05-modules/metis/algorithms-and-bounds.md)                                                                      |
| Artefact execution is invoked only via `praxis_artefact_execute_catalogue` (allowed in `appcommands.toml`); the result carries no capability.                                                                                    | [capabilities-and-csp](../05-modules/host/capabilities-and-csp.md)                                                                         |

---

## Open questions

- **The integrity scoring algorithm.** [ADR-0020](../06-adrs/ADR-0020-integrity-scoring-model.md) fixes the model and the result shape; the exact `score` for this catalogue is **not settled** here. The fixture pins the integrity block's shape and the `bounded: false` gate outcome; the number is design-intent until the scorer is implemented.
- **The `health` roll-up function.** The mapping from a set of `realises.criticality` values to a health label is owned by the artefact/analytics design and is **not settled**. The fixture pins the two labels the worked example needs (`Medium → At risk`, `High → Healthy`); the general function is design-intent.
- **The catalogue request schema.** `praxis_artefact_execute_catalogue` exists in the manifest; the exact request DTO (how columns, filter, sort, and page are carried) is governed by the generated schema and is design-intent until the Rust payload struct is pinned and the manifest regenerated ([generated-schema-discipline](../04-contracts/ipc/generated-schema-discipline.md)). The request fixture uses the field names the contract docs use; CI drift-checks the eventual struct, not this fixture.
- **The bound thresholds.** The exact depth, fanout, size, iteration, convergence, and time-budget numbers are documented as design intent ([algorithms-and-bounds](../05-modules/metis/algorithms-and-bounds.md), [determinism-and-bounds](../05-modules/metis/determinism-and-bounds.md)); M3 asserts the honest reporting of a bound being hit, not the specific threshold values.

---

## Related documents

| Document                                                        | What it covers                                                                |
| --------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| [README.md](./README.md)                                        | Contract precedence and how an agent uses this folder.                        |
| [golden-journey.md](./golden-journey.md)                        | The end-to-end path; M3 is step 7 (and the final assertion in step 10).       |
| [M1-meaning.md](./M1-meaning.md)                                | The prior milestone — metamodel-validated facts the catalogue resolves.       |
| [M2-time.md](./M2-time.md)                                      | The prior milestone — the temporal resolution the viewpoint binds to.         |
| [mvp-command-registry.md](./mvp-command-registry.md)            | The MVP IPC/event surface and the sync-vs-accepted-work threshold.            |
| [mvp-ui-state-machines.md](./mvp-ui-state-machines.md)          | The MVP surface state machines and the settled frontend choices.              |
| [artefact-results/](../04-contracts/artefact-results/README.md) | The full result-shape contracts for every form.                               |
| [ROADMAP.md](../00-index/ROADMAP.md)                            | The M3 exit criteria this contract operationalises; M3 is the end of the MVP. |
