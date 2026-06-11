# Aideon Desktop — UX Contract

The runtime UX contract: shell structure, selection model, drill-down (result → explanation → action), time and scenario controls, accepted-work and backpressure UX, and honest treatment of partial, stale, and generated state. Behaviour-level only — pixels belong in [DESIGN-SYSTEM.md](./DESIGN-SYSTEM.md).

---

## Shell Structure

The shell has four permanent regions. Their proportions vary by workspace, but their roles never change.

```
┌──────────────────────────────────────────────────────────┐
│  Toolbar  (workspace identity · time · scenario · status) │
├────────┬─────────────────────────────────────┬────────────┤
│        │                                     │            │
│  Nav   │        Content surface              │ Inspector  │
│  rail  │        (artefact dominant)          │  rail      │
│        │                                     │            │
└────────┴─────────────────────────────────────┴────────────┘
```

### Navigation rail

The navigation rail is the stable left edge of the product. It reads as product structure, not as a feed or launcher.

It carries the workspace switcher, main navigation groups, and pinned or recent destinations. Status badges appear here only when they clarify a destination — not to turn the rail into a scoreboard. Settings and support entry points sit at the bottom edge. The rail should feel quiet, dense, and steady. Active state is always obvious. Counts and badges remain secondary to labels.

### Workspace toolbar

The toolbar sits above the active surface and carries the controls that change the meaning of the current view.

It holds the workspace title, the artefact or task identity, time and scenario controls, local filters, primary actions, and an accepted-work or freshness summary when that belongs in the current flow. It behaves as a control band, not a marketing header. Short labels come first. Nothing important is hidden behind overflow until the surface is genuinely out of room.

**Time and scenario controls are always visible here.** They are not optional or collapsible. Every surface the user looks at has a temporal context; the toolbar makes that context readable without a secondary click.

### Content surface

The content surface is where the product earns its keep. It may show a graph, a table, a matrix, a map, a report page, or a guided review flow. The active question stays obvious. The surface is not buried under ornamental chrome.

The content surface is always dominant. Secondary work belongs in the inspector, drawers, or sheets — not stacked on top of the main view.

### Inspector rail

The inspector rail is where selection becomes explanation, editing, provenance, and valid action.

It opens with a clear selection summary and then stacks the relevant sections: properties, explanation, provenance, differences, valid actions. When the shell allows collapse, that control stays stable and unobtrusive. The rail feels attached to the selected object. It does not look like a separate mini-app with its own unrelated layout logic.

---

## Artefacts as Primary Outputs

Aideon is not a generic admin surface with diagrams dropped into it. The product opens on a useful artefact, not on empty chrome.

The main artefact families are **views**, **catalogues**, **matrices**, **maps**, and **report or page surfaces**. All artefacts execute with explicit time and scenario context. The UI surfaces those inputs and sends them on every relevant request.

Artefact results include diagram or layout specs. The renderer honours that structure — it does not invent semantics that the backend did not assert.

### Artefact frame anatomy

Every artefact frame carries the same outer structure regardless of family:

| Region           | Content                                                 |
| ---------------- | ------------------------------------------------------- |
| Title area       | Artefact name, context row (time, scenario, layer)      |
| Content body     | Rendered result: graph, table, matrix, map, chart, page |
| Caveat area      | Partial, stale, generated, or bounded-result notices    |
| Drill-down strip | Actions: explain, inspect, navigate to source, run task |

Using the same outer frame across all families means the user reads them as related products, not as unrelated custom screens.

---

## Selection Model

Selection is global inside a workspace. Once the user selects something meaningful, the rest of the workspace responds predictably.

| Property           | Behaviour                                                                                                            |
| ------------------ | -------------------------------------------------------------------------------------------------------------------- |
| Selection kinds    | `node`, `edge`, `cell`, `artefact`, `none`                                                                           |
| Cardinality        | Single primary selection; multi-select is permitted but one item remains primary                                     |
| Context            | Selection carries the originating artefact or widget id                                                              |
| Inspector response | Updates immediately to properties, explanation, provenance, differences, and valid actions for the primary selection |
| Action sharpening  | Available actions narrow to those valid for the selected object in its current state                                 |

