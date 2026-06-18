# MVP UI state machines

The state contract for each MVP renderer surface: every state it can be in, what puts it there, what it shows, and how it announces the change for keyboard and screen-reader users. The MVP surfaces are the shell **content/canvas**, the **catalogue view**, the **inspector**, and the **viewpoint/temporal control**. The honest-state vocabulary is fixed by [DOCUMENTATION-STANDARD §9](../02-standards/DOCUMENTATION-STANDARD.md); the state architecture is fixed by [ADR-0026](../06-adrs/ADR-0026-frontend-state-architecture.md). This file does not invent UI states — it maps the contract's states onto each surface so an implementation cannot decide per-surface what "loading" or "stale" means.

It also **settles the provisional single-user-MVP frontend choices** that ADR-0026 left open, so an agent can build a surface without making an architectural decision. Each settlement is bounded to the MVP and names the ADR it defers to.

---

## Settled MVP frontend choices

ADR-0026 fixes the three-state separation (server-state / UI-state / persistent UI state), viewpoint-keying, and honest-state, and leaves the specific libraries and the persistence store as open questions. For the **single-user MVP**, this contract settles them as follows. These are MVP build decisions, not new invariants; the architecture (ADR-0026) is unchanged.

| Concern                                                                 | MVP choice                                                                                                                                                                                                                                                                                                                                                                         | Grounding                                                                                                                                |
| ----------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| **Server-state** (host reads: projections, artefact results)            | **TanStack Query** (React Query model). Every cache key includes the full `Viewpoint`; changing the viewpoint is a different key, never a refetch of the same key.                                                                                                                                                                                                                 | [ADR-0026](../06-adrs/ADR-0026-frontend-state-architecture.md), [data-fetching](../frontend/data-fetching.md)                            |
| **UI-state** (ephemeral interaction: hover, drag, transient selection)  | **Local component state** (React `useState`/`useReducer`). Not persisted, not shared.                                                                                                                                                                                                                                                                                              | [ADR-0026](../06-adrs/ADR-0026-frontend-state-architecture.md), [state-architecture](../frontend/state-architecture.md)                  |
| **Shared cross-surface UI-state** (current selection, active viewpoint) | A small **Zustand** store, scoped to the renderer session. Selection and the active viewpoint are read by content, inspector, and the viewpoint control; they are not server truth and not written to the op log.                                                                                                                                                                  | [ADR-0026](../06-adrs/ADR-0026-frontend-state-architecture.md) (UI-state, not server-state)                                              |
| **Persistent UI-state** (panel layout, active theme, column widths)     | Held in the Zustand store and persisted via **one mechanism: `tauri-plugin-store`** (a single JSON store file in the platform config directory). It is not workspace-canonical material, not in the op log, not synced.                                                                                                                                                            | [ADR-0026](../06-adrs/ADR-0026-frontend-state-architecture.md) (persistent UI state is local), [AGENTS plugin guidance](../../CLAUDE.md) |
| **Forms** (inspector edits)                                             | **React Hook Form**, validating against the effective schema before the write IPC command.                                                                                                                                                                                                                                                                                         | [CODING-STANDARDS](../02-standards/CODING-STANDARDS.md) frameworks-first defaults                                                        |
| **Optimistic writes**                                                   | **None in the MVP.** A write reflects `queued` (on `BACKPRESSURE`) or `saving`, then the result; it does not pre-paint success. Optimistic updates are deferred because their reconciliation against `CONFLICT_RECORDED` is an unresolved open question ([ADR-0026](../06-adrs/ADR-0026-frontend-state-architecture.md), [error-envelope](../04-contracts/ipc/error-envelope.md)). | [ADR-0026](../06-adrs/ADR-0026-frontend-state-architecture.md) open question                                                             |
| **Cross-window state sync**                                             | **Deferred.** Each window holds its own server-state cache and Zustand store; persistent UI-state is read from the shared store file on mount but not live-synced between windows.                                                                                                                                                                                                 | [ADR-0026](../06-adrs/ADR-0026-frontend-state-architecture.md) ("what is deferred: cross-window state sharing")                          |
| **State-change announcement**                                           | An `aria-live` polite region for non-focus-driven changes (viewpoint change, analysis complete, stale→fresh); honest-state badges carry text or shape, never colour alone.                                                                                                                                                                                                         | [ADR-0024](../06-adrs/ADR-0024-accessibility-baseline-wcag22.md), [accessibility](../frontend/accessibility.md)                          |

