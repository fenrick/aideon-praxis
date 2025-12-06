# ADR-0010: Analytics, Reporting, and AI Scope

## Status

Accepted

## Context

The original design doc outlined ambitions for analytics, reporting, and AI/LLM integration over the
digital twin: temporal analytics, topology deltas, TCO, reporting surfaces, and careful use of LLMs
for querying and modelling assistance. We need a concise statement of this scope to guide Metis,
Chrona, Praxis Canvas, and any AI-related work.

## Decision

Treat the following as the **target scope** for analytics, reporting, and AI:

- Temporal & Scenario Analytics
  - Plateau/Gap computation and roll-ups by Capability, Value Stream, Portfolio.
  - Topology deltas (centrality, articulation points, shortest-path changes) between Plateaus.
  - Trajectory analytics (maturity curves, coverage over time, trend/drift detection).
  - Confidence-filtered views based on Plan Event `confidence`.
- Analytics Engine & Reporting Surfaces
  - Metis Analytics implements graph algorithms and TCO/impact jobs over snapshots and histories.
  - Reporting surfaces (dashboards, scorecards, exports) consume Metis/engine outputs rather than
    implementing analytics in the renderer.
- LLM/ML Integration (guarded)
  - Natural-language-to-query (NL2Q) for graph querying, with show-the-query and user confirmation.
  - Summarisation/explanation of graph results for exec-friendly narratives.
  - Assistive modelling (suggesting elements/relations from unstructured text) and classification
    (mapping raw datasets into the meta-model).
  - Strong privacy posture: prefer on-device or private models; apply deny-by-default PII redaction;
    log prompts/outputs locally where appropriate.

## Consequences

- Metis and related engine crates should own analytics algorithms and TCO calculations, not the UI.
- Any AI/LLM work must respect the security posture (no uncontrolled data exfiltration) and follow
  this scope; substantial changes require updating this ADR or adding a new one.
