# Strategy-to-Execution Design – Aideon Suite

## Purpose

Capture the core strategy-to-execution design for Aideon Suite: the normative map from motivation to
running solutions, the main functional capabilities required to support that flow, the key
story-modes and encodings used in the UI, and the canonical viewpoints architects work with. This
document distils and preserves the detailed content from the original monolithic design spec in a
focused, suite-level reference.

## 1. Strategy-to-Execution Map (normative)

See ADR `docs/adr/0007-strategy-to-execution-map.md` for the authoritative description of the
strategy-to-execution map (motivation → value → services/processes/data → technology → portfolios →
roadmaps → solution architecture). This section provides a brief reminder only; the ADR is the
primary source of truth.

## 2. Functional capabilities

Functional capabilities required to support strategy-to-execution are captured in ADR
`docs/adr/0008-functional-capabilities-strategy-to-execution.md`. Use that ADR as the canonical
reference when designing UX surfaces or back-end APIs; this section only summarises at a high level.

## 3. Time, colour, and story modes

Time encoding, colour schemes, and story modes are defined in ADR
`docs/adr/0009-time-encoding-and-story-modes.md`. Praxis Canvas and Chrona should treat that ADR as
the normative reference for palettes, binning rules, and named story modes.

## 4. Viewpoint library (ISO 42010-aligned)

The canonical viewpoints derived from the original spec (Strategy & Motivation, Capability Map, Value
Stream, Service Blueprint, Information, Application Portfolio, Integration, Cloud/Deployment,
Roadmap, Solution Architecture) are summarised in ADRs `0007` and `0008` and in C4 diagrams under
`docs/c4/`. This document now acts as an index into those artefacts rather than a full repetition.
