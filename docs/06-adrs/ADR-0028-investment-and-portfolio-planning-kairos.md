# ADR-0028: Investment and Portfolio Planning (Kairos)

- Status: Proposed
- Date: 2026-06-11
- Depends-On: ADR-0011 (module taxonomy), ADR-0009 (temporal model), ADR-0008 (diff compares two viewpoints)
- Relates-To: ADR-0020 (integrity scoring), ADR-0021 (confidence scale), ADR-0012 (Lexis), ADR-0027 (projection consistency)

## Context

A digital twin that only records the current architecture is a register. The value an enterprise architect, strategic planner, or consultant actually needs is the bridge from "this is changing" to "this is what it costs to change it well, and when we must start." Two forces drive every change in a twin: **entropy** (systems age and lose fitness with no decision required) and **action** (deliberate, authored change). Action that is planned, resourced, and funded is an **investment**. See [Forces of Change](../03-design/forces-of-change/README.md).

Today the twin can express a change — an `Application` set to `disposition = Migrate`, a `PlanEvent` dating a cutover — but nothing connects that change to the work, resources, schedule, and money required to deliver it, nor detects when a change implies an investment that has not been planned. Investment, portfolio, programme, and project planning is a distinct concern with its own model (work packages, resources, rates, durations, plateaus, gaps) and its own method (retrograde scheduling from a target date). Per the "earns its own module" rule in [ADR-0011](./ADR-0011-module-taxonomy-and-boundaries.md), this is a module, not a feature bolted onto Praxis or Continuum.

The concern is strongly standards-aligned: TOGAF Standard 10th Edition Phases E/F (Opportunities & Solutions, Migration Planning) and ArchiMate 3.2's Implementation & Migration and Strategy layers already provide the vocabulary (Work Package, Deliverable, Implementation Event, Plateau, Gap, Resource, Course of Action). Adopting them avoids inventing a private planning ontology.

## Governance Framing

- **Decision type:** Stable seam (a new engine behind a typed trait, composed via the host) + deferred (no crate exists yet; this is design intent).
- **Known future pressure:** richer cost models (multi-currency, capitalisation, depreciation); resource levelling across a portfolio; probabilistic/Monte-Carlo schedules; integration with external PPM tools via Pylon; finance-system reconciliation.
- **What stays stable:** every investment attaches to a modelled change in the twin; plans are authored as `plan`-layer facts in a scenario and committed by promotion; Kairos reads impact from Metis and never reimplements traversal; Kairos owns no canonical truth that is not expressed as facts and operations through Mneme.
- **What is provisional:** the cost-model depth; the project-type pattern catalogue; the scheduling algorithm (latest-finish first, single-resource initially).
- **What is deferred:** execution of committed work (owned by Continuum); resource levelling and optimisation; external PPM/finance integration (via Pylon).
- **Why hard to reverse:** the investment, work, and resource entity types become part of the metamodel and of artefact families and exports; once portfolios are modelled against them, their shape is a public contract.

## Decision

Introduce **Kairos** as a planned engine module owning **investment and portfolio/programme/project planning**, driven by the two forces of change.

1. **Two forces, made first-class.** Kairos detects **entropy** (lifecycle/disposition decay, technology obsolescence, orphaned strategic intent, control drift, plan/actual divergence, falling integrity) and presents each as a reviewable [signal](../03-design/signal-surfaces/README.md), never a silent edit. It classifies whether a detected change is an **investment opportunity** — _new_ (build/acquire) or _existing_ (extend/decommission) — and offers to model it.

2. **Investment attaches to change.** Every Kairos investment points at a modelled change (a `PlanEvent`/Change Event on a non-actual layer in a scenario). A budget with no change behind it is not representable; this is the discipline that makes a portfolio defensible.

3. **Magnitude sizes the investment.** Kairos consumes a change-magnitude vector computed by [Metis](../05-modules/metis/README.md) (blast radius along the spine, criticality, sensitivity, dependency breadth, lifecycle distance, time pressure) to set a **governance tier** (operational/tactical/strategic) and an **indicative size** carrying an honest [confidence](./ADR-0021-confidence-and-trust-scale.md) label. See [change magnitude and investment sizing](../03-design/forces-of-change/change-magnitude-and-investment-sizing.md).

4. **Backward planning from the target date.** Given a target date `T`, Kairos anchors a **Target Plateau** at `T`, computes the **Gap** from baseline, matches a **project-type pattern**, and schedules its **work packages** backwards (latest-finish first) — replacement build/acquire, migration/handover, rollout, hypercare, run handover, decommission — each consuming **resources** at a **rate** over a **duration**. Infeasible runways are surfaced, not hidden. See [backward planning](../03-design/forces-of-change/backward-planning.md).

5. **Plans are facts in scenarios.** Worked-back schedules are authored as `plan`-layer facts within a scenario, compared against baseline as a [diff](./ADR-0008-diff-compares-two-viewpoints.md), and committed by scenario promotion. Kairos writes only through Mneme; it holds no separate durable store.

6. **The metamodel gains a planning vocabulary.** A [proposed investment extension package](../03-design/metamodel/proposed-investment-extension.md) adds ArchiMate-aligned types — Plateau, Gap, Work Package, Deliverable, Implementation Event, Resource, plus Kairos's Investment, Project-Type Pattern, and Programme/Portfolio groupings — with UUID minting deferred to the metamodel compiler.

7. **Boundaries.** Kairos detects and plans; it does not execute (Continuum), does not traverse (Metis), does not render time (Chrona), and does not define meaning (Praxis). It composes with them through the host, with no engine-to-engine cycle, per [ADR-0011](./ADR-0011-module-taxonomy-and-boundaries.md).

## Consequences

- The twin becomes an investment-planning instrument: an executive briefing can drill from a budget number to the work, to the change, to the entropy signal that forced it.
- A new module, crate (`aideon_kairos`), trait, frontend workspace, and metamodel extension are added to the roadmap; the C4 model and module dependency map include Kairos as a planned component.
- Sizing is honest about uncertainty: an investment can be large, strategic, and **Low-confidence** simultaneously, which surfaces in every artefact that shows it.
- Kairos depends on Metis impact analysis and the temporal/scenario model already in place; it adds no new canonical storage primitive.
- The planning entity types must be governed like any metamodel change (SemVer, forward-only) per [ADR-0017](./ADR-0017-contract-and-dto-versioning.md).

## Follow-ups / Open Questions

- Confirm the module name **Kairos** (opportune time — pairs with Chrona/chronological time) against alternatives.
- Define the project-type pattern catalogue (the initial set: application replacement, SaaS migration, custom build, package implementation, decommission, capability uplift) and where patterns are stored and versioned.
- Choose the initial scheduling algorithm and whether resource levelling is in or out of the first version.
- Decide the cost model's first-version depth (day-rate × duration + non-labour) and the currency/capitalisation roadmap.
- Specify how a committed Kairos plan hands off to Continuum for execution and how actuals reconcile back against the plan layer.
- Decide which artefact families Kairos introduces (roadmap, investment portfolio, programme plan, plateau/transition view) and their forms.
