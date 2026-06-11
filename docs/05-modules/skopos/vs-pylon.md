# Skopos vs Pylon

The load-bearing distinction between Skopos and Pylon: continuous and automated versus manual and one-shot. For practitioners deciding which module owns a given ingestion path.

> **PLANNED.** Neither `skopos` nor `aideon_pylon` exists; this is design intent per [ADR-0032](../../06-adrs/ADR-0032-automated-discovery-reality-sync-skopos.md) and [ADR-0013](../../06-adrs/ADR-0013-interchange-and-interoperability-pylon.md).

## The distinction

**Skopos is continuous and automated; Pylon is manual and one-shot.** This is the load-bearing distinction between the two modules ([ADR-0032](../../06-adrs/ADR-0032-automated-discovery-reality-sync-skopos.md)):

|                   | [Pylon](../pylon/README.md)                           | Skopos                                                       |
| ----------------- | ----------------------------------------------------- | ------------------------------------------------------------ |
| **Cadence**       | One-shot, when a steward acts                         | Continuous, on a poll/subscription cadence                   |
| **Trigger**       | A steward chooses a file                              | An automated job, no per-event human in the loop             |
| **Source**        | A file or a connector pull                            | Live platforms — cloud, CMDB, monitoring                     |
| **Review**        | A reviewable diff per batch, accepted before it lands | Reconciliation per event; human review only on contradiction |
| **Purpose**       | Seed or share a model                                 | Keep `actual` fresh; feed entropy                            |
| **Layer written** | As authored (commonly seeds the model)                | `actual` layer only, by reconciliation                       |

Pylon imports a file a steward chose, once, with a reviewable diff ([ADR-0013](../../06-adrs/ADR-0013-interchange-and-interoperability-pylon.md)). Skopos polls or subscribes to live sources on a cadence and reconciles what it observes, without a per-event human in the loop ([ADR-0032](../../06-adrs/ADR-0032-automated-discovery-reality-sync-skopos.md)).

## Why they are separate modules

They **share no machinery beyond the canonical write path**, and conflating them would break one of them ([ADR-0032](../../06-adrs/ADR-0032-automated-discovery-reality-sync-skopos.md)):

- Forcing **Pylon's review-per-batch discipline** onto a high-volume automated feed would make continuous ingestion unworkable — a steward cannot review every cloud event.
- Relaxing **Skopos's reconciliation discipline** onto a steward's one-shot import would lose the deterministic, reviewable diff that makes an import trustworthy.

So each owns a distinct invariant, failure mode, and seam, and each is its own module under the "earns its own module" test ([ADR-0011](../../06-adrs/ADR-0011-module-taxonomy-and-boundaries.md)): Pylon owns _deterministic, reviewable import and redacted export_; Skopos owns _continuous, automated, Asserted `actual` facts by reconciliation_.

## Where a connector belongs

A connector that a steward triggers manually, reviews as a diff, and accepts once is **Pylon** ([Pylon CSV, Excel, and connectors](../pylon/csv-excel-and-connectors.md)). A connector that runs on a cadence, reconciles automatically, and keeps `actual` fresh is **Skopos**. The same external system — say a CMDB — can be reached by both: a one-shot Pylon connector to seed the model, and a Skopos connector to keep it current. The distinction is not the source; it is the _cadence and the discipline_.

## Worked example

An organisation onboards its application estate. A steward uses **Pylon** to import a CSV inventory once: a reviewable batch maps rows to seed `Application` entities like `n:application:insight-hub`, the steward inspects the diff and accepts. That seeds the model. Thereafter, **Skopos** runs a cloud connector on a daily cadence: it observes the live state of those applications and reconciles changes onto the `actual` layer — a new disposition, a retired resource — without a steward reviewing each event, surfacing only contradictions of human-Asserted truth `Awaiting review` ([continuous ingestion](./continuous-ingestion.md)). Pylon seeded; Skopos keeps fresh.

## References & standards

_Informative:_

- The Open Group — **ArchiMate Model Exchange File Format**. Pylon's primary format, for contrast with Skopos's live sources.

Recorded in the [standards register](../../02-standards/STANDARDS-REGISTER.md).

## Related documents

| Document                                                                      | What it covers                                                |
| ----------------------------------------------------------------------------- | ------------------------------------------------------------- |
| [Skopos README](./README.md)                                                  | The module index and invariants.                              |
| [Pylon README](../pylon/README.md)                                            | The manual, file-based interchange this contrasts with.       |
| [Pylon CSV, Excel, and connectors](../pylon/csv-excel-and-connectors.md)      | Why Pylon connectors stay manual.                             |
| [ADR-0032](../../06-adrs/ADR-0032-automated-discovery-reality-sync-skopos.md) | The decision that fixes the continuous-vs-manual distinction. |