Selection is not decoration. It is the mechanism that keeps the inspector, the action strip, and the drill-down path coherent. If selection behaves inconsistently across surfaces, the whole interaction spine breaks.

---

## Drill-down: Result → Explanation → Action

Drill-down is the standard path from a rendered result to understanding to work. It should never require a mental-model switch.

```
Artefact result
    └─▶ Inspector: properties + explanation + provenance
            └─▶ Action strip: valid tasks for this object
                    └─▶ Accepted-work → completion or failure
```

### Explanation and provenance

A result exposes its active context, freshness, and main caveats close to the work surface — not in a footnote appended elsewhere.

Generated, inferred, or simplified content exposes review paths instead of behaving like settled truth. Provenance and explanation are part of the normal drill-down path, not appendix content.

The inspector **Provenance block** shows:

- Source or origin
- Time and scenario context at the point of assertion
- Freshness or resolution cue
- Path to deeper evidence

Explanation is how the product earns the right to ask for a decision. If the user cannot tell why something is showing before being asked to trust it, the UI is failing its contract.

### Inspector section stack

```
Inspector rail
├── Selection summary        (what is selected, from which artefact)
├── Properties section       (editable fields with field rows)
├── Explanation section      (why this result, what context drove it)
├── Provenance section       (source, freshness, generation flags)
├── Differences section      (vs. baseline, vs. scenario, vs. prior time)
└── Actions section          (valid tasks with action strip)
```

---

## Time and Scenario UX

Time is not a filter. Time is the coordinate system. Every result is only meaningful relative to its temporal context.

### Invariants

- Time controls are always visible in the toolbar. They are never hidden, collapsed, or moved to a settings screen.
- The active temporal context — valid time, asserted time, plan vs. actual layer, and optional scenario — is readable without a secondary click.
- Time or scenario changes trigger re-execution or explicit refresh. They do not cause silent local mutation of already-rendered content.

### What the toolbar surfaces

| Control       | What it exposes                                                 |
| ------------- | --------------------------------------------------------------- |
| Valid time    | The point-in-time or period the model is queried for            |
| Asserted time | When facts were recorded (bi-temporal, when applicable)         |
| Layer         | Plan vs. Actual, or the named temporal layer                    |
| Scenario      | Active scenario overlay: Baseline, Target, or named alternative |

### Scenario overlays

Scenarios are explicit. When a scenario is active, the UI marks results that differ from the baseline scenario. The **Differences section** in the inspector shows before/after for any field that has a scenario delta.

Scenario comparisons are rendered as a **Difference block**: the compared value, before state, after state, and an optional reason or impact cue. The block stays literal. The user should be able to read what changed without decoding a visual trick.

---

## Accepted-Work UX

Long-running operations — imports, recalculations, scenario promotions, large comparisons, export generation — appear as accepted work with explicit status. They do not present as vague spinners, and the user does not need to babysit the screen.

### Lifecycle

```
Submit
  └─▶ AcceptedJob  (system acknowledged the work, assigned a job id)
        ├─▶ Running      (progress events streaming)
        ├─▶ Warning      (running but with caveats)
        ├─▶ Cancelled    (user or system cancelled)
        ├─▶ Failed       (terminal failure)
        └─▶ Completed    (work finished, results available)
```

All modules use the same status vocabulary: `accepted`, `running`, `warning`, `failed`, `cancelled`, `completed`. The UI does not invent private polling protocols for individual modules. See [../04-contracts/ACCEPTED-WORK-AND-EVENTS.md](../04-contracts/ACCEPTED-WORK-AND-EVENTS.md) for the event contract.

### Accepted-work strip

The accepted-work strip is the shared inline summary for running or recently completed work. It appears in the toolbar when relevant work is in flight.

