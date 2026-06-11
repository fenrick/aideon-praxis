# Connector orchestration

How Continuum coordinates adapter-driven ingest — CMDB pulls, file imports, external snapshot pulls — behind typed connector contracts, and where the boundary between orchestration and connector implementation sits.

---

## The orchestration / adapter split

External integrations sit behind **typed connector contracts**. The workflow that _coordinates_ those adapters lives in Continuum; the connector-specific implementation detail lives **behind the adapter boundary**. Continuum knows the shape of a connector step — pull, hand the result to the next step, record events — without knowing how a particular CMDB API authenticates or paginates.

Current adapter families:

- **CMDB ingest** — pulling configuration items from a CMDB into the twin.
- **File imports** — structured-file ingest (the manual/file interchange that the planned **Pylon** module will own, [DOCUMENTATION-STANDARD §10](../../02-standards/DOCUMENTATION-STANDARD.md)).
- **External snapshot pulls** — fetching a snapshot from an external system.

Future sync scheduling, conflict surfacing, and federated workflow coordination are designed to enter through this same seam ([ADR-0005](../../06-adrs/ADR-0005-sync-and-conflict-model.md)).

---

## Why the split matters

Keeping connector specifics behind the adapter boundary buys two things:

- **Continuum stays connector-agnostic.** A new connector is a new adapter implementing the typed contract; the orchestration — retry, lease, run ledger, idempotency — is reused unchanged ([run-and-step-lifecycle](./run-and-step-lifecycle.md)). Continuum does not grow a special case per provider.
- **A connector failure is a _step_ failure.** A connector that times out or rate-limits surfaces a transient step failure that Continuum retries with backoff ([retry-and-backoff](./retry-and-backoff.md)); a malformed response is a permanent failure recorded in the ledger. The connector does not manage its own retry loop — the orchestration does, consistently.

The trade-off named: a uniform orchestration layer cannot exploit a specific connector's bespoke recovery semantics (a provider's own resumable-cursor protocol, say). The product accepts a uniform, slightly less optimal retry model in exchange for one consistent, inspectable orchestration across every connector — every ingest answers "what ran, what failed, what is safe to retry" the same way.

---

## Connectors feed the actual layer

Connector ingest writes to the twin through Mneme's traits, like any other Continuum step ([workflow-composition](./workflow-composition.md)). The facts a connector pulls are observations of the world, so they land in the **actual** layer — actual-layer facts come from observation, import, reconciliation, or correction, never from plan events ([CONTEXT.md](../../../CONTEXT.md), Plan Event). This is the seam to the planned **Skopos** module: Skopos will _schedule_ continuous discovery to keep the actual layer fresh (the entropy feeder for Kairos, [ADR-0028](../../06-adrs/ADR-0028-investment-and-portfolio-planning-kairos.md)), and Continuum will _execute_ that ingestion through this same connector orchestration. Continuum runs the ingest; Skopos decides when and what ([DOCUMENTATION-STANDARD §10](../../02-standards/DOCUMENTATION-STANDARD.md)).

---

## Worked example — a CMDB pull refreshing the actual layer

A scheduled CMDB ingest refreshes deployment facts for the seed technology components:

1. Continuum dispatches the CMDB adapter's **pull** step behind the typed contract; the adapter authenticates and paginates the CMDB API — detail Continuum does not see.
2. The pull returns configuration items; a **shape** step (Praxis-facing) maps them onto the metamodel — e.g. matching a CMDB record to the `Stream Processor` technology component and its `deployment = PaaS` slot.
3. A **persist** step writes the observed facts through Mneme into the **actual** layer (an observation, not a plan), under the run's idempotency key ([idempotency-and-dedup](./idempotency-and-dedup.md)).
4. If the CMDB rate-limits the pull, the step retries with backoff; if it returns a malformed page, the step fails permanently and the ledger records it for a human ([retry-and-backoff](./retry-and-backoff.md)).
5. A **recompute** step refreshes the affected projections; the run completes and the ledger records the full trail ([snapshot-store-and-ledger](./snapshot-store-and-ledger.md)).

The actual layer is now fresh; a plan-versus-actual diff against the FY26 plan would reflect the newly-observed reality ([Chrona diff](../chrona/diff.md)).

---

## References & standards

_Informative:_

- van der Aalst et al. — Workflow Patterns. The control-flow vocabulary connector steps compose under.

## Related documents

| Document                                                      | What it covers                                      |
| ------------------------------------------------------------- | --------------------------------------------------- |
| [Workflow composition](./workflow-composition.md)             | How connector steps compose with engine steps.      |
| [Run and step lifecycle](./run-and-step-lifecycle.md)         | The orchestration reused across connectors.         |
| [Retry and backoff](./retry-and-backoff.md)                   | How a connector failure is handled.                 |
| [ADR-0005](../../06-adrs/ADR-0005-sync-and-conflict-model.md) | Sync/conflict, designed to enter through this seam. |
| [Continuum README](./README.md)                               | The module index.                                   |
