# ADR-0032: Automated Discovery and Reality-Sync — Skopos

- Status: Proposed
- Date: 2026-06-11
- Depends-On: ADR-0011 (module taxonomy)
- Relates-To: ADR-0013 (interchange — Pylon), ADR-0028 (investment and portfolio planning — Kairos), ADR-0009 (temporal model)

## Context

A twin's `actual` layer ([ADR-0009](./ADR-0009-temporal-model-valid-interval-layer-policy-viewpoint.md)) is only as good as its freshness. Reality drifts continuously: cloud resources are created and destroyed, a CMDB record changes, a monitoring signal reveals a dependency no one modelled. If the `actual` layer is only ever updated by manual import or one-shot file exchange, it is stale the moment it lands, and **entropy** — the force Kairos detects to drive investment ([ADR-0028](./ADR-0028-investment-and-portfolio-planning-kairos.md)) — is invisible until someone notices by hand.

Pylon owns manual, file-based, one-shot interchange ([ADR-0013](./ADR-0013-interchange-and-interoperability-pylon.md)): a steward chooses a file, an import compiles to a reviewable batch, a diff is inspected, the batch is accepted. That is the right shape for migrating a model in or sharing one out. It is the wrong shape for keeping `actual` fresh against live platforms, which is **continuous and automated**, runs without a steward in the loop per event, and feeds entropy rather than seeding a model. The two are distinct concerns. Per the "earns its own module" rule in [ADR-0011](./ADR-0011-module-taxonomy-and-boundaries.md), continuous reality-sync owns a distinct invariant (it writes only Asserted `actual`-layer facts, by reconciliation, never canonical truth it invents), a distinct failure mode (drift undetected, a noisy source flooding the log, a reconciliation that overwrites human-asserted truth), and a distinct seam (the durable ingestion job). It is therefore a module.

## Governance Framing

- **Decision type:** Stable seam (a new engine behind a typed trait, composed via the Host, running as durable jobs) + deferred (no crate exists yet; design intent).
- **Known future pressure:** more source connectors (cloud platforms, CMDBs, monitoring/observability backends); higher ingestion volume; reconciliation ambiguity as sources disagree; near-real-time freshness expectations.
- **What stays stable:** Skopos writes **Asserted** facts on the **`actual` layer only**, via reconciliation Change Events ([ADR-0009](./ADR-0009-temporal-model-valid-interval-layer-policy-viewpoint.md)); it runs as durable jobs through Continuum, never as fire-and-forget side effects; it is continuous and automated, distinct from Pylon's manual one-shot interchange ([ADR-0013](./ADR-0013-interchange-and-interoperability-pylon.md)).
- **What is provisional:** the specific source connectors; the reconciliation policy (what counts as a match, what is a new fact, what is a retirement); the freshness/cadence model.
- **What is deferred:** bidirectional write-back to source systems; near-real-time streaming ingestion; reconciliation across conflicting sources beyond a documented precedence.
- **Why hard to reverse:** the reconciliation contract — how an observed reality becomes an `actual` fact — determines how much of the twin is machine-attested versus human-asserted; once analytics and entropy detection depend on that distinction, changing it reclassifies stored content.

## Decision

Introduce **Skopos** (Greek _skopos_, "watcher, observer") as a planned engine module owning **continuous, automated ingestion** from cloud platforms, CMDBs, and monitoring to keep the `actual` layer fresh. Skopos is **the entropy feeder for Kairos** ([ADR-0028](./ADR-0028-investment-and-portfolio-planning-kairos.md)).

1. **Skopos is continuous and automated; Pylon is manual and one-shot.** This is the load-bearing distinction. Pylon imports a file a steward chose, once, with a reviewable diff ([ADR-0013](./ADR-0013-interchange-and-interoperability-pylon.md)). Skopos polls or subscribes to live sources on a cadence and reconciles what it observes, without a per-event human in the loop. They share no machinery beyond the canonical write path; conflating them would force Pylon's review-per-batch discipline onto a high-volume automated feed, or relax Skopos's reconciliation discipline onto a steward's one-shot import.

2. **Skopos writes Asserted `actual`-layer facts via reconciliation Change Events.** An observation from a source is reconciled against the current `actual` snapshot: an unchanged observation writes nothing (idempotent); a changed value writes a new Asserted fact on the `actual` layer; a disappeared resource writes a retirement. Each write is a reconciliation Change Event compiling to canonical operations ([ADR-0009](./ADR-0009-temporal-model-valid-interval-layer-policy-viewpoint.md)), carrying its source as corroboration. Skopos never writes the `plan` layer and never invents canonical truth — it attests observed reality.