| Slot         | Content                                                                   |
| ------------ | ------------------------------------------------------------------------- |
| Work label   | Plain-language description of what is running                             |
| State badge  | `accepted` / `running` / `warning` / `failed` / `completed` / `cancelled` |
| Progress cue | Percentage or step counter when the backend streams it                    |
| Recency note | Timestamp or "just now"                                                   |
| Detail link  | Opens the full accepted-work status surface                               |

The strip looks product-wide and boring in the best sense. It is infrastructure the user learns by repetition.

### No silent success

If the UI submits a write and receives an `AcceptedJob` response, it renders that acceptance state. It does not pretend the write has already landed. The content surface shows the last confirmed state until a `completed` event arrives and the artefact refreshes.

---

## Backpressure and Write-Queue UX

When the write queue is saturated, the UI renders an explicit **BACKPRESSURE / queued** state rather than pretending a submitted write landed immediately.

### Backpressure states

| State          | What it means                                 | What the UI shows                                         |
| -------------- | --------------------------------------------- | --------------------------------------------------------- |
| `queued`       | Write accepted but queued behind earlier work | Queue depth indicator, estimated wait if available        |
| `backpressure` | Queue saturated, new writes are held          | Explicit notice: "System is busy — your change is queued" |
| `resumed`      | Queue draining, writes proceeding             | Backpressure notice clears, strip updates                 |

### Rules

- The UI never renders an optimistic "saved" confirmation when a write is in a `queued` or `backpressure` state.
- The backpressure notice appears close to the action that produced it — in the inspector action strip or in an inline field row state cue — not silently in a remote corner.
- Users may submit further work while backpressure is active. The queue depth increments visibly. This is normal; the product should not lock the UI.
- Backpressure clears automatically when the queue drains. The UI does not require the user to manually dismiss it.

---

## Honest State Treatment

The UI must never present a partial, stale, generated, or bounded result as if it were complete, fresh, asserted, or unbounded. This is a core product invariant, not a nice-to-have.

### State vocabulary

| State          | Meaning                                                           | Required treatment                                                     |
| -------------- | ----------------------------------------------------------------- | ---------------------------------------------------------------------- |
| **Partial**    | Result was bounded by size, time, or query limits                 | Show what was omitted, capped, or bounded in the caveat area           |
| **Stale**      | Cached result is out of date relative to current inputs           | Surface staleness cue with the last-computed timestamp; offer refresh  |
| **Rebuilding** | A background recompute is in progress; last result is still shown | Show a rebuilding indicator; do not hide the last result               |
| **Generated**  | Content was produced by an inference or AI process                | Mark as generated; expose review path; do not present as asserted fact |
| **Asserted**   | Fact was explicitly entered by a user or authoritative source     | No special flag needed; this is the baseline                           |
| **Inferred**   | Fact was derived from other asserted facts by a rule              | Mark as inferred; expose the derivation path                           |

### Caveat area

The caveat area sits beneath the content body in every artefact frame. It is not an error panel. It is a disclosure surface.

A partial-result notice names: what was returned, what was omitted or capped, and why (size limit, time limit, query constraint). A stale notice names: the last-computed time and the reason it has not been refreshed. A generated or inferred notice names: the process that produced it and the path to deeper evidence or review.

### Warning and partial-result panel

When a caveat is significant enough to affect user decisions, it escalates from an inline notice to a full warning panel. The panel carries:

- Severity label
- Concise problem statement
- Affected scope
- Reason
- Next action (refresh, review, constrain the query)

The panel is visually distinct from success or neutral metadata. It is a caution surface, not a toast.

---

## Editing Flow

Edits are task-based. The product does not drift into generic data-entry behaviour where users silently edit persistence shapes.

1. Selection updates the global shell state.
2. The inspector renders the appropriate edit surface — field rows, property lists, or a dedicated form.
3. Save or apply triggers a typed command through the host API over typed IPC. The renderer never mutates durable truth directly.
4. The result is an `AcceptedJob`. Cache refresh and projection invalidation happen through platform contracts, not ad hoc UI mutation.
5. The inspector reflects the `accepted` state immediately and updates to the completed result when the job finishes.

