# CLAUDE.md

Entry point for AI coding assistants in the **Aideon Suite** repo (current focus: the **Praxis** desktop module). This
file is a **router**: it states the invariants you must not break and points to the canonical docs for everything else.
The docs are authoritative; code is updated to match them.

> **Scope:** This applies to the `aideon-desktop` codebase. Do not optimise for downstream consumers, SDKs, or
> hypothetical adopters unless a task says so.

## Read these first

- [`docs/00-index/README.md`](docs/00-index/README.md) — documentation map and reading order.
- [`CONTEXT.md`](./CONTEXT.md) — the canonical domain glossary (twin, workspace, viewpoint, fact, layer, scenario). Use
  these terms exactly.
- [`docs/agents/domain.md`](docs/agents/domain.md) — how to orient before changing anything.
- [`docs/agents/workflow.md`](docs/agents/workflow.md) — the task loop and quality gates: CodeScene before/after scores
  (Boy Scout Rule, threshold ratchet), Codacy severity policy, native macOS/Tauri QA, localisation via
  `locales/en.json` + `translation-sync`, and the done-report evidence checklist.
- [`docs/agents/multi-agent-orchestration.md`](docs/agents/multi-agent-orchestration.md) — running a multi-agent team
  (Maestri or otherwise) against this repo: route consequential decisions through the lead, verify artefacts directly
  rather than trusting recruit narration.
- [`docs/03-design/DESIGN.md`](docs/03-design/DESIGN.md) and
  [`docs/03-design/desktop-first-workspace/`](docs/03-design/desktop-first-workspace/README.md) — the product design
  spine and the canonical-authority thesis.
- [`docs/01-architecture/ARCHITECTURE-BOUNDARY.md`](docs/01-architecture/ARCHITECTURE-BOUNDARY.md) — layers, adapters,
  time-first boundaries (decomposed under [`boundary/`](docs/01-architecture/boundary/README.md)).
- [`docs/02-standards/CODING-STANDARDS.md`](docs/02-standards/CODING-STANDARDS.md) and
  [`docs/02-standards/TESTING-STRATEGY.md`](docs/02-standards/TESTING-STRATEGY.md) — coding rules and testing
  expectations.
- [`docs/06-adrs/ADRS.md`](docs/06-adrs/ADRS.md) — the decisions that fix the invariants. Read the ADRs that touch your
  area before changing it.
- The module's folder under [`docs/05-modules/<module>/`](docs/05-modules/) for the module you are working in.

## Core invariants (do not break)

Brief statements; follow the link for the full rule.

- **Time-first digital twin** — time context (valid + asserted time), scenarios, plan/actual layers, and Plan Events are
  authoritative. See [`boundary/time-first-rule.md`](docs/01-architecture/boundary/time-first-rule.md).
- **Workspace-canonical / derived-runtime** — the canonical project is a portable workspace folder (append-only
  `model/ops/`, schema-as-data, content-addressed blobs); `.aideon/runtime/` is a rebuildable cache. See
  [`ADR-0001`](docs/06-adrs/ADR-0001-workspace-is-canonical-authority.md) and
  [`boundary/canonical-vs-derived.md`](docs/01-architecture/boundary/canonical-vs-derived.md).
- **Local-first, cloud-ready** — desktop works offline; server mode is a config switch, not a fork.
- **Strict boundaries** — renderer calls host via Tauri invoke (typed adapters); desktop runs engines in-process; host
  calls engines via Rust traits. No sockets; no renderer HTTP; no DB-specific logic in the renderer. See
  [`boundary/layers-and-responsibilities.md`](docs/01-architecture/boundary/layers-and-responsibilities.md).
- **Adapters, not entanglement** — Graph, Storage, Worker are interface-driven; backends swap without UI change. See
  [`boundary/dependency-rules.md`](docs/01-architecture/boundary/dependency-rules.md).
