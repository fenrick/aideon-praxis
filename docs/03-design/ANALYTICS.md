# Analytics

Analytics covers two distinct concerns: the **Metis analytics engine** — deterministic, bounded, explainable computation over the digital-twin model — and **usage telemetry** — opt-in, secret-free event emission for understanding product behaviour.

---

## Part 1 — Metis Analytics Engine

### What Metis Computes

Metis is the crate that earns the right to show a score, ranking, or impact path. It runs deterministic analytical work over the twin and returns typed, evidence-bearing results that the rest of the product can present honestly.

| Capability family       | Example questions answered                                                    |
| ----------------------- | ----------------------------------------------------------------------------- |
| Centrality and ranking  | Which nodes are most connected? What is the PageRank score for this resource? |
| Impact and blast radius | Which downstream nodes are affected if this dependency changes?               |
| Path and reachability   | What is the shortest dependency path between A and B?                         |
| Risk and concentration  | Where is dependency risk concentrated? Which structural weak points exist?    |
| Cost and optimisation   | What is the TCO of this configuration? How do scenarios compare on cost?      |

Each family operates on a bounded input — a workspace, an explicit time context, an optional scenario, and a declared algorithm — and produces the same answer for the same inputs.

### Determinism and Honest Bounds

Every Metis result is deterministic with respect to its input snapshot and algorithm parameters. Non-deterministic inputs are not permitted.

Results carry explicit execution bounds:

- **truncation** — when a graph walk or ranked list is cut at a limit, the result states so
- **approximation** — when an algorithm produces an estimate rather than an exact value, the result states the confidence or the method used
- **warnings** — when input data is sparse, incomplete, or borderline for the declared algorithm

These bounds are not hidden in log files. They surface in the result envelope so that artefacts, dashboards, and inspectors can display them alongside the output.

### Derived, Not Canonical

Analytics outputs are **derived**. They are never written back as canonical model state. A ranking, score, or impact graph is a computation result produced at an explicit `(time, scenario)` context. If the underlying model changes, the result is stale until recomputed — it is not automatically updated and does not silently overwrite authoritative data.

Consumers that persist analytics results (for example, for display in a saved artefact) must record the `(time, scenario, algorithm, computed_at)` provenance so that staleness is detectable.

### Explainability

Metis does not return a score and stop. Every result carries enough supporting structure for the rest of the product to explain the answer:

- contributing nodes or dependencies that drove a ranking
- supporting paths that produced an impact result
- affected-node sets with their relationship to the source
- algorithm parameters and execution timing

This is the analytical evidence that explanation rests on. Praxis may translate that evidence into domain language; Metis must supply the underlying structure.

### Accepted-Work Execution

Heavy analytics jobs — centrality runs, large impact calculations, projection-bound refreshes — run as **accepted work**. Clients submit an analytics command through the host IPC surface; the host routes it through the accepted-work contract; Metis executes and emits progress events.

```
Client → IPC command → AcceptedJob created → Metis executes
                                            ↓
                             progress events (started / updated / completed / failed)
                                            ↓
                             result envelope available for artefact / UI consumption
```

Clients observe the standard job-status model. There is no Metis-specific polling protocol. Progress, completion, cancellation, and failure with a useful message are all surfaced through the shared event contract.

Lightweight queries — single-node lookups, small projection reads — may run inline without going through the accepted-work path, but the boundary is determined by execution cost, not by caller preference.

### Typed Outputs

Metis returns structured result envelopes, not loose blobs. Stable shapes include:

| Result kind       | Fields                                                                            |
| ----------------- | --------------------------------------------------------------------------------- |
| Ranked list       | `items[]` (id, score, rank), `bounds`, `algorithm`, `computed_at`                 |
| Score             | `value`, `confidence`, `contributing_ids[]`, `bounds`                             |
| Impact set        | `affected[]` (id, relationship, depth), `source_id`, `path_sample[]`, `bounds`    |
| Path bundle       | `paths[]`, `source_id`, `target_id`, `algorithm`, `bounds`                        |
| Execution summary | `job_id`, `algorithm`, `input_snapshot`, `duration_ms`, `warnings[]`, `truncated` |

If outputs are too loose, every consuming layer invents its own schema. Stable shapes prevent that.

### What Metis Does Not Own

- Semantic modelling rules — those belong to Praxis
- Storage internals or direct database queries — those belong to Mneme
- Accepted-work and workflow orchestration surfaces — those belong to the host
- App shell behaviour, free-form UI dashboards, or UI layout concerns
- Usage telemetry (see Part 2)

---

## Part 2 — Usage Telemetry

### Posture

Product telemetry is **opt-in**. No telemetry is emitted by default. A user or deployment configuration must explicitly enable it. When enabled, the telemetry posture is:

- no secrets, raw tokens, or credentials in any payload
- no PII by default; `user_context` fields are included only when policy permits
- correlation identifiers rather than loose free-text messages
- bounded, well-defined event families with no unbounded streams
- telemetry must not duplicate or substitute for the analytics engine

### Emitter Locations

Telemetry originates exclusively from two places:

1. **Tauri shell (Rust)** — host-level events: accepted-work lifecycle, IPC errors, app-level session events
2. **Renderer (TypeScript)** — UI interaction events emitted through an injectable sink

No third-party browser trackers. No renderer-initiated HTTP to external endpoints. The renderer sink's default implementation is `console` in development; a host-provided sink is required for any production emission, and that sink must enforce the opt-in gate.

### Minimum Event Shape

```typescript
{
  event_type:     string;          // stable identifier, e.g. "job.accepted"
  occurred_at:    string;          // ISO-8601
  correlation_id: string;          // ties related events together
  workspace_id?:  string;          // where relevant
  scenario_id?:   string;          // where relevant
  user_context?:  object | null;   // only when policy allows; never includes secrets
}
```

### Event Families

**Host / Tauri shell events**

| Event type          | When emitted                                                   |
| ------------------- | -------------------------------------------------------------- |
| `job.accepted`      | An analytics or other heavy job enters the accepted-work queue |
| `job.completed`     | A job completes successfully                                   |
| `job.failed`        | A job fails with an error code                                 |
| `app.session_start` | Application session begins                                     |
| `ipc.error`         | A typed IPC command returns a structured error                 |

**Renderer events**

| Event type               | When emitted                                   |
| ------------------------ | ---------------------------------------------- |
| `template.change`        | Template selection changed                     |
| `template.create_widget` | Widget added from the registry                 |
| `selection.change`       | Selection updated (counts only, no entity IDs) |
| `time.cursor`            | Time context changed                           |
| `inspector.save`         | Property save dispatched                       |
| `error.ui`               | User-visible error banner shown                |

### Non-Goals

- Duplicate Metis analytical outputs in telemetry payloads
- Store raw PII or secrets by default
- Create unbounded event streams with no declared consumer
- Become a second event-sourcing system

---

## References

- Metis module overview: [docs/05-modules/metis/README.md](../05-modules/metis/README.md)
- Artefacts and artefact families: [docs/03-design/ARTEFACTS-AND-FAMILIES.md](ARTEFACTS-AND-FAMILIES.md)
- Contracts and schemas: [docs/04-contracts/CONTRACTS-AND-SCHEMAS.md](../04-contracts/CONTRACTS-AND-SCHEMAS.md)
