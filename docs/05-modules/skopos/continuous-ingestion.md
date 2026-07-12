# Continuous ingestion

How Skopos turns live observations into `actual`-layer facts by reconciliation, and how it respects human-Asserted
truth. For practitioners reasoning about machine-attested reality versus human claims.

> **PLANNED.** No `skopos` crate exists; this is design intent per
> [ADR-0032](../../06-adrs/ADR-0032-automated-discovery-reality-sync-skopos.md).

## Observe, reconcile, write

Skopos polls or subscribes to live sources — cloud platforms, CMDBs, monitoring backends — on a cadence, and reconciles
what it observes against the current `actual` snapshot
([ADR-0032](../../06-adrs/ADR-0032-automated-discovery-reality-sync-skopos.md)). Reconciliation has three outcomes:

| Observation                              | Outcome                                        |
| ---------------------------------------- | ---------------------------------------------- |
| Unchanged from the current `actual` fact | **Nothing written** — idempotent.              |
| A changed value                          | A **new Asserted fact on the `actual` layer**. |
| A resource that has disappeared          | A **retirement**.                              |

Each write is a **reconciliation Change Event** compiling to canonical operations
([ADR-0009](../../06-adrs/ADR-0009-temporal-model-valid-interval-layer-policy-viewpoint.md)), carrying its **source as
corroboration** ([ADR-0032](../../06-adrs/ADR-0032-automated-discovery-reality-sync-skopos.md)). Skopos **never writes
the `plan` layer** and never invents canonical truth — it attests observed reality on the `actual` layer only
([ADR-0032](../../06-adrs/ADR-0032-automated-discovery-reality-sync-skopos.md)).

## External identity maps to twin identity, so a re-poll dedupes

Reconciliation begins by deciding **which twin entity an observation is about**. A live source carries its own
identifier — a cloud resource ARN, a CMDB CI number, a host name — and Skopos maps that external identifier onto a twin
entity identity rather than minting a fresh entity each poll
([ADR-0032](../../06-adrs/ADR-0032-automated-discovery-reality-sync-skopos.md)). This is what makes the _unchanged →
nothing written_ outcome above possible: a poll only writes nothing if it can recognise that today's observation is
about the same entity as yesterday's.

