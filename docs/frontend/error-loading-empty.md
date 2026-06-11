# Error, Loading, Empty, and Honest State

The contract every surface meets for the states between "nothing yet" and "fully loaded and correct". This file is for anyone building a surface that fetches data or runs work. It maps the renderer's states onto the §9 honest-state vocabulary; it does not redefine that vocabulary.

---

## The principle

A surface is never silent about its state. Loading, empty, partial, stale, rebuilding, in-progress, awaiting-review, generated, and failed are all states the user can see, drawn from one shared vocabulary ([DOCUMENTATION-STANDARD.md §9](../02-standards/DOCUMENTATION-STANDARD.md)) and rendered with the shared honest-state treatments ([honest-state-treatments.md](../03-design/design-system/honest-state-treatments.md)). A confident surface showing something that is stale, partial, or generated as if it were fresh, complete, and asserted is the most expensive failure the product can make ([trust-and-honesty.md](../03-design/trust-and-honesty.md)).

The renderer **must not** fake state. It shows the state the host reports; it does not locally invent freshness, completeness, or a diff the host did not produce ([state-architecture.md](./state-architecture.md)).

## The two axes

State has two orthogonal axes, never collapsed into one badge ([DOCUMENTATION-STANDARD.md §9](../02-standards/DOCUMENTATION-STANDARD.md)):

- **Content classification** — what kind of claim an element is: **Asserted**, **Inferred**, or **Generated**. Rendered with the provenance treatment ([honest-state-treatments.md](../03-design/design-system/honest-state-treatments.md)).
- **Result state** — the condition of a result at the moment it is shown: **Fresh**, **Stale**, **Rebuilding**, **Partial/Bounded**, **In progress**, **Awaiting review**, **Failed**.

A surface element may carry one content classification and any number of result states; a Generated element can also be Stale. The renderer maps host-reported status onto these and never improvises a new badge or colour.

## The states a surface renders

Every data-fetching surface handles these explicitly; a hook exposes `loading` / `error` / `empty` hints and the host's result state, and the component renders the matching treatment ([state-architecture.md](./state-architecture.md)):

| State                     | When                                             | Treatment                                                                                                                                      |
| ------------------------- | ------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| **Loading**               | First fetch in flight, no prior data             | Skeleton or spinner from the design system; never a blank pane                                                                                 |
| **Empty**                 | Fetch succeeded, no results                      | Informative empty state explaining the absence (e.g. "No failed jobs") and, where apt, a safe next action                                      |
| **Error**                 | Fetch or command failed                          | Human-readable message mapped from the error envelope; next actions (retry, open Status, copy diagnostics); never a raw error blob             |
| **Stale**                 | Host reports `ProjectionFreshnessStatus` stale   | Last known good data kept visible with a `Stale` badge; refetch triggered ([data-fetching.md](./data-fetching.md))                             |
| **Rebuilding**            | A derived structure is recomputing               | Prior snapshot shown with a `Rebuilding` badge                                                                                                 |
| **Partial/Bounded**       | A fanout/depth/size/time limit capped the result | A `PartialBanner` states the bound; coverage is never implied complete ([canvas-and-graph.md](../03-design/design-system/canvas-and-graph.md)) |
| **In progress**           | Accepted work still executing                    | Explicit status from the accepted-work strip, not an indefinite spinner ([ux/accepted-work-ux.md](../03-design/ux/accepted-work-ux.md))        |
| **Queued (backpressure)** | Host returned `BACKPRESSURE`                     | A queued state; the write is not shown as landed ([ux/backpressure-ux.md](../03-design/ux/backpressure-ux.md))                                 |
| **Failed**                | Execution errored                                | Partial results, if any, shown with explicit coverage; a human-readable failure summary                                                        |

A loading state **must not** block the whole workspace — artefacts continue rendering using the last known good context where safe, and only the affected pane shows its loading or error state ([chrona-time](./chrona-time/README.md)).

## The error playbook

Errors arrive as the typed error envelope ([error-envelope.md](../04-contracts/ipc/error-envelope.md), RFC 9457, [ADR-0016](../06-adrs/ADR-0016-error-envelope-rfc9457.md)) and are mapped to user-facing messages at the adapter boundary ([ipc-adapters-and-dtos.md](./ipc-adapters-and-dtos.md)). The renderer maps by stable code, not by parsing prose:

| Envelope code class                                      | User-facing message                             | Next action                                                                                      |
| -------------------------------------------------------- | ----------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| Not-permitted (capability denied)                        | "Not permitted" with the reason                 | "Request access" / "Enable capability"                                                           |
| Not-found (`WORKSPACE_NOT_FOUND`, missing branch/commit) | The referenced item no longer exists            | Refresh / reselect                                                                               |
| Invalid input                                            | What input was invalid (e.g. unsupported layer) | Correct the input                                                                                |
| Conflict (`CONFLICT_RECORDED`)                           | A concurrent change was recorded                | Review and reconcile ([ux/multi-user-conflict-ux.md](../03-design/ux/multi-user-conflict-ux.md)) |
| Backpressure (`BACKPRESSURE`)                            | The work is queued                              | Wait; the queued state is shown, not failure                                                     |
| Compatibility-fatal (`SCHEMA_TOO_NEW`)                   | The workspace was written by a newer version    | Update the app ([ADR-0017](../06-adrs/ADR-0017-contract-and-dto-versioning.md))                  |
| Internal                                                 | A stable message                                | "Open Status window" / "Copy diagnostics" with correlation ids (`request_id`, `job_id`)          |

Errors **must** carry correlation ids where present and offer a copy-diagnostics affordance; a raw error object is never shown by default ([mneme-workspace](./mneme-workspace/README.md)).

## Accessibility of state

Honest-state indicators are perceivable without colour alone: a `Generated` or `Stale` element carries text or shape in addition to colour ([ADR-0024](../06-adrs/ADR-0024-accessibility-baseline-wcag22.md), WCAG 1.4.1). A state change is announced through an `aria-live` region where the change is not otherwise focus-driven (e.g. "Time context updated", "Analysis complete") ([accessibility.md](./accessibility.md)). The honesty obligation and the accessibility obligation reinforce each other here.

## Related documents

| Document                                                                            | What it covers                                        |
| ----------------------------------------------------------------------------------- | ----------------------------------------------------- |
| [DOCUMENTATION-STANDARD.md §9](../02-standards/DOCUMENTATION-STANDARD.md)           | The honest-state vocabulary this file maps to.        |
| [honest-state-treatments.md](../03-design/design-system/honest-state-treatments.md) | The visual treatment for each state.                  |
| [error-envelope.md](../04-contracts/ipc/error-envelope.md)                          | The RFC 9457 envelope errors are mapped from.         |
| [ux/honest-state-treatment.md](../03-design/ux/honest-state-treatment.md)           | The behavioural rules for showing state in the shell. |
| [data-fetching.md](./data-fetching.md)                                              | How freshness and invalidation drive these states.    |
