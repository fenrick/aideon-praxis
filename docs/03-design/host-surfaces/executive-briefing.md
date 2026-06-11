# Executive Briefing

Executive briefing is where the product has to survive a difficult room. It turns live model content into decision-ready views — concise scorecards, strategy-to-execution views, portfolio summaries — for a reader who decides on what they see and will be challenged on it. This document fixes what the surface shows, the honesty it must keep, and which modules own which part.

## The principle

A briefing surface earns trust by holding **context, explanation, and honesty** while it summarises. A scorecard that looks polished but cannot explain itself is worse than a rough view that can, because the polished one fails precisely when it is challenged. The surface therefore composes from live model content and keeps the route back to evidence open; it never freezes a number into a slide that has lost its provenance.

It supports:

- **Concise scorecards, strategy-to-execution views, and portfolio summaries** — composed from artefact results, not hand-built.
- **Visible scope, time, scenario, freshness, and caveat treatment** — every figure carries the viewpoint and result state that produced it.
- **Drill-down into rationale when a claim is challenged** — from a score to its inputs to the underlying entities, in at most one step ([../ux/drill-down.md](../ux/drill-down.md)).
- **Export paths that preserve the selected context** — a packaged briefing carries its viewpoint and caveats with it, rather than quietly changing them on the way out.

## The rules it imposes

Executive briefing **must not** become any of three things:

- a **slide factory** disconnected from the model — once a figure is detached from the viewpoint that produced it, it can no longer be challenged or refreshed, and the surface has become a worse PowerPoint;
- a **vanity dashboard** that mistakes movement for meaning — a trend line that moves is not a claim until the surface can say what moved, in which layer, against which baseline;
- a **dead-end presentation surface** with no route back to evidence — a reader challenged in the room must be able to open the rationale, not promise to "follow up".

Every figure on a briefing surface **must** carry its viewpoint and result state. A scorecard cell that shows a count or a ranking **must** be drillable to the entities and the computation behind it. A score **must not** be shown without the ability to inspect its dimensions ([Documentation Standard §8.1](../../02-standards/DOCUMENTATION-STANDARD.md), integrity score; an opaque number is not explainable). Caveats — _Bounded_, _Stale_, _Awaiting review_ — render inline on the figure they qualify, not in a footnote.

## Ownership

| Concern                                                               | Owner                                                                        |
| --------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| Briefing entry point and the packaging flow into the shell            | **Host** shell (entry, routing, and the typed IPC the surface reads through) |
| Artefact families, report and page artefacts, and narrative structure | **Praxis** (artefact and family identity; the report/page forms)             |
| Rankings, warnings, score inputs, and other analytical payloads       | **Metis** (deterministic, bounded analytics; every result Inferred)          |
| Packaged and published output, with redaction by default              | **Kerux** _(planned)_ — the deterministic reporting-and-publishing engine    |

Praxis gives the briefing its shape and narrative; Metis supplies the analytical figures; the Host arranges and routes; Kerux, when it lands, packages a briefing into an output a stakeholder can read away from the tool, with the executing viewpoint preserved and redaction applied by default.

## Worked example

An executive scorecard over the seed application portfolio (`baseline.yaml`, v1.0.0), read in a portfolio review.

The scorecard is a **report** artefact (Praxis) over the three applications, executed at a stated viewpoint: as-of valid time today, base case, layer policy `actual-over-plan` so the room sees current reality with planned change visible beside it. The toolbar shows that viewpoint; the surface does not hide it.

| Application                                                       | Disposition | Realises                                                           | Criticality | Note                               |
| ----------------------------------------------------------------- | ----------- | ------------------------------------------------------------------ | ----------- | ---------------------------------- |
| `n:application:insight-hub` (Insight Hub)                         | Invest      | `n:capability:customer-insight` (Customer Insight, Strategic)      | High        | FY26 Insight Modernization in plan |
| `n:application:journey-studio` (Journey Studio)                   | Invest      | `n:capability:journey-orchestration` (Journey Orchestration, Core) | High        | FY26 Q2 Channel Cutover in plan    |
| `n:application:automation-orchestrator` (Automation Orchestrator) | Migrate     | `n:capability:automation-fabric` (Automation Fabric, Supporting)   | Medium      | —                                  |

