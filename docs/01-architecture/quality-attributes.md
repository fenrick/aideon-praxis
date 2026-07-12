# Quality Attributes

The quality scenarios Aideon Desktop's architecture is designed to meet — performance and latency, portability,
recoverability, security, accessibility, and extensibility — written in arc42 quality-scenario style. Each scenario
states a stimulus, the environment it occurs in, and the response the architecture is designed to produce.

> **Numeric budgets are targets and design intent, not measured facts.** Every latency or size figure below is a design
> budget the architecture aims at, against which an implementation is later measured. Where no measurement exists yet,
> the figure says what the design is trying to achieve, not what has been observed. A measured figure, when it exists,
> supersedes the target and is recorded against the relevant module.

The arc42 quality-scenario form distinguishes **usage scenarios** (the system under normal stimulus) from **change
scenarios** (the system under modification or failure). Both appear below, grouped by attribute.

---

## How to read a scenario

| Column                       | Meaning                                                                    |
| ---------------------------- | -------------------------------------------------------------------------- |
| **Stimulus**                 | The event or condition that triggers the scenario.                         |
| **Environment**              | The state the system is in when the stimulus arrives.                      |
| **Response (design intent)** | What the architecture is designed to do, and the target where one applies. |

The unified honest-state vocabulary _(see
[`../02-standards/DOCUMENTATION-STANDARD.md`](../02-standards/DOCUMENTATION-STANDARD.md) §9)_ names the result states a
response may surface: **Fresh**, **Stale**, **Rebuilding**, **Partial / Bounded**, **In progress**, **Failed**.

---

## Performance and latency

| #   | Stimulus                                                                        | Environment                                  | Response (design intent)                                                                                                                                                                   |
| --- | ------------------------------------------------------------------------------- | -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| P1  | A user opens an entity inspector.                                               | Workspace open, runtime warm.                | The resolved slots render with a **target** of interactive latency under ~100 ms; a slower resolution shows a loading state rather than blocking.                                          |
| P2  | A user appends an operation (a single Change Event compiling to one operation). | Single-writer queue not saturated.           | The operation is durably appended and acknowledged with a **target** under ~50 ms; the derived projection is invalidated and refreshed asynchronously.                                     |
| P3  | A user requests an artefact over a large subgraph.                              | Workspace open; subgraph exceeds the bound.  | Execution is bounded by depth, size, fan-out, and time; the result returns within its time budget in the **Partial / Bounded** state with explicit coverage, never an unbounded traversal. |
| P4  | A user changes the Viewpoint (valid time, layer policy, or scenario).           | Facts already resolved at a prior Viewpoint. | Re-resolution reuses cached projections where the canonical inputs are unchanged; only the affected slice recomputes.                                                                      |
| P5  | The write queue saturates under a burst.                                        | Many operations enqueued at once.            | The host returns `BACKPRESSURE`; the renderer shows a queued state; no write is dropped or silently retried.                                                                               |

Latency targets are design budgets; the per-module performance budgets in [`../05-modules/`](../05-modules/) refine and
measure them. Analytics complexity bounds are stated with the algorithms in
[`../05-modules/metis/README.md`](../05-modules/metis/README.md) _(Newman, Networks, 2018; Brandes, fast
betweenness, 2001)_.

---

## Portability

| #   | Stimulus                                                                                  | Environment                                            | Response (design intent)                                                                                                                                                                                                     |
| --- | ----------------------------------------------------------------------------------------- | ------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| PT1 | A user copies the workspace folder to another machine and opens it.                       | A different OS build of the app; no runtime present.   | The workspace opens; the host rebuilds the derived runtime from canonical files; the resolved twin is identical. The folder is the unit of copy, zip, share, and sync.                                                       |
| PT2 | The storage engine is swapped (SQLite → an alternative behind the trait).                 | Same canonical workspace.                              | No change to the canonical format and no change above the [storage trait](../05-modules/mneme/RUNTIME-AND-ENGINE.md); the resolved twin is unchanged, per **[ADR-0004](../06-adrs/ADR-0004-storage-engine-abstraction.md)**. |
| PT3 | A workspace is opened by a host whose schema understanding is older than the workspace's. | Schema version in `manifest.json` newer than the host. | The host returns `SCHEMA_TOO_NEW` and refuses to guess, per **[ADR-0002](../06-adrs/ADR-0002-portable-workspace-format.md)**.                                                                                                |