- **Evergreen** — refactor toward the current stack; do not extend legacy seams. Precedence on conflict: (1) code on
  `main`; (2) suite docs (DESIGN, ARCHITECTURE-BOUNDARY, CODING-STANDARDS, TESTING-STRATEGY); (3) module docs under
  `docs/05-modules/`; (4) other `docs/`. Clean as you go; update the touched module doc.

## Security by default

- No renderer HTTP; renderer ↔ host via typed IPC only.
- Desktop mode: no open TCP ports; localhost APIs are host-bound and read-only.
- PII: deny-by-default on exports/APIs; redaction checked in tests where applicable.
- Do not call external LLMs or telemetry endpoints; if necessary, stub behind the host with an explicit allowlist.
- Full rules: [`boundary/security-constraints.md`](docs/01-architecture/boundary/security-constraints.md),
  CODING-STANDARDS §14–15.

## Agent stop rule (unsettled or contradicted design)

- **Stop on an unsettled design decision.** If an agent encounters an unsettled design decision during implementation,
  it must stop. It must not invent a local answer, encode an assumption in code, or continue behind a TODO. It must
  return the issue to human review with the specific design question named, the affected files or contracts listed, and
  the reason the existing authoritative sources do not answer it.
- **Stop on a design contradiction.** If the agent finds that implementation reality contradicts the ratified design
  (for example, a chosen tool cannot deliver what a contract assumes), classify the item as a **design contradiction**
  and stop. Do not treat it as a local implementation detail to be quietly worked around.
- An issue is agent-ready because the authoritative sources are named, the acceptance tests are clear, and no unresolved
  design decision remains hidden — **not** because someone applied the `ready-for-agent` label. See
  [`docs/build-contracts/agent-issue-template.md`](docs/build-contracts/agent-issue-template.md) and the `agent_task`
  issue form.

## Frameworks-first defaults (use before inventing your own)

- **TS/React:** React 19, shadcn/ui + Tailwind, React Flow/XYFlow canvases, React Hook Form, Testing Library + Vitest,
  pnpm 10, Node 24; TanStack Table for tables.
- **Rust:** Rust 2024, tokio, serde, thiserror, tracing + the `log` facade, dirs/directories for platform paths; anyhow
  for internal glue only.
- Do not build your own UI kits, form/state helpers, logging wrappers, or async executors. Detail: CODING-STANDARDS §3.

## UI work (Praxis Canvas / Aideon Desktop shell)

- Target the Aideon Desktop shell; do not give individual workspaces their own chrome. Use the **design-system proxies**
  for Sidebar, Resizable, Menubar, and Toolbar — never raw shadcn or react-resizable-panels primitives, and never
  bespoke layout primitives.
- Copy the golden pattern: hooks expose `[state, actions]`, IPC via the `praxisApi` wrapper, shadcn cards for layout,
  alerts/skeletons for loading/error. Cover loading/error/empty states in tests; mock IPC at the boundary.
- **Visually inspect the rendered result before calling UI work done.** Screenshot the Storybook story (e.g. via the
  Playwright CLI against the running Storybook iframe) in both light and dark, at representative widths. Headless
  render/play tests assert "renders without error", not layout, spacing, clipping, or theme regressions — those are only
  caught by looking at pixels. This is required, not optional.
- **Storybook MCP** (`@storybook/addon-mcp` at `http://localhost:6006/mcp` when `pnpm run storybook` is running):
  **never hallucinate component props** — run `get-documentation <component>` to verify a prop exists before using it.
  Use `list-all-documentation`, `run-story-tests`, and `get-storybook-story-instructions`. Stories live alongside
  components in `src/design-system/blocks/*.stories.tsx`.

### Golden-pattern files

- Desktop shell: `src/design-system/src/desktop-shell/DesktopShell.tsx`, `src/root.tsx`.
- Workspace navigation: `src/DesktopTree.tsx`. Selection plumbing: `src/canvas/app.tsx` +
  `src/DesktopPropertiesPanel.tsx`.
- Chrome-free canvas surface: `src/canvas/app.tsx` (`PraxisCanvasSurface`).
- Engine/host command wiring: `src-tauri/src/temporal.rs`, `crates/praxis/tests/merge_flow.rs`.

