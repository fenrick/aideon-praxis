# ADR-0007: Strategy-to-Execution Map & Lineage

## Status

Accepted

## Context

Aideon Suite is intended to provide an explicit, testable “line of sight” from strategy to running
solutions. The original design doc captured this as a detailed strategy-to-execution map covering
motivation, value, services, processes, data, technology, roadmaps, and implementation. We need a
single, authoritative description of that map so meta-model, dataset, UX, and analytics all work off
the same conceptual backbone.

## Decision

Adopt the following **strategy-to-execution map** as normative for Aideon Suite:

- Motivation & Strategy: Drivers and Assessments shape Goals and Objectives; Principles and
  Requirements constrain design.
- Strategy & Value: Value Streams express how value is created; Capabilities serve Value Stream
  stages and form the unit of capability-based planning.
- Value & Services/Products: Business Services and Products realise value; Touchpoints represent
  customer interactions.
- Operating Model guardrails: Domains declare integration and standardisation levels that guide
  patterns and constraints.
- Process & Information: Processes/Functions deliver services and access Data Entities.
- Applications & Data: Application Services realise processes and encapsulate Data Entities; APIs
  and Interfaces expose them.
- Technology & Cloud: Technology Services/Components serve the application layer; Landing Zones
  provide guardrails; Environments group deployments.
- Portfolios & Lifecycle: Applications and Technologies carry TIME disposition and lifecycle; risks
  and costs are tracked as Measures.
- Roadmaps & Programmes: Work Packages/Initiatives realise capability deltas towards target
  Plateaus; Gaps derive from Plateaus.
- Solution/Integration Architectures: Interfaces and patterns (EIP) implement integration; designs
  trace back to Goals/Requirements.

## Consequences

- The meta-model and baseline dataset must encode this map explicitly (see `docs/meta/README.md` and
  `docs/data/README.md`).
- Lineage views and analytics in Praxis Canvas and Chrona must be able to traverse this chain
  end-to-end.
- Future design/feature work that touches strategy-to-execution must reference this ADR to avoid
  inventing conflicting concepts or flows.