Portability rests on the canonical-vs-derived split: because everything machine- or engine-specific is derived, only the
canonical, portable files travel. See [`boundary/canonical-vs-derived.md`](./boundary/canonical-vs-derived.md).

---

## Recoverability

| #   | Stimulus                                                                         | Environment                                | Response (design intent)                                                                                                                                                                                       |
| --- | -------------------------------------------------------------------------------- | ------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| R1  | The derived runtime is deleted or corrupted.                                     | Workspace canonical files intact.          | The host detects the absent or invalid runtime and rebuilds it from the op log and schema with **no data loss**. The op log is the oracle.                                                                     |
| R2  | A canonical file fails validation on open (truncated op segment, bad blob hash). | Workspace open attempt.                    | The host refuses to treat the workspace as healthy; it reads the op log up to the last valid operation, quarantines a hash-mismatched blob, and surfaces the affected region rather than dropping it silently. |
| R3  | An engine fails to initialise.                                                   | Workspace open.                            | The host does not present a half-initialised twin: it rebuilds derived state if the failure is derived, and otherwise fails the open cleanly with a diagnostic, leaving canonical files untouched.             |
| R4  | The renderer crashes or is restarted mid-edit.                                   | In-flight edits held only in the renderer. | No canonical truth is lost — the renderer is disposable; durable state was already appended or was never canonical. In-flight UI state is ephemeral by design.                                                 |
| R5  | The app exits during a long job.                                                 | An `AcceptedJob` was running.              | On restart the host recovers the job ledger; completed work is durable, incomplete work is reported as not finished. Continuum's run ledger is the recovery point _(Garcia-Molina & Salem, Sagas, 1987)_.      |

The failure-and-recovery table in [`boundary/canonical-vs-derived.md`](./boundary/canonical-vs-derived.md) gives the
runtime-view detail behind R1–R3.

---

## Security

| #   | Stimulus                                                                     | Environment                      | Response (design intent)                                                                                                                                              |
| --- | ---------------------------------------------------------------------------- | -------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| S1  | The renderer attempts a privileged action not declared as a capability.      | Default-deny capability posture. | The action is denied at the Tauri layer before any Rust handler runs, per **[ADR-0006](../06-adrs/ADR-0006-tauri-trust-boundary-and-typed-ipc.md)**.                  |
| S2  | Compromised renderer code attempts direct filesystem, network, or DB access. | Untrusted WebView.               | No path exists: no filesystem, no open TCP port, no DB handle in the renderer. The only seam is the typed, capability-gated invoke bridge.                            |
| S3  | A user exports a surface containing PII.                                     | Any export.                      | Redaction is required and deny-by-default; an export cannot silently leak PII, per the [security baseline](./boundary/security-constraints.md).                       |
| S4  | A threat is assessed against the trust boundary.                             | Design review.                   | The boundary is threat-modelled with **STRIDE** and verified against **OWASP ASVS 5.0**, recorded in **[ADR-0023](../06-adrs/ADR-0023-threat-model-stride-asvs.md)**. |

The full posture and controls are in [`../02-standards/SECURITY.md`](../02-standards/SECURITY.md).

---

## Accessibility

