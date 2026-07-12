# Pylon — interchange

Pylon is the planned interchange engine of the Aideon twin: file-based, manual import and export between Aideon and the
wider enterprise-architecture ecosystem. It moves models in and out without contaminating canonical truth on the way in
or leaking sensitive content on the way out.

> **Implementation status: PLANNED.** No `aideon_pylon` crate exists. Everything in this folder is **design intent** —
> framed in the present tense as the standard requires, but describing behaviour not yet in code. The boundary, the
> deterministic-and-reviewable-import invariant, and the deny-by-default export rule are normative now and constrain the
> implementation when it lands. The governing decision is
> [ADR-0013](../../06-adrs/ADR-0013-interchange-and-interoperability-pylon.md).

This README is the index and the cross-cutting narrative; each focused topic lives in its own file, per the
[Documentation Standard §4](../../02-standards/DOCUMENTATION-STANDARD.md) granularity rule.

---

## Contents

1. [ArchiMate Open Exchange](./archimate-open-exchange.md) — the interchange lingua franca.
2. [CSV, Excel, and connectors](./csv-excel-and-connectors.md) — the secondary on-ramps onto the same internal
   representation.
3. [Deterministic, reviewable import](./deterministic-reviewable-import.md) — import as reviewable Change Events, and
   deny-by-default redaction on export.

---

## One-line role

Pylon imports an external model file into a reviewable, deterministic batch of operations a steward can inspect before
accepting, and exports a viewpoint-stamped snapshot with sensitive content removed before the file is written.

## The boundary it occupies

Pylon occupies the **manual, file-based interchange** boundary between Aideon and external EA tools, spreadsheets, and
standard exports. It is deliberately distinct from two neighbours:

- **[Skopos](../skopos/README.md)** owns _continuous, automated_ reality-sync from live platforms; Pylon owns _manual,
  one-shot_ file interchange. See [Pylon vs Skopos](../skopos/vs-pylon.md).
- The deterministic `.aideonpkg` **package export** ([ADR-0007](../../06-adrs/ADR-0007-deterministic-package-export.md))
  moves a whole workspace between Aideon installs; Pylon moves _models_ between Aideon and the wider ecosystem.

## Invariants

- **Imports are deterministic.** Given the same source file, metamodel, and mapping configuration, an import produces
  the same set of operations every time. Determinism is what makes an import reviewable — the same input yields the same
  diff ([ADR-0013](../../06-adrs/ADR-0013-interchange-and-interoperability-pylon.md)).
- **Imports compile to reviewable operations, not direct writes.** An import produces a proposed operation batch and a
  mapping report; ambiguous or unmapped material is surfaced as `Awaiting review`
  ([Documentation Standard §9](../../02-standards/DOCUMENTATION-STANDARD.md)), never silently dropped or guessed.
  Acceptance writes through the normal canonical path; imported content is Asserted with import lineage as its
  corroboration.
- **Export redaction is deny-by-default.** An export emits only what a redaction policy explicitly permits; sensitive
  slots and policy-excluded content are removed _before_ the file is written, not after
  ([ADR-0013](../../06-adrs/ADR-0013-interchange-and-interoperability-pylon.md);
  [ADR-0006](../../06-adrs/ADR-0006-tauri-trust-boundary-and-typed-ipc.md)).
- **Exports preserve the executing viewpoint.** An export is taken at a stated `Viewpoint` and records it; an export is
  a snapshot through a viewpoint, never an undated dump
  ([ADR-0009](../../06-adrs/ADR-0009-temporal-model-valid-interval-layer-policy-viewpoint.md)).

## What it owns / what it does not own

**Owns:** the ArchiMate Model Exchange File Format import/export path; the CSV/Excel and connector on-ramps; the mapping
tables from external schemas to the seed metamodel; the deterministic compilation of a source file into a proposed
operation batch and mapping report; the export redaction step.

**Does not own:** canonical reads and writes (Mneme); viewpoint resolution for export (Chrona); the meaning of the
metamodel it maps onto (Praxis); continuous automated ingestion (Skopos); reporting for consumption (Kerux — Pylon
interchanges _for re-import_); the Aideon-to-Aideon package format (ADR-0007).

## Public trait seam (design intent)

Pylon is reached only through the host. The planned seam separates the reviewable propose step from acceptance, and
stamps the viewpoint on export:

```rust
// design intent — not yet a crate
pub trait Pylon {
    fn propose_import(&self, source: &SourceFile, mapping: &MappingConfig)
        -> Result<ImportProposal, ProblemDetails>; // operation batch + mapping report; no writes
    fn export(&self, viewpoint: &Viewpoint, policy: &RedactionPolicy, format: ExchangeFormat)
        -> Result<ExportArtefact, ProblemDetails>; // viewpoint-stamped, redacted
}
```

`ImportProposal` carries the proposed operations, the mapping report (mapped / ambiguous / rejected), and the resulting
diff. Acceptance is a separate, attributable step on the canonical path. Errors follow RFC 9457
([ADR-0016](../../06-adrs/ADR-0016-error-envelope-rfc9457.md)). The shapes are provisional until a crate exists.

## Integration with other modules (via the host)

Pylon is an engine and **depends on no other engine**
([ADR-0011](../../06-adrs/ADR-0011-module-taxonomy-and-boundaries.md)). The host composes it:

- **Mneme** — canonical reads for export and the canonical write path on import acceptance.
- **Chrona** — viewpoint resolution so an export records its as-of valid time, layer policy, and scenario.
- **Praxis** — the metamodel and effective schema the mapping targets; Pylon maps onto types it does not define.
- **[Kerux](../kerux/README.md)** — shares the deny-by-default redaction discipline and may share the redaction-policy
  grammar ([ADR-0015](../../06-adrs/ADR-0015-reporting-and-publishing-kerux.md)).

The planned crate name is `aideon_pylon`.

## References & standards

_Normative:_

- The Open Group — **ArchiMate Model Exchange File Format**. The interchange lingua franca.

_Informative:_

- The Open Group — **ArchiMate 3.2 Specification**. Element and relationship mapping.

Full bibliography: [STANDARDS-REGISTER.md](../../02-standards/STANDARDS-REGISTER.md).

## Related documents

| Document                                                                     | What it covers                                                           |
| ---------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| [ADR-0013](../../06-adrs/ADR-0013-interchange-and-interoperability-pylon.md) | The decision that introduces Pylon and fixes its invariants.             |
| [ADR-0007](../../06-adrs/ADR-0007-deterministic-package-export.md)           | The Aideon-to-Aideon package format, distinct from interchange.          |
| [Skopos module](../skopos/README.md)                                         | Continuous, automated reality-sync — the automated counterpart to Pylon. |
| [Kerux module](../kerux/README.md)                                           | Publishing for consumption, sharing the redaction discipline.            |
| [Module dependency map](../../01-architecture/module-dependency-map.md)      | The crate dependency graph and the acyclic invariant.                    |
