# ADR-0008: Functional Capabilities for Strategy-to-Execution

## Status

Accepted

## Context

The original design spec described a rich set of functional requirements to support the
strategy-to-execution map: lineage, data quality, service blueprints, portfolio and roadmapping,
integration catalogues, cloud guardrails, APIs, exports, and governance cadence. We need a single,
authoritative summary of those functional capabilities so UX and engines can converge on the same
scope.

## Decision

Treat the following functional capabilities as **first-class requirements** for Aideon Suite:

- Traceability & Lineage
  - One-click lineage from Goal → Value Stream stage → Capability → Service/Process → App/API →
    Tech → Environment, with jump links.
  - Read-only derivation edges where rules infer relationships (e.g., Gaps between Plateaus).
- Validation & Data Quality
  - Rule engine enforcing meta-model constraints (ownership, acyclicity, realisation, PII
    stewardship, Landing Zone governance).
  - Data-quality dashboards (orphan capabilities, processes without services, apps without owners,
    blueprint steps without process links, etc.).
- Service Blueprint Editing
  - Canvas with lanes (Customer actions, Touchpoints, Frontstage, Backstage, Support, Evidence),
    binding steps to Processes/Services/Data and exporting diagrams (SVG/PNG/PDF, diagram-as-code).
- Portfolio & Roadmapping
  - Application/technology cards with TIME disposition, lifecycle, owner, risk/cost; bulk edit and
    review cycles with CSV exports.
  - Multi-row roadmaps (tracks for streams, capabilities, services/products, apps, technology, work
    packages, milestones) with Plateau/Gap-based diffs.
- Integration Catalogue & Cloud Guardrails
  - Registry of Interfaces/APIs with patterns (EIP), auth, protocols, contracts; impact analysis
    across flows.
  - Landing Zone catalogue with policy checks and Environment conformance, with evidence links.
- APIs, Exports, Governance
  - GraphQL/REST (read-only desktop; read/write server) for lineage queries and report feeds.
  - Data exports: JSON/CSV/GraphML; large sets via Arrow; diagram exports SVG/PNG/PDF.
  - Schedulers for cadence (OKR refresh, capability scoring, TIME reviews, data-quality sweeps, ADR
    capture).

## Consequences

- UX, engines, and analytics workstreams must prioritise these capabilities when shaping backlogs
  and acceptance criteria.
- New features that extend or change these capabilities must reference and, if needed, update this
  ADR so scope remains coherent.