| #   | Stimulus                                                                    | Environment                  | Response (design intent)                                                                                                                |
| --- | --------------------------------------------------------------------------- | ---------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| A1  | A keyboard-only user navigates a dense surface (inspector, matrix, canvas). | No pointer in use.           | Every interactive element is reachable and operable by keyboard, following the WAI-ARIA Authoring Practices Guide patterns.             |
| A2  | A screen-reader user reads an artefact result.                              | Assistive technology active. | Honest-state badges (Generated, Stale, Partial) carry accessible names; the result is conveyed without relying on colour alone.         |
| A3  | The product is audited for conformance.                                     | Release gate.                | The **target** is WCAG 2.2 Level AA conformance, per **[ADR-0024](../06-adrs/ADR-0024-accessibility-baseline-wcag22.md)** _(WCAG 2.2)_. |

Accessibility is realised in the renderer and design system; the architecture's contribution is that honest-state
classification rides on results from the engine, so accessible presentation does not depend on the renderer re-deriving
meaning. See [`../03-design/DESIGN-SYSTEM.md`](../03-design/DESIGN-SYSTEM.md).

---

## Extensibility

| #   | Stimulus                                                   | Environment                          | Response (design intent)                                                                                                                                                                                                                                                                     |
| --- | ---------------------------------------------------------- | ------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| X1  | A new engine is added (e.g. Lexis, Pylon, Sophia, Kerux).  | Existing engines unchanged.          | The engine attaches via the [`engine` harness](./module-dependency-map.md) and reads through Mneme; it joins the [acyclic graph](./boundary/dependency-rules.md) with no cycle and no change to existing engines, per **[ADR-0011](../06-adrs/ADR-0011-module-taxonomy-and-boundaries.md)**. |
| X2  | A new IPC command is added.                                | Renderer and host evolving together. | The command is additive (minor under SemVer); contract docs and contract tests update in the same change; type generation enforces zero drift. See [`boundary/versioning-and-evolution.md`](./boundary/versioning-and-evolution.md).                                                         |
| X3  | The metamodel is extended with a new type or relationship. | Forward-only schema.                 | The extension is additive and recorded; the append-only op log preserves history; older operations resolve under the schema in force when asserted.                                                                                                                                          |
| X4  | A storage backend is added behind the trait.               | Same canonical workspace.            | The renderer and IPC surface are unaware; it is an engine swap, not a UI fork.                                                                                                                                                                                                               |

Extensibility is the practical pay-off of the [dependency rules](./boundary/dependency-rules.md): because coupling is to
traits and contracts, the new part attaches without rippling change through the old.

---

## References & standards

_Informative — quality-scenario method:_

- **arc42** template — quality-scenario structure (usage and change scenarios).
- **ISO/IEC 25010** — the product-quality model whose attribute names (performance efficiency, portability, security,
  recoverability, usability/accessibility, maintainability/extensibility) this document groups by.

_Normative — adopted obligations referenced above:_

- **WCAG 2.2** (W3C) — accessibility conformance target (Level AA).
- **OWASP ASVS 5.0**; **STRIDE** _(Microsoft)_ — security verification and threat frame.
- **Semantic Versioning 2.0.0** — contract evolution.

Full bibliography and the modules that use each source:
[`../02-standards/STANDARDS-REGISTER.md`](../02-standards/STANDARDS-REGISTER.md).

## Related documents

| Document                                                                 | What it covers                                                             |
| ------------------------------------------------------------------------ | -------------------------------------------------------------------------- |
| [`boundary/canonical-vs-derived.md`](./boundary/canonical-vs-derived.md) | The failure-and-recovery runtime view behind the recoverability scenarios. |
| [`boundary/dependency-rules.md`](./boundary/dependency-rules.md)         | The replaceability behind the extensibility scenarios.                     |
| [`boundary/security-constraints.md`](./boundary/security-constraints.md) | The security baseline behind the security scenarios.                       |
| [`module-dependency-map.md`](./module-dependency-map.md)                 | Where new engines attach.                                                  |
| [`../02-standards/SECURITY.md`](../02-standards/SECURITY.md)             | The full security posture.                                                 |
| [`../05-modules/metis/README.md`](../05-modules/metis/README.md)         | Analytics complexity bounds.                                               |
