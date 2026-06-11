# Testing Strategy

How renderer surfaces are tested: the layers, the tools, and where the IPC boundary is mocked. This file is for anyone writing or reviewing renderer tests. It is the renderer slice of the suite [testing strategy](../02-standards/TESTING-STRATEGY.md).

---

## The principle

A surface is tested at three layers — the state hook, the rendered component, and the end-to-end journey — with the IPC boundary mocked at the adapter so tests never reach a real host ([ipc-adapters-and-dtos.md](./ipc-adapters-and-dtos.md)). Each layer answers a different question, and a surface is not done until each is covered ([praxis-workspace](./praxis-workspace/README.md)).

## The layers and tools

| Layer                       | Tool                                                          | Answers                                                                                                         |
| --------------------------- | ------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| **Hook / state machine**    | Vitest                                                        | Does the state transition correctly? Does the query key include the viewpoint? Does a viewpoint change refetch? |
| **Component / interaction** | Vitest + React Testing Library                                | Does it render loading / error / empty / partial states? Does interaction produce the right action and ARIA?    |
| **Journey**                 | Playwright                                                    | Does a real user path work across the shell — open workspace, change viewpoint, run, inspect?                   |
| **Visual regression**       | Playwright screenshots (or an equivalent visual-diff harness) | Has the rendered surface changed unintentionally, including honest-state treatments and tokens?                 |

React Testing Library is used because it tests behaviour through the accessibility tree — queries by role and label — which doubles as an accessibility check ([accessibility.md](./accessibility.md)).

## Mocking the IPC boundary

The host is never reached in a renderer test; the IPC boundary is mocked at the adapter ([data-fetching.md](./data-fetching.md)):

- A **Tauri-mock** stands in for `invoke` and the event channel, returning DTO fixtures and emitting the typed events a test exercises (`job_updated`, `job_completed`, `analytics_updated`, `sync_updated`).
- An **MSW**-style fake is used where a request/response shape is more naturally expressed that way; either approach keeps the mock at the adapter boundary, not inside components.
- Tests provide stub adapters (e.g. `DevelopmentMemoryGraph`, [praxis-adapters](./praxis-adapters/README.md)) to exercise UI flows without a real backend.
- A test **must not** issue a real network call; the renderer has none ([ADR-0006](../06-adrs/ADR-0006-tauri-trust-boundary-and-typed-ipc.md)), and a test that tries is a defect.

## What each surface tests

Every surface mirrors the golden vertical: hook tests for state machines, component tests for rendering and interaction, IPC mocked at the boundary ([praxis-workspace](./praxis-workspace/README.md)). The minimum fixtures cover the honest states, not just the happy path:

- **Empty** — no data (no failed jobs, no branches, no results).
- **Loading** — fetch in flight.
- **Error** — each mapped error class with its next action ([error-loading-empty.md](./error-loading-empty.md)).
- **Partial / bounded** — a truncated or limited result with its banner.
- **In progress / queued** — accepted work streaming, and a `BACKPRESSURE` queued state.
- **Stale / rebuilding** — a host freshness status driving a badge and refetch.

The chrome-free surface variant (e.g. `PraxisWorkspaceSurface`) is the unit under component test, so a surface is testable without the full shell ([shell.md](./shell.md)).

## DTO and contract tests

DTOs are typechecked and validated: zod schemas at the boundary are exercised against fixtures, and DTO shapes are asserted against the Rust-generated types so a drift is caught ([ipc-adapters-and-dtos.md](./ipc-adapters-and-dtos.md), [praxis-dtos](./praxis-dtos/README.md)). Branded-type and exhaustiveness checks are compile-time tests — an unhandled enum variant or a wrong-brand id fails `tsc`, not a runtime assertion ([ipc-adapters-and-dtos.md](./ipc-adapters-and-dtos.md)).

## Determinism

Tests assert deterministic, stable ordering where the host guarantees it — analytics result ordering and tie-breakers are asserted in fixtures so there is no flicker between refreshes ([metis-workspace](./metis-workspace/README.md)). A test relying on wall-clock time or unstable ordering is rewritten to pin the viewpoint and the seed identifiers.

## Running

- Typecheck: `pnpm --filter @aideon/desktop run typecheck` (and suite-wide `pnpm run node:typecheck`).
- Unit/component tests: `pnpm run node:test` (the Vitest suite).
- The multi-terminal dev workflow and the Playwright journey runner are described in the getting-started guide.

## References & standards

_Informative — recorded in the [standards register](../02-standards/STANDARDS-REGISTER.md):_

- Meyer — **Design by Contract**, 1992; Pact — **consumer-driven contracts**. The boundary-contract discipline behind the DTO/adapter tests.

## Related documents

| Document                                                                | What it covers                                                         |
| ----------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| [02-standards/TESTING-STRATEGY.md](../02-standards/TESTING-STRATEGY.md) | The suite-wide testing strategy this is the renderer slice of.         |
| [ipc-adapters-and-dtos.md](./ipc-adapters-and-dtos.md)                  | The adapter boundary that is mocked and the validation that is tested. |
| [error-loading-empty.md](./error-loading-empty.md)                      | The honest states every surface test covers.                           |
| [accessibility.md](./accessibility.md)                                  | The accessibility-tree querying RTL doubles as.                        |