A formal library decision (TanStack Query / Zustand / `tauri-plugin-store`) is design-intent until ratified into ADR-0026; this table is the MVP build choice the surfaces below assume.

---

## The shared state vocabulary

Every surface draws its states from the two honest-state axes ([DOCUMENTATION-STANDARD §9](../02-standards/DOCUMENTATION-STANDARD.md)). A surface carries **one** content classification per element and **any number** of result states; the axes never collapse into one badge.

- **Result state** (condition of the shown result): `loading` / `empty` / `validationError` / `hostFailure` / `backpressure` (queued) / `partialBounded` / `stale` / `rebuilding` / `recovery`. These map to §9's _Fresh / Stale / Rebuilding / Partial-or-Bounded / In progress / Awaiting review / Failed_ plus the input states (`loading`, `empty`, `validationError`) and the transport states (`backpressure`, `hostFailure`) the renderer adds at the IPC boundary ([error-loading-empty](../frontend/error-loading-empty.md)).
- **Content classification** (kind of claim): `asserted` / `inferred` / `generated` — set by Praxis, displayed by the renderer, never decided by it ([content-classification](../03-design/artefacts/content-classification.md)).

The error states map to the [error envelope](../04-contracts/ipc/error-envelope.md) categories: `validation` → `validationError`, `permission`/`internal` → `hostFailure`, `conflict` → a reconcile/refresh prompt, `transient`/`BACKPRESSURE` → `backpressure`.

---

## Surface: shell content / canvas

The shared surface that renders the licensed engines' widgets ([shell](../frontend/shell.md), `PlatformContent`). In the MVP it hosts the catalogue view.

| State            | Entered when                                                        | Shows                                                                                           | Keyboard / a11y                                              |
| ---------------- | ------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| `loading`        | First mount or viewpoint change; server-state query is fetching     | Skeleton of the content region; preserves layout dimensions                                     | Focus stays on the trigger; `aria-busy="true"` on the region |
| `empty`          | Query resolved with no widget to show (no artefact selected)        | Empty-state prompt ("Choose an artefact") with a clear next action                              | Prompt is focusable; describes the action                    |
| `hostFailure`    | IPC returned `permission`/`internal` error                          | Inline alert with the `title`; a `report`/retry affordance; no raw path or stack                | Alert is `role="alert"`; focus moves to it                   |
| `partialBounded` | Result carried `partialBounded` with `coverage`                     | The computed content plus a coverage banner stating which bound was hit                         | Banner announced via `aria-live` polite                      |
| `stale`          | `mneme_change_event` invalidated the viewpoint key; refetch pending | Prior content dimmed with a `Stale` badge (text + shape, not colour alone)                      | "Content out of date, refreshing" announced                  |
| `rebuilding`     | An `AcceptedJob` rebuild is in flight (step 10)                     | Prior content with a `Rebuilding` badge and progress from `RunEvent`                            | Progress announced at coarse intervals, not per event        |
| `recovery`       | After reopen/rebuild; content re-resolves                           | Restored content; equivalence to pre-wipe state ([golden-journey](./golden-journey.md) step 10) | "Workspace restored" announced once                          |

**Persistence:** the content region's split sizes (`Resizable`) are persistent UI-state in the store file; the selected artefact is shared UI-state in the Zustand store. **Across reload:** layout restores from the store; the artefact result is refetched (server-state is a cache, not truth). **Across renderer restart:** identical to reload — layout from the store file, results refetched after the setup handshake ([shell](../frontend/shell.md)).

