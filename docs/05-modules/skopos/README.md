# Skopos — automated discovery and reality-sync

Skopos is the planned reality-sync engine of the Aideon twin: continuous, automated ingestion from cloud platforms,
CMDBs, and monitoring, keeping the `actual` layer fresh by reconciliation. Skopos is the entropy feeder for Kairos. It
is the automated counterpart to Pylon's manual, file-based interchange.

> **Implementation status: PLANNED.** No `skopos` crate exists. Everything in this folder is **design intent** — framed
> in the present tense as the standard requires, but describing behaviour not yet in code. The boundary, the
> Asserted-`actual`-by-reconciliation invariant, the respect-human-truth rule, and the runs-as-durable-jobs rule are
> normative now and constrain the implementation when it lands. The governing decision is
> [ADR-0032](../../06-adrs/ADR-0032-automated-discovery-reality-sync-skopos.md).

This README is the index and the cross-cutting narrative; each focused topic lives in its own file, per the
[Documentation Standard §4](../../02-standards/DOCUMENTATION-STANDARD.md) granularity rule.

---

## Contents

1. [Continuous ingestion](./continuous-ingestion.md) — cloud/CMDB/monitoring to the `actual` layer via reconciliation,
   respecting human-Asserted truth.
2. [Entropy feeder for Kairos](./entropy-feeder-for-kairos.md) — how a fresh `actual` layer makes entropy detectable.
3. [Skopos vs Pylon](./vs-pylon.md) — continuous/automated versus manual/file, the load-bearing distinction.

---

## One-line role

Skopos polls or subscribes to live platforms on a cadence and reconciles what it observes onto the twin's `actual` layer
— writing Asserted facts where reality changed, retirements where resources disappeared, nothing where nothing changed —
so entropy becomes detectable continuously rather than only when someone re-imports a file.

## The boundary it occupies

Skopos occupies the **continuous, automated reality-sync** boundary. A twin's `actual` layer is only as good as its
freshness ([ADR-0009](../../06-adrs/ADR-0009-temporal-model-valid-interval-layer-policy-viewpoint.md)); reality drifts
continuously, and if `actual` is only updated by manual import it is stale the moment it lands
([ADR-0032](../../06-adrs/ADR-0032-automated-discovery-reality-sync-skopos.md)). Skopos is deliberately distinct from
[Pylon](../pylon/README.md): Pylon is manual, file-based, one-shot interchange; Skopos is continuous, automated
reality-sync (see [Skopos vs Pylon](./vs-pylon.md)). It runs as durable jobs through Continuum.

## Invariants

- **Writes Asserted `actual`-layer facts via reconciliation, only.** An observation is reconciled against the current
  `actual` snapshot: unchanged writes nothing (idempotent), a changed value writes a new Asserted fact on the `actual`
  layer, a disappeared resource writes a retirement — each a reconciliation Change Event
  ([ADR-0032](../../06-adrs/ADR-0032-automated-discovery-reality-sync-skopos.md);
  [ADR-0009](../../06-adrs/ADR-0009-temporal-model-valid-interval-layer-policy-viewpoint.md)). Skopos never writes the
  `plan` layer and never invents canonical truth — it attests observed reality.
- **Reconciliation respects human-Asserted truth.** Where an observation contradicts a human-Asserted fact, Skopos does
  not silently overwrite; the divergence is surfaced `Awaiting review`
  ([Documentation Standard §9](../../02-standards/DOCUMENTATION-STANDARD.md)) or recorded under a documented precedence
  policy ([ADR-0032](../../06-adrs/ADR-0032-automated-discovery-reality-sync-skopos.md)).
- **Runs as durable jobs through Continuum.** Ingestion is long-running, retryable, and scheduled — accepted-work, not a
  fire-and-forget side effect ([ADR-0032](../../06-adrs/ADR-0032-automated-discovery-reality-sync-skopos.md);
  [ADR-0006](../../06-adrs/ADR-0006-tauri-trust-boundary-and-typed-ipc.md)). A failed ingestion is a recorded,
  recoverable job, not a lost update.