The mechanism mirrors [Pylon's](../pylon/deterministic-reviewable-import.md):

- **A recorded external-id correspondence.** Once an observation has resolved to a twin entity, Skopos records the
  correspondence (external `id` → twin entity identity) as Asserted content with the source as lineage, so the next poll
  resolves through it directly.
- **A declared match key on first sight.** Where no correspondence exists, the reconciliation policy names the **match
  key** — what counts as the same resource
  ([ADR-0032](../../06-adrs/ADR-0032-automated-discovery-reality-sync-skopos.md)). A clean match resolves to the
  existing entity; no match mints a new one, using the same **UUIDv5 over namespace plus stable name path** minting rule
  as the rest of the twin ([op / fact / schema model](../../05-modules/mneme/op-fact-schema-model.md)), so the same
  resource always resolves to the same identifier and a re-poll is stable rather than duplicating.

The match keys, what counts as the same resource across re-identification, and retirement semantics are **where the
design effort sits and are provisional** ([ADR-0032](../../06-adrs/ADR-0032-automated-discovery-reality-sync-skopos.md))
— but the invariant is fixed: a re-poll of an unchanged source dedupes to the same entity and writes nothing, exactly as
a Pylon re-import produces an empty diff.

## Reconciliation respects human-Asserted truth

The hard case is when a Skopos observation **contradicts a human-Asserted fact**. Skopos does not silently overwrite it.
The divergence is either surfaced as `Awaiting review`
([Documentation Standard §9](../../02-standards/DOCUMENTATION-STANDARD.md)) or recorded under a documented **precedence
policy**, so machine attestation never erases a deliberate human claim without trace
([ADR-0032](../../06-adrs/ADR-0032-automated-discovery-reality-sync-skopos.md)). This is the same
respect-for-human-truth discipline that runs through the product: a human Asserted claim is controlled truth, not
silently overwritten by automation ([`CONTEXT.md`](../../../CONTEXT.md): Asserted content).

The **reconciliation policy is provisional and where the design effort sits**
([ADR-0032](../../06-adrs/ADR-0032-automated-discovery-reality-sync-skopos.md)): the match keys (what counts as the same
resource), what is a new fact versus a correction, retirement semantics, and the precedence when a source contradicts
human-Asserted truth, are all open questions. A connector is **not just a reader but a policy** for turning observations
into facts without trampling human truth — the polling is the easy part
([ADR-0032](../../06-adrs/ADR-0032-automated-discovery-reality-sync-skopos.md)).

## Runs as durable jobs

Ingestion is long-running, retryable, and scheduled, so it is **accepted-work, not a synchronous call**
([ADR-0006](../../06-adrs/ADR-0006-tauri-trust-boundary-and-typed-ipc.md)): Skopos composes with **Continuum** for
scheduling, retries, and the run ledger ([ADR-0032](../../06-adrs/ADR-0032-automated-discovery-reality-sync-skopos.md)).
A failed ingestion is a recorded, recoverable job, not a lost update. Where monitoring/observability sources are
ingested, they are correlated using established conventions (OpenTelemetry; W3C Trace Context —
[ADR-0019](../../06-adrs/ADR-0019-observability-and-trace-context.md)). The freshness/cadence model — poll interval,
subscription, near-real-time — and how it interacts with Continuum scheduling is an open question; near-real-time
streaming ingestion and bidirectional write-back to source systems are deferred
([ADR-0032](../../06-adrs/ADR-0032-automated-discovery-reality-sync-skopos.md)).

## Provenance distinction

The twin gains a clear provenance distinction: machine-attested `actual` facts (Skopos), human-Asserted facts, and
one-shot imports ([Pylon](../pylon/README.md)) are **all Asserted but carry different corroboration**, which integrity
scoring can weigh ([ADR-0032](../../06-adrs/ADR-0032-automated-discovery-reality-sync-skopos.md);
[ADR-0020](../../06-adrs/ADR-0020-integrity-scoring-model.md)). Skopos's corroboration is the source it observed.

## Worked example

A cloud connector observes that the platform hosting the seed `Application` `n:application:automation-orchestrator` has
reached end-of-support. Skopos reconciles: the observation differs from the current `actual` fact, so it writes a new
Asserted fact on the `actual` layer recording the platform state, as a reconciliation Change Event with the cloud source
as corroboration. On the next poll, an unchanged observation writes nothing. If the connector later observes the
resource gone, Skopos writes a retirement. But if a human has Asserted that the application is being kept on extended
support, the contradicting observation is not silently written over the human claim — it is surfaced `Awaiting review`
(or recorded under the precedence policy), so the deliberate human claim survives with trace. Throughout, Skopos writes
only the `actual` layer, never `plan`.

## References & standards

_Normative (monitoring/observability sources):_

- **OpenTelemetry**; W3C **Trace Context**. Correlation conventions for ingested signals.

_Informative:_

- Snodgrass — _Developing Time-Oriented Database Applications in SQL_, 1999. The bitemporal reconciliation onto
  `actual`.

Recorded in the [standards register](../../02-standards/STANDARDS-REGISTER.md).

## Related documents

| Document                                                                              | What it covers                                                                |
| ------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| [Skopos README](./README.md)                                                          | The module index and invariants.                                              |
| [Entropy feeder for Kairos](./entropy-feeder-for-kairos.md)                           | What a fresh `actual` layer makes detectable.                                 |
| [Skopos vs Pylon](./vs-pylon.md)                                                      | Why this is automated and Pylon is manual.                                    |
| [Pylon deterministic, reviewable import](../pylon/deterministic-reviewable-import.md) | The same external-id mapping and reconciliation precedence for manual import. |
| [Op / fact / schema model](../../05-modules/mneme/op-fact-schema-model.md)            | UUIDv5 identifier minting and supersession-by-asserted-time.                  |
| [ADR-0032](../../06-adrs/ADR-0032-automated-discovery-reality-sync-skopos.md)         | The decision that fixes the reconciliation invariants.                        |