---

## Surface: catalogue view

Renders the [catalogue result](../04-contracts/artefact-results/catalogue-result.md) from `praxis_artefact_execute_catalogue` ([M3-artefacts](./M3-artefacts.md)). The renderer **reflects** Praxis's filter/sort/page; it never re-slices ([catalogue-result](../04-contracts/artefact-results/catalogue-result.md)). Built on TanStack Table over the TanStack Query result.

| State                               | Entered when                                                   | Shows                                                                                                                                     | Keyboard / a11y                                                  |
| ----------------------------------- | -------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| `loading`                           | Execute query fetching for the current viewpoint+sort+page key | Table-shaped skeleton with the known columns                                                                                              | `aria-busy` on the table; column headers present                 |
| `empty`                             | Result has zero rows (scope matched nothing)                   | "No applications in scope at this viewpoint" with the viewpoint named                                                                     | Message focusable; names the active viewpoint                    |
| `validationError`                   | Request rejected `INVALID_INPUT` (e.g. bad sort key)           | Inline error on the offending control; the prior valid result stays shown                                                                 | `role="alert"`; focus to the control                             |
| `hostFailure`                       | `internal` error during execution                              | Alert in place of the table; retry affordance                                                                                             | `role="alert"`; focus moves to it                                |
| `partialBounded`                    | Result `resultState` includes `partialBounded`                 | The returned rows plus a coverage banner (which bound, what was reached)                                                                  | Banner announced; rows remain navigable                          |
| `paged` (normal)                    | `page.hasMore` is true                                         | Full page of rows; next/prev controls reflecting `offset`/`total`; **not** a `partialBounded` state — pagination is completeness-in-pages | Pager is keyboard-operable; "Page 1 of N, showing rows 1–2 of 3" |
| `stale`                             | `mneme_change_event` invalidated the key                       | Rows dimmed with a `Stale` badge; auto-refetch                                                                                            | "Catalogue out of date, refreshing" announced                    |
| `cell classification` (per element) | Always                                                         | Each cell shows its `asserted`/`inferred` badge; `inferred` (e.g. `health`) is visibly distinct by text/shape                             | Each cell's classification is in its accessible name             |

**Sort/page changes** re-key the server-state query (a new viewpoint+sort+page key), producing a `loading`→result transition; the renderer issues a new execute command, it does not sort client-side. **Persistence:** column widths are persistent UI-state (store file); the current sort/page is shared UI-state (Zustand), restored on reload but the result itself is refetched. **Across renderer restart:** sort/page restore from the store, the catalogue is re-executed against the host.

---

## Surface: inspector

Selection-driven contextual details and the MVP's editing forms ([shell](../frontend/shell.md), `PlatformInspector`; [selection-model](../03-design/ux/selection-model.md)).

| State                   | Entered when                                                    | Shows                                                                                      | Keyboard / a11y                                                                                                  |
| ----------------------- | --------------------------------------------------------------- | ------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------- |
| `empty`                 | No selection                                                    | "Select an item to inspect" prompt                                                         | Prompt focusable                                                                                                 |
| `loading`               | Selection changed; entity read fetching at the viewpoint        | Skeleton of the detail fields                                                              | `aria-busy`; selection name shown immediately if known                                                           |
| `viewing`               | Entity resolved                                                 | Slots with per-slot `asserted`/`inferred` classification; the viewpoint that resolved them | Each field's classification in its accessible name                                                               |
| `editing`               | User begins an edit (React Hook Form)                           | Editable fields validated against the effective schema before submit                       | Field-level validation messages tied to inputs (`aria-describedby`)                                              |
| `validationError`       | Client-side schema validation or `INVALID_INPUT` from the write | The offending field flagged; submit blocked; no op attempted                               | `role="alert"` on the field error; focus to it                                                                   |
| `saving`                | Write IPC in flight (no optimistic paint)                       | Submit shows a busy state; fields locked                                                   | "Saving" announced                                                                                               |
| `backpressure` (queued) | Write returned `BACKPRESSURE` (`transient`/`retry`)             | A **queued** badge, not a failure; retry honours the idempotency key                       | "Change queued, will retry" announced ([backpressure](../04-contracts/accepted-work-and-events/backpressure.md)) |
| `conflict`              | Write returned `CONFLICT_RECORDED`                              | A reconcile/refresh prompt; the edit is not silently dropped                               | `role="alert"`; offers refresh-and-retry                                                                         |
| `hostFailure`           | `internal` error on the write                                   | Alert; the form keeps the user's input for retry                                           | `role="alert"`; focus to it                                                                                      |
| `stale`                 | The viewed entity's viewpoint key was invalidated               | Fields dimmed with `Stale`; re-read                                                        | "Details out of date, refreshing" announced                                                                      |