### Field row states

Each field row carries enough context that the user can understand the value without a separate lookup:

| Cue                | Meaning                                                  |
| ------------------ | -------------------------------------------------------- |
| Plain value        | Asserted, current, authoritative                         |
| `generated` badge  | Produced by inference or AI; review path available       |
| `inherited` badge  | Sourced from a parent or template scope                  |
| `stale` cue        | Value has not been recomputed since a dependency changed |
| Validation message | Structural constraint violated; blocks save              |

---

## Workspace Family

### Workspace home

Gets users back into useful work quickly. Favours recency, active scenarios, and unfinished work over generic welcome content. Uses **workbench cards** and **queue strips** — not a consumer-style homepage.

### Modelling studio

The expert work surface. Structured editing, exploration, scenario awareness, explainability, and artefact authoring come together here. Uses the **canvas shell** as its primary content surface.

### Artefact family library

The antidote to blank-canvas thinking. Users start from known-good artefacts organised by question, audience, and abstraction level. Backed by [ARTEFACTS-AND-FAMILIES.md](./ARTEFACTS-AND-FAMILIES.md).

### Scenario studio

Lets users work explicitly with baseline, target, and alternative futures. Creating scenarios is the easy part; comparing, explaining, reviewing, and promoting them is the product's job.

### Review and contribution

The bounded workspace for SMEs, stewards, and other non-expert contributors. Uses plain business language. Does not require users to absorb the whole model.

### Executive briefing

Surfaces that survive contact with decision-makers: legible in meetings, defensible under questioning, usable in packaged output. Uses **scorecard frames** and **ranked list frames**.

### Import and mapping

External material meets the controlled language of the product here. Every step is reviewable, reversible, and explicit about uncertainty. Quiet ingestion is how weak source material gets promoted into false certainty.

### Administration and controls

Plain, explicit, and dull in the best way. Access, templates, integration controls, automation rules, and audit. Scope — personal, workspace, or organisation — is always unmistakable.

---

## Component Contracts

Component names here are authoritative. Any design-system implementation of these components lifts its behavioural contract from this document.

### Artefact and dashboard containers

| Component      | Role                                                                                                                   |
| -------------- | ---------------------------------------------------------------------------------------------------------------------- |
| Artefact frame | Generic container for all artefact families: graph, table, matrix, map, chart, page, report                            |
| Widget frame   | Dashboard or workbench unit: title, scope subtitle, action slot, body, state region, footer metadata                   |
| Table shell    | Dense analytical list or grid with integrated filter, sort, grouping, selection summary, and bounded-state treatment   |
| Chart shell    | Chart wrapper: title, question/measure label, legend, chart region, caveat area — never a decorative colour patch      |
| Canvas shell   | Graph and direct-manipulation surface: local command strip, view controls, canvas region, overlay slot, inspector path |

### Editing and inspector components

| Component         | Role                                                                                                    |
| ----------------- | ------------------------------------------------------------------------------------------------------- |
| Inspector section | Vertical unit inside the inspector; heading + body + optional summary row or local actions; stacks well |
| Field row         | Shared editing unit: label, value or control, help text, validation message, status cue                 |
| Property list     | Read-heavy inspector content: term + value pairs, optional badge treatment, action links                |
| Difference block  | Changed values, compared contexts, scenario deltas: before/after states, optional reason or impact cue  |
| Provenance block  | Source, freshness, generation context: origin, time/scenario, freshness cue, evidence path              |
| Action strip      | Contextual actions: primary, secondary, destructive (visually separated), disabled/review-state cues    |

### Feedback and status components

| Component                        | Role                                                                                                                    |
| -------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| Loading block                    | Known work in progress: short label, optional progress cue, placeholder content sized close to eventual surface         |
| Empty state                      | Valid absence: plain explanation, current scope/filter restatement, next useful action                                  |
| Warning and partial-result panel | Severity label, problem statement, affected scope, reason, next action; partial variant names what was omitted          |
| Error panel                      | Blocked work: failure statement, affected scope, safety of prior content, next reasonable action (retry/inspect/return) |
| Accepted-work strip              | Running or recently completed work: label, state, progress, recency, detail link                                        |

