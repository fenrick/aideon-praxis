# Analytics

Analytics in Aideon Desktop covers two distinct concerns that share a name but nothing else, and this folder keeps them
apart. The first is the **Metis analytics engine** — deterministic, bounded, explainable graph computation over the
twin. The second is **usage telemetry** — opt-in, secret-free event emission that helps understand how the product
behaves in use. They have different owners, different data, different obligations, and different trust boundaries;
conflating them is a category error.

This README is the entry point and the cross-cutting narrative. Each topic lives in its own file, per the
[Documentation Standard §4](../../02-standards/DOCUMENTATION-STANDARD.md) granularity rule.

---

## Contents

1. [Metis analytics](./metis-analytics.md) — what Metis computes (centrality, impact, paths, risk, cost), its typed
   result envelopes, and what it does not own.
2. [Determinism and bounds](./determinism-and-bounds.md) — why every result is reproducible, how truncation and
   approximation surface in the envelope, and why results are derived, never canonical.
3. [Usage telemetry](./usage-telemetry.md) — the opt-in posture, the PII and secret rules, the two emitters, and the
   bounded event families.

---

## The two concerns, side by side

| Concern                | Metis analytics                                                          | Usage telemetry                                                  |
| ---------------------- | ------------------------------------------------------------------------ | ---------------------------------------------------------------- |
| Subject                | The modelled organisation (the twin)                                     | The product's own behaviour in use                               |
| Owner                  | [Metis](../../05-modules/metis/README.md)                                | [Host](../../05-modules/host/README.md) (Tauri) and the renderer |
| Default                | Always available; computed on demand                                     | Off; nothing is emitted until explicitly enabled                 |
| Output                 | Typed result envelopes (ranked lists, scores, impact sets, path bundles) | Bounded event families with a fixed minimum shape                |
| Content classification | **Inferred** (derived, traceable, recomputed on input change)            | Not model content; never written to the twin                     |
| Honesty obligation     | Bounds, warnings, and provenance in the envelope (§9 result states)      | No secrets, no PII by default, correlation IDs not free text     |

The shared discipline is honesty. Metis must not present a bounded or approximated result as if it were exact; telemetry
must not leak what it has no right to carry. Each section states the rules in its own terms.

---

## How to read this folder

A reader who wants to know what the engine computes and returns reads [Metis analytics](./metis-analytics.md). A reader
who needs to understand why a result can be trusted, or why it goes stale, reads
[determinism and bounds](./determinism-and-bounds.md). A reader instrumenting the product, or reviewing what leaves the
device, reads [usage telemetry](./usage-telemetry.md).

The honest-state result vocabulary (Fresh, Stale, Bounded, …) and the confidence and integrity scales are referenced
throughout, never redefined — they are fixed by the
[Documentation Standard §8 and §9](../../02-standards/DOCUMENTATION-STANDARD.md) and surfaced in
[trust-and-honesty.md](../trust-and-honesty.md). Worked examples use the seed metamodel
([`core-v1.json`](../../data/meta/core-v1.json)) and seed dataset ([`baseline.yaml`](../../data/base/baseline.yaml)).

---

## References & standards

_Normative:_

- Newman — _Networks_, 2nd ed., 2018. Centrality definitions and their interpretation.
- **OpenTelemetry**; W3C — **Trace Context**. Correlation and propagation for telemetry across the IPC boundary.

_Informative:_

- Mitchell et al. — **Model Cards for Model Reporting**, 2019. Per-output disclosure for any ML-derived result.

Full bibliography: [STANDARDS-REGISTER.md](../../02-standards/STANDARDS-REGISTER.md).

## Related documents

| Document                                                                      | What it covers                                                              |
| ----------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| [Metis module README](../../05-modules/metis/README.md)                       | The analytics engine at module level — algorithms, bounds, crate structure. |
| [Host module README](../../05-modules/host/README.md)                         | The Tauri trust boundary that gates telemetry and routes accepted work.     |
| [trust-and-honesty.md](../trust-and-honesty.md)                               | The product's honesty obligations and how results declare their state.      |
| [signal-surfaces/README.md](../signal-surfaces/README.md)                     | How analytical signals are presented to the user.                           |
| [ACCEPTED-WORK-AND-EVENTS.md](../../04-contracts/ACCEPTED-WORK-AND-EVENTS.md) | The job and event contract heavy analytics and telemetry events ride on.    |
| [LOGGING_FRAMEWORK.md](../../LOGGING_FRAMEWORK.md)                            | The structured-logging and telemetry standard telemetry conforms to.        |