**No optimistic write:** the inspector never shows a value as saved before the host confirms; it shows `saving` → result, or `backpressure`/`conflict`/`hostFailure` ([ADR-0026](../06-adrs/ADR-0026-frontend-state-architecture.md) open question). **Persistence:** the inspector's open/closed state and width are persistent UI-state (store file); the current selection is shared UI-state (Zustand). **Across reload/restart:** the panel geometry restores; the selection restores from the store, and the selected entity is re-read from the host.

---

## Surface: viewpoint / temporal control

The always-visible control in the toolbar for as-of valid time, layer, and scenario ([shell](../frontend/shell.md), [time-and-scenario-ux](../03-design/ux/time-and-scenario-ux.md)). Time is the coordinate system, never ambient: this control names which version of the twin every other surface is showing, and changing it **re-keys all server-state** ([state-architecture](../frontend/state-architecture.md), [ADR-0026](../06-adrs/ADR-0026-frontend-state-architecture.md)).

| State             | Entered when                                    | Shows                                                         | Keyboard / a11y                                         |
| ----------------- | ----------------------------------------------- | ------------------------------------------------------------- | ------------------------------------------------------- |
| `current`         | Steady state                                    | The active viewpoint: valid time, layer, scenario             | Each control labelled; current value in its name        |
| `editing`         | User opens a control                            | Date picker / layer select / scenario select; not yet applied | Standard combobox/listbox keyboard model                |
| `validationError` | An entered time is unparseable or out of range  | Inline error; the prior viewpoint stays active                | `role="alert"`; the bad value is not applied            |
| `applying`        | A new viewpoint is committed                    | All dependent surfaces enter `loading` as their keys change   | "Time context updated" announced via `aria-live` polite |
| `scenarioLoading` | Scenario list fetching (`praxis_scenario_list`) | The scenario picker shows a loading affordance                | `aria-busy` on the picker                               |

**The viewpoint is shared UI-state** (Zustand), the single coordinate every cache key carries. Changing it does **not** mutate the twin — it is a read coordinate, never written to the op log. **Persistence:** the **MVP persists the last-used viewpoint** as persistent UI-state (store file), so reopening a workspace restores the user's last as-of/layer/scenario rather than snapping to a default — whether this should instead be workspace-scoped is design-intent. **Across reload/restart:** the viewpoint restores from the store file on mount; every surface then refetches at that viewpoint. A scenario that no longer exists falls back to `base` with an announced notice.

---

## Persistence summary

| What                                       | Kind                | Store                     | Survives reload                       | Survives renderer restart | Synced across windows |
| ------------------------------------------ | ------------------- | ------------------------- | ------------------------------------- | ------------------------- | --------------------- |
| Panel layout / split sizes / column widths | Persistent UI-state | `tauri-plugin-store` file | Yes                                   | Yes                       | No (read on mount)    |
| Active theme                               | Persistent UI-state | `tauri-plugin-store` file | Yes                                   | Yes                       | No                    |
| Last-used viewpoint                        | Persistent UI-state | `tauri-plugin-store` file | Yes                                   | Yes                       | No                    |
| Current selection                          | Shared UI-state     | Zustand (session)         | No (restored from store if persisted) | No                        | No                    |
| Hover / drag / transient                   | UI-state            | Local component           | No                                    | No                        | No                    |
| Artefact results / projections             | Server-state        | TanStack Query cache      | No (refetched)                        | No (refetched)            | No                    |

