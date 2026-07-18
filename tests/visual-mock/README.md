# Mock-driven visual validation

Validates the **real assembled renderer UX** in a headless browser by faking the Tauri host — no native build required.

## Why this exists

The renderer is a Tauri app. It reaches the host through `invoke` (`window.__TAURI_INTERNALS__.invoke`) using a
request/response envelope (`src/adapters/ipc.ts`). In a plain browser there is no host, so every command fails and the
app never leaves the "Workspace foundation" gate — which is why a naïve browser preview (and every Storybook story) only
ever shows components in isolation, never the assembled flows.

Following Tauri's [mocking guide](https://v2.tauri.app/develop/tests/mocking/), this suite injects a fake
`window.__TAURI_INTERNALS__` (see [`tauri-host-mock.mjs`](./tauri-host-mock.mjs)) **before the app loads**, so
`isTauriRuntime()` is true and every `invoke` is answered from fixtures. That lets us drive and screenshot the genuine
end-to-end UX.

This complements the other test tiers:

| Tier                          | Tool                      | Needs native build  | Covers                        |
| ----------------------------- | ------------------------- | ------------------- | ----------------------------- |
| Unit / component              | Vitest + Testing Library  | no                  | logic, single components      |
| Story render                  | Storybook / Vitest        | no                  | components in isolation       |
| **Host-mocked visual** (this) | **Playwright + IPC mock** | **no**              | **assembled screens & flows** |
| E2E                           | WebDriver                 | yes (`tauri build`) | the packaged desktop app      |

## Run

```bash
pnpm run test:visual-mock                 # spawns the dev server itself
BASE_URL=http://localhost:1420 node tests/visual-mock/run.mjs   # reuse a running server
```

Screenshots (light + dark) are written to `tests/visual-mock/screens/` (git-ignored). The runner exits non-zero if any
scenario's expected content is missing or a non-benign console error fires.

## Scenarios

`foundation-gate`, `workspace-authoring` (open a workspace → twin-authoring surface with entities / relationships /
catalogue), `settings`, `about`, `status`, `styleguide`. Each renders in light and dark.

## Finding: the app is M0 — the canvas is not wired yet

While building this we confirmed a real gap. `src/platform/platform-surfaces.tsx`:

- `PlatformContent` renders **only** the workspace-foundation panel + a widget **library dialog**; its own comment says
  _"the canvas surface arrives in a later increment."_
- `PlatformToolbar` and `PlatformInspector` both `return undefined` — stubs.

So `graph-widget`, `matrix-widget`, and `canvas-runtime` (and their Storybook stories) are **ahead of the running app**:
they are registered widgets with no surface to mount on. A `canvas-graph` scenario was intentionally removed because
there is no canvas to assert against — the graph/matrix fixtures remain in `tauri-host-mock.mjs`
(`makeFixtures({ withGraphTemplate: true })`), ready to be turned back on when the canvas increment lands.

## Extending

Add a fixture to `makeFixtures()` for any new command, add a scenario to `run.mjs` (`route`, optional `drive`, `expect`
substrings, optional `waitFor` selector). Keep fixture DTO shapes in sync with `src/adapters/ipc-bindings.gen.ts`.