- **Feeds entropy.** A fresh `actual` layer is what makes plan/actual divergence, lifecycle decay, and orphaned intent
  detectable; Kairos consumes that divergence as an entropy signal
  ([ADR-0032](../../06-adrs/ADR-0032-automated-discovery-reality-sync-skopos.md);
  [ADR-0028](../../06-adrs/ADR-0028-investment-and-portfolio-planning-kairos.md)).

## What it owns / what it does not own

**Owns:** the source connectors (cloud/CMDB/monitoring); the reconciliation policy turning observations into
`actual`-layer facts; the freshness/cadence model; the durable ingestion job definitions.

**Does not own:** investment planning (Kairos); graph traversal (Metis); the op log (Mneme); viewpoint resolution
(Chrona); manual, file-based interchange (Pylon); job scheduling and the run ledger itself (Continuum — Skopos composes
with it). Skopos adds no new canonical storage primitive. The source connectors, the reconciliation policy, and the
cadence model are all **provisional** ([ADR-0032](../../06-adrs/ADR-0032-automated-discovery-reality-sync-skopos.md)).

## Public trait seam (design intent)

Skopos is reached only through the host and runs as durable jobs. The planned seam observes a source and reconciles onto
`actual`:

```rust
// design intent — not yet a crate
pub trait Skopos {
    fn observe(&self, source: &SourceConnector) -> Result<Observation, ProblemDetails>;
    fn reconcile(&self, observation: &Observation, actual: &Snapshot)
        -> Result<ReconciliationOutcome, ProblemDetails>; // new Asserted actual facts, retirements, or Awaiting review
}
```

A `ReconciliationOutcome` carries the reconciliation Change Events (each with its source as corroboration) and any
human-truth divergences flagged `Awaiting review`. Errors follow RFC 9457
([ADR-0016](../../06-adrs/ADR-0016-error-envelope-rfc9457.md)). The shapes are provisional until a crate exists.

## Integration with other modules (via the host)

Skopos is an engine and **depends on no other engine**
([ADR-0011](../../06-adrs/ADR-0011-module-taxonomy-and-boundaries.md)). The host composes it:

- **Continuum** — scheduling, retries, and the run ledger for the durable ingestion jobs.
- **Mneme** — the canonical write path for reconciliation Change Events.
- **Chrona** — resolves the current `actual` snapshot reconciliation compares against.
- **[Kairos](../kairos/README.md)** — consumes the `actual`-layer freshness Skopos supplies as entropy signals
  ([entropy feeder for Kairos](./entropy-feeder-for-kairos.md)).

The planned crate name is `aideon_skopos`.

## References & standards

_Normative (where monitoring/observability sources are ingested and correlated):_

- **OpenTelemetry**; W3C **Trace Context**. See [ADR-0019](../../06-adrs/ADR-0019-observability-and-trace-context.md).

_Informative:_

- Snodgrass — _Developing Time-Oriented Database Applications in SQL_, 1999. Bitemporal reconciliation onto the `actual`
  layer.

Full bibliography: [STANDARDS-REGISTER.md](../../02-standards/STANDARDS-REGISTER.md).

## Related documents

| Document                                                                                   | What it covers                                                |
| ------------------------------------------------------------------------------------------ | ------------------------------------------------------------- |
| [ADR-0032](../../06-adrs/ADR-0032-automated-discovery-reality-sync-skopos.md)              | The decision that introduces Skopos and fixes its invariants. |
| [ADR-0013](../../06-adrs/ADR-0013-interchange-and-interoperability-pylon.md)               | Pylon — manual, file-based interchange, distinct from Skopos. |
| [ADR-0028](../../06-adrs/ADR-0028-investment-and-portfolio-planning-kairos.md)             | Kairos — the entropy consumer Skopos feeds.                   |
| [ADR-0009](../../06-adrs/ADR-0009-temporal-model-valid-interval-layer-policy-viewpoint.md) | The `actual` layer and Change Event model Skopos writes to.   |
| [Module dependency map](../../01-architecture/module-dependency-map.md)                    | The crate dependency graph and the acyclic invariant.         |