## Where to look per module

- **Aideon Desktop (`src/`)** — React canvas, design-system proxies, adapters, DTOs. Read
  [`docs/frontend/`](docs/frontend/README.md). Tests: `pnpm run node:test`.
- **Aideon Host (`src-tauri/`)** — Tauri trust boundary; typed commands only, no renderer HTTP, no open ports. Read
  [`docs/05-modules/host/`](docs/05-modules/host/README.md). Tests: `cargo test -p aideon_desktop`; checks via
  `pnpm run host:lint && pnpm run host:check`.
- **Engines (`crates/praxis`, `chrona`, `metis`, `continuum`, `mneme`)** — no Tauri/UI deps; obey the time-first commit
  model and adapter boundaries. Read each [`docs/05-modules/<module>/`](docs/05-modules/). Tests:
  `cargo test -p <crate>`.

## Desktop environment

This ships as packaged binaries on Windows/macOS/Linux. Resolve config/state paths via platform conventions (AppData /
Application Support / XDG) or Tauri helpers — never hardcode repo-relative paths or assume files can be written next to
the binary. Reach for the bundled plugins (`tauri-plugin-fs`, `tauri-plugin-dialog`, `tauri-plugin-window-state`, …)
instead of rolling your own file handling.

## Boundary, contract, and doc changes

- Touching a Rust ↔ host ↔ renderer boundary: keep DTOs in sync (TS in `src/dtos`, Rust in `crates/mneme`) and update
  [`docs/04-contracts/`](docs/04-contracts/README.md) when schemas or IPC error shapes change.
- All documentation lives under `docs/` (per-module under `docs/05-modules/<module>/`) — never in `crates/`, `src/`, or
  `src-tauri/` (repo-root `README.md`/`CONTRIBUTING.md` excepted). Prefer extending an existing single-topic file; add a
  new one only when a topic has no home. Durable decisions become ADRs
  ([`docs/02-standards/DESIGN-GOVERNANCE.md`](docs/02-standards/DESIGN-GOVERNANCE.md),
  [`ADR-FORMAT.md`](docs/02-standards/ADR-FORMAT.md)).
- The legacy Svelte renderer (`app/PraxisDesktop/`) has been removed; ignore any references to it.

## Commits, CI, and issue tracking

- **CI must pass:** `pnpm run ci` (TS/React + Rust lint, typecheck, tests, format). A Husky pre-commit hook runs this;
  keep it fast and deterministic.
- **Conventional Commits** in PR titles and commits (e.g. `feat(time): add plateau diff endpoint`). Link the issue and
  updated design docs in the PR. Follow `CONTRIBUTING.md` for the Definition of Done.
- **Coverage** ≥80% lines/branches/functions on new code (engines trend ≥90%). Detail in CODING-STANDARDS §16 and
  [`docs/02-standards/testing/`](docs/02-standards/testing/README.md).
- **Issue tracking:** GitHub Issues + the GitHub Project (the source of truth for workflow state). The contextual axes —
  Kind, Area, Module, Priority, Status — are **project fields**, not labels; the labels still applied are `area/*` and
  the triage labels. See [`docs/agents/issue-tracker.md`](docs/agents/issue-tracker.md) and
  [`docs/agents/triage-labels.md`](docs/agents/triage-labels.md). Milestones and aspect ownership:
  [`docs/build-contracts/MILESTONES.md`](docs/build-contracts/MILESTONES.md). Use the **GitHub MCP tools**
  (`mcp__github__*`) for reading and searching issues; use the `gh` CLI for CI checks, PR creation, and anything the MCP
  does not cover.

## When to ask vs. proceed

- **Ask** (emit a short plan + questions) if requirements conflict with these guardrails, the change touches
  security/IPC/meta-model, or a dependency is ambiguous. See also the agent stop rule above.
- **Proceed** with sensible defaults if the task is a local refactor or additive feature within a package and follows
  this guide.