Metis supplies the analytical column the room asks about — say a criticality-weighted ranking that puts Insight Hub and Journey Studio above Automation Orchestrator, derived from the `realises` relationships and their `criticality` slots (`e:insight-realises-insight` High, `e:journey-realises-journey` High, `e:automation-realises-automation` Medium). The ranking is **Inferred** content and carries its result state: if Metis bounded the traversal, the cell shows _Bounded_ inline.

When a director challenges "why is Automation Orchestrator ranked lowest?", the reader drills from the cell to the `realises` relationship to its `criticality: Medium` slot and the `Migrate` disposition behind it — one step, without leaving the briefing frame. When the review ends, the export path packages the scorecard with its viewpoint (`actual-over-plan`, today) and its caveats intact; it does not silently re-resolve to the base case on the way out.

> **Design intent.** The composition and ownership split are normative now. Metis's analytics crate is currently a placeholder and Kerux does not yet exist as a crate; the ranking figures and the packaged-export path are design intent until those modules land (see the Metis and Kerux READMEs for status). Praxis report/page artefacts and the live scorecard composition are the part nearest to code.

## Edge cases and honest-state behaviour

- **A figure depends on stale input.** The scorecard cell shows _Stale_ and offers re-execution; the briefing does not present a stale figure as current. See [../ux/honest-state-treatment.md](../ux/honest-state-treatment.md).
- **An analytical result is bounded.** Metis capped a traversal by depth or size; the figure shows _Bounded_ and states the coverage. A bounded ranking is not presented as complete.
- **A caveat would be inconvenient in the room.** The surface still shows it. The product's honesty obligation does not yield to presentation pressure ([trust-and-honesty.md](../trust-and-honesty.md)); a clean figure that hides its bound misleads the decision more cheaply than a caveat ever costs.
- **Export under redaction.** When Kerux packages the briefing, redaction is deny-by-default; a figure derived from `Confidential` data (e.g. anything touching `n:data-entity:engagement-event`) is redacted unless the publishing policy permits it.

## References & standards

_Informative — recorded in the [standards register](../../02-standards/STANDARDS-REGISTER.md):_

- ISO/IEC/IEEE 42010:2022, Architecture description. Stakeholders and concerns — the briefing serves a named decision-maker with explicit concerns; disambiguated from the product's _Viewpoint_ (query frame).
- The Open Group — **TOGAF Standard, 10th Edition**. The strategy-to-execution lineage behind a strategy-to-execution view.
- Mitchell et al. — **Model Cards for Model Reporting**, 2019. Per-output disclosure of intended use and limitations for the analytical figures.
- Pirolli & Card — **Information Foraging**, 1999. One-step drill-down to rationale when a claim is challenged.

## Related documents

| Document                                                                             | What it covers                                                                    |
| ------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------- |
| [README.md](./README.md)                                                             | The three host surfaces and the rules they share.                                 |
| [workspace-home.md](./workspace-home.md)                                             | The workbench surface a user starts from.                                         |
| [../artefacts/families.md](../artefacts/families.md)                                 | The artefact families a briefing composes from.                                   |
| [../participation-and-trust/trust-cues.md](../participation-and-trust/trust-cues.md) | The trust cues a read-only decision-maker relies on.                              |
| [../ux/drill-down.md](../ux/drill-down.md)                                           | The result → rationale → entity drill-down path.                                  |
| [../../05-modules/metis/README.md](../../05-modules/metis/README.md)                 | The analytics engine behind rankings, warnings, and score inputs.                 |
| [../../05-modules/kerux/README.md](../../05-modules/kerux/README.md)                 | The planned reporting-and-publishing engine behind packaged output and redaction. |
