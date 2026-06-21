# Counter-case notes — steelman the current decomposition, then rebut

## CC1 — "The product is engine-first; there is nothing to render until M1/M3, so deferring UX is correct."

- **Steelman:** M0 is storage; M1 authors facts; only M3 produces a renderable artefact. Building UX earlier renders an empty app.
- **Rebuttal:** False that nothing is renderable at M0. The shell, the workspace **open/close/rebuild** lifecycle, the workspace picker, and every honest-state (loading / empty / rebuilding / recovery / error) are renderable at M0 and are exactly what the user reports broken. "Nothing to render" conflates _domain content_ with _shell + lifecycle UX_. The latter is M0-meaningful and must work in the window.

## CC2 — "The host is a boundary; it naturally grows each milestone, so diffuse ownership is fine."

- **Steelman:** Each milestone adds its commands to the host; there is no single 'host milestone'.
- **Rebuttal:** Conflates two different things. **Carrying** a milestone's commands (consumption) does grow each milestone — fine. But **host workspace lifecycle + capability enforcement** is a discrete, first-time deliverable that belongs to exactly one milestone (M0) and is currently unbuilt and untracked as blocking. The ledger must separate "owns the host lifecycle/capability layer" (M0) from "adds its command slice" (every milestone).

## CC3 — "Mock-layer tests are standard practice and give fast feedback."

- **Steelman:** Component and IPC-boundary tests are normal, fast, and catch real regressions cheaply.
- **Rebuttal:** Agreed — keep them as **unit** tests. The defect is using them as the **exit gate** for UX. They prove a component mounts in jsdom with a stubbed host; they cannot prove the assembled shell composes or that menu/window/IPC work in the packaged app. Units stay; the gate must be the real window.

## CC4 — "M0 is done — the engine is built and all its tests pass."

- **Steelman:** #314 delivered the canonical engine with real (non-mock) filesystem+SQLite oracle tests; #288/#292 closed.
- **Rebuttal:** The **engine layer** of M0 is done and genuinely well-tested. The **milestone** M0 is not: host lifecycle IPC + capability enforcement (#290), rebuild-as-accepted-work, in-window shell/lifecycle UX, and the event-manifest gap remain. User has confirmed M0 is unfinished. "Engine done" ≠ "M0 done".