Server-state is a cache of host truth, never canonical; on reload or restart the renderer is a blank cache that refetches at the restored viewpoint after the setup handshake ([ADR-0026](../06-adrs/ADR-0026-frontend-state-architecture.md), [shell](../frontend/shell.md)). The split is the rule: conflating server-state with persistent UI-state is the source of stale reads and lost layout.

---

## Exit tests

| Assertion                                                                                                                                                   | Grounding                                                                                                                                        |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| Changing the viewpoint re-keys server-state: the catalogue re-executes at the new viewpoint, the old result is not served.                                  | [ADR-0026](../06-adrs/ADR-0026-frontend-state-architecture.md), [data-fetching](../frontend/data-fetching.md)                                    |
| A paged catalogue shows a pager and is **not** flagged `partialBounded`; a bound-capped result **is**, with coverage.                                       | [catalogue-result](../04-contracts/artefact-results/catalogue-result.md), [DOCUMENTATION-STANDARD §9](../02-standards/DOCUMENTATION-STANDARD.md) |
| An `inferred` cell (`health`) is visually distinct from `asserted` cells by text/shape, not colour alone, and its classification is in its accessible name. | [ADR-0024](../06-adrs/ADR-0024-accessibility-baseline-wcag22.md), [content-classification](../03-design/artefacts/content-classification.md)     |
| A `BACKPRESSURE` write shows a `queued` state, not a failure, and a retry carries the same idempotency key.                                                 | [backpressure](../04-contracts/accepted-work-and-events/backpressure.md), [idempotency](../04-contracts/ipc/idempotency.md)                      |
| A write is never painted as saved before the host confirms (no optimistic update).                                                                          | [ADR-0026](../06-adrs/ADR-0026-frontend-state-architecture.md)                                                                                   |
| `mneme_change_event` moves an affected surface to `stale` and triggers a refetch; it is never silently left fresh.                                          | [ADR-0027](../06-adrs/ADR-0027-projection-consistency-model.md), [data-fetching](../frontend/data-fetching.md)                                   |
| Panel layout, theme, and last viewpoint survive reload and renderer restart via the store file; server-state does not.                                      | persistence summary above                                                                                                                        |
| A viewpoint or analysis change is announced through an `aria-live` region.                                                                                  | [accessibility](../frontend/accessibility.md), [ADR-0024](../06-adrs/ADR-0024-accessibility-baseline-wcag22.md)                                  |

---

## Related documents

| Document                                                               | What it covers                                                       |
| ---------------------------------------------------------------------- | -------------------------------------------------------------------- |
| [M3-artefacts.md](./M3-artefacts.md)                                   | The milestone whose surfaces these state machines describe.          |
| [mvp-command-registry.md](./mvp-command-registry.md)                   | The commands and events the surfaces call and react to.              |
| [ADR-0026](../06-adrs/ADR-0026-frontend-state-architecture.md)         | The server/UI/persistent state separation and viewpoint-keying.      |
| [DOCUMENTATION-STANDARD §9](../02-standards/DOCUMENTATION-STANDARD.md) | The honest-state vocabulary (content classification × result state). |
| [frontend/shell.md](../frontend/shell.md)                              | The four shell regions these surfaces live in.                       |
| [frontend/error-loading-empty.md](../frontend/error-loading-empty.md)  | The loading/empty/error treatment the state tables apply.            |
| [frontend/data-fetching.md](../frontend/data-fetching.md)              | The viewpoint-keyed cache contract.                                  |