### Host-surface components

| Component            | Role                                                                                                                 |
| -------------------- | -------------------------------------------------------------------------------------------------------------------- |
| Workbench card       | Workspace home / resume: title, why-it-matters summary, context row, status/queue cue, entry action                  |
| Queue strip          | Compact horizontal summary: one label, one count or state, small metadata note, open action                          |
| Scorecard frame      | Executive briefing unit: measure title, scope and time context, current value, caveat area, evidence drill-down      |
| Admin section layout | Settings container: section title, scope label, grouped controls, warning area for consequential actions, audit link |

### Assisted-work and signal components

| Component                | Role                                                                                                                          |
| ------------------------ | ----------------------------------------------------------------------------------------------------------------------------- |
| Assistant entry bar      | Contextual prompt start: prompt field, visible context tokens, submit action, optional mode switch                            |
| Assistant response frame | Declares response type, shows context used, carries body, evidence/caveat slot, next-action slot                              |
| Suggestion list          | Multiple reviewable suggestions: list heading, item rows with visible status, list-level action only where batch review helps |
| Mapping suggestion row   | One proposed match: match, reason, confidence/caveat cue, accept/reject/inspect actions — no silent auto-accept               |
| Signal banner / panel    | Signal type declaration, statement, affected scope, strength cue, evidence link, next action                                  |
| Ranked list frame        | Prioritised outputs: ranking question stated plainly, ordered items, score/rank cue, context note, explanation path           |
| Recommendation card      | One proposed action: recommendation, reason, caveat/confidence cue, inspect/accept/defer actions                              |
| Review task row          | Work from a signal or rule: task label, trigger summary, owner/target, status, due/recency cue, open action                   |

---

## Accessibility and Performance

- Keyboard navigation is required for all artefact flows and inspector interactions.
- Colour never carries meaning alone. All state distinctions have a secondary cue (label, icon, or pattern).
- Overlays include legends.
- Large tables are virtualised.
- Graph-heavy views use bounded detail with explicit warnings when they truncate or simplify.
- Skeletons are used where layout continuity matters during load. Progress text is used where accepted work is already running.

---

## Related Documents

| Document                                                                                             | What it covers                                         |
| ---------------------------------------------------------------------------------------------------- | ------------------------------------------------------ |
| [DESIGN.md](./DESIGN.md)                                                                             | Overall design contract and shell layout               |
| [DESIGN-SYSTEM.md](./DESIGN-SYSTEM.md)                                                               | Pixel-level tokens, components, and visual language    |
| [ARTEFACTS-AND-FAMILIES.md](./ARTEFACTS-AND-FAMILIES.md)                                             | Artefact families, family taxonomy, rendering specs    |
| [SIGNAL-SURFACES.md](./SIGNAL-SURFACES.md)                                                           | Signal, recommendation, and review-task surfaces       |
| [DESKTOP-FIRST-WORKSPACE.md](./DESKTOP-FIRST-WORKSPACE.md)                                           | Desktop-specific workspace layout and split-pane rules |
| [../04-contracts/TEMPORAL-AND-SCENARIO-CONTEXT.md](../04-contracts/TEMPORAL-AND-SCENARIO-CONTEXT.md) | Temporal and scenario context contract                 |
| [../04-contracts/ACCEPTED-WORK-AND-EVENTS.md](../04-contracts/ACCEPTED-WORK-AND-EVENTS.md)           | Accepted-work lifecycle and event schema               |
| [../05-modules/chrona/README.md](../05-modules/chrona/README.md)                                     | Chrona module: time and scenario engine                |
| [../05-modules/host/README.md](../05-modules/host/README.md)                                         | Host module: IPC, command routing, renderer contract   |