3. **Reconciliation respects human-asserted truth.** Where a Skopos observation contradicts a human-Asserted fact, it does not silently overwrite; the divergence is surfaced as `Awaiting review` ([DOCUMENTATION-STANDARD.md §9](../02-standards/DOCUMENTATION-STANDARD.md)) or recorded under a documented precedence policy, so machine attestation never erases a deliberate human claim without trace.

4. **Skopos runs as durable jobs through Continuum.** Ingestion is long-running, retryable, and scheduled, so it is accepted-work, not a synchronous call ([ADR-0006](./ADR-0006-tauri-trust-boundary-and-typed-ipc.md)): Skopos composes with Continuum for scheduling, retries, and the run ledger. A failed ingestion is a recorded, recoverable job, not a lost update. Monitoring/observability sources are ingested using established correlation conventions (OpenTelemetry; W3C Trace Context — see [ADR-0019](./ADR-0019-observability-and-trace-context.md)).

5. **Skopos feeds entropy.** A fresh `actual` layer is what makes plan/actual divergence, lifecycle decay, and orphaned intent detectable; Kairos consumes that divergence as an entropy signal driving investment ([ADR-0028](./ADR-0028-investment-and-portfolio-planning-kairos.md)). Skopos keeps reality current; Kairos reads what changed.

6. **Boundaries.** Skopos ingests and reconciles; it does not plan (Kairos), does not traverse (Metis), does not store the op log (Mneme), does not resolve viewpoints (Chrona), and does not own manual interchange (Pylon). It composes through the Host with no engine-to-engine cycle ([ADR-0011](./ADR-0011-module-taxonomy-and-boundaries.md)).

## Consequences

- The `actual` layer stays fresh automatically, so entropy is detectable continuously rather than only when someone re-imports a file.
- A new module, crate (`skopos`), trait, and frontend workspace (`src/workspaces/skopos`) join the roadmap; the C4 model and module dependency map include Skopos as a planned component, depending on Continuum for durable jobs.
- The twin gains a clear provenance distinction: machine-attested `actual` facts (Skopos), human-Asserted facts, and one-shot imports (Pylon) are all Asserted but carry different corroboration, which integrity scoring can weigh ([ADR-0020](./ADR-0020-integrity-scoring-model.md)).
- Reconciliation is the cost: a connector is not just a reader but a policy for turning observations into facts without trampling human truth; this is where the design effort sits, not in the polling.
- Skopos adds no new canonical storage primitive; it reuses facts, the `actual` layer, Continuum jobs, and the canonical write path.

## Follow-ups / Open Questions

- Confirm the module name **Skopos** against alternatives, and the first set of source connectors (a cloud platform, a CMDB, a monitoring backend).
- Define the reconciliation policy: match keys, what is a new fact versus a correction, retirement semantics, and the precedence when a source contradicts human-Asserted truth.
- Decide the freshness/cadence model (poll interval, subscription, near-real-time) and how it interacts with Continuum scheduling.
- Specify how a Skopos-detected divergence becomes a Kairos entropy signal ([ADR-0028](./ADR-0028-investment-and-portfolio-planning-kairos.md)).
- Decide whether write-back to source systems is ever in scope, and the trust implications if so.

## References & standards

- **OpenTelemetry**; W3C **Trace Context** _(normative where monitoring/observability sources are ingested and correlated; see [ADR-0019](./ADR-0019-observability-and-trace-context.md))_.
- Snodgrass — _Developing Time-Oriented Database Applications in SQL_, 1999 _(informative: bitemporal reconciliation onto the `actual` layer)_.

## Related documents

| Document                                                                       | What it covers                                                          |
| ------------------------------------------------------------------------------ | ----------------------------------------------------------------------- |
| [ADR-0013](./ADR-0013-interchange-and-interoperability-pylon.md)               | Pylon — manual, file-based, one-shot interchange, distinct from Skopos. |
| [ADR-0028](./ADR-0028-investment-and-portfolio-planning-kairos.md)             | Kairos — the entropy consumer Skopos feeds.                             |
| [ADR-0009](./ADR-0009-temporal-model-valid-interval-layer-policy-viewpoint.md) | The `actual` layer and Change Event model Skopos writes to.             |
