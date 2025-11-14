# Aideon Praxis

This is a draft monorepo scaffold following the guardrails in `AGENTS.md`.

Packages:

- `app/praxis-desktop` — Svelte renderer bundle consumed by the Tauri host.
- `crates/aideon-praxis-host` — Tauri desktop host (Rust) with typed IPC surface.
- `crates/{aideon-praxis-engine, aideon-chrona-visualization, aideon-metis-analytics, aideon-continuum-orchestrator, aideon-mneme-core}` —
  Rust crates for the graph model, time engine, analytics, orchestration, and persistence/DTOs respectively.
- `app/praxis-adapters` — TypeScript interfaces for Graph/Storage/Worker adapters.

Tooling:

- pnpm workspaces, ESLint + Prettier, strict TypeScript base config.
- Rust workspace managed via Cargo (`cargo fmt`, `cargo clippy`, `cargo test`).
- GitHub Actions CI runs JS lint/typecheck and Rust lint/tests.

See `CONTRIBUTING.md` and `AGENTS.md` for contribution rules and boundaries. For a walkthrough of
local setup (Node 24, pnpm 9, Rust stable via rustup) and offline tips, see
`docs/getting-started.md`.

Getting started

- Prereqs: Node 24, Rust stable toolchain.
- Enable Corepack then install deps: `corepack enable && pnpm install`.
- Build once: `pnpm run build` (renderer assets to `app/praxis-desktop/dist/renderer`, main+preload to
  `app/praxis-desktop/dist`).
- Dev (no HTTP server): `pnpm tauri dev` (watches Vite + Tauri and launches the desktop app).

See docs/commands.md for the full list of pnpm commands used across JS/TS and the Rust workspace.

Packaging

- Local packaging (unsigned): `pnpm --filter @aideon/praxis-desktop run dist`.
- Outputs installers to `app/praxis-desktop/dist/pack/` for macOS (DMG), Windows (NSIS), and Linux
  (AppImage/DEB).
- CI packaging: when a GitHub Release is published (including nightly channel), the
  `Package Artifacts` workflow builds on macOS, Windows, and Linux and uploads assets to the release
  using the repo token.
- Code signing/notarization: not configured by default. Provide signing credentials as environment
  secrets if needed later. Builds remain unsigned for local/CI unless configured.

Commit conventions and releases

- Use Conventional Commits (e.g., `feat(app): add AS-OF slider`).
- Lint commit messages locally: `pnpm run commitlint`.
- CI enforces PR title style and runs semantic-release on `main` to generate changelog and GitHub
  releases.
- Version injection: during release, CI writes `app/praxis-desktop/src/version.ts` with the computed
  version so binaries embed an immutable version. Local dev uses `0.0.0-dev`.
- Nightly builds: push a `nightly` branch. CI publishes prereleases like `x.y.z-nightly.YYYYMMDD`,
  channel `nightly`.

Security posture

- No renderer HTTP in dev: we use Vite build in watch mode (no dev server) and load files from disk.
- Tauri: strict capabilities; no raw HTTP from renderer; CSP enforced by Tauri. Renderer sandboxed
  with `contextIsolation: true` and no Node.js integration.

License

- MIT — see `LICENSE`.

The intelligent companion that turns **design intent into action over time**.

Aideon Praxis is a **graph-native, local-first Enterprise Architecture (EA) platform** with a
**time-first meta-model**. It builds a **digital twin of the enterprise**, supports **bitemporal
state** (valid & record time), **scenario branches**, **Plan Events** for future projections, and a
Rust engine for **heavy analytics and ML**. Designed for desktop (Tauri + Svelte) with a clean
path to server/cloud mode.

- **Graph-native:** Rich many-to-many relationships across Strategy → Capability → Service/Process →
  App/API → Tech/Cloud.
- **Time-first:** Snapshots, scenarios, **`state_at()`** time slicing, plateaus/gaps, and
  date-driven colour narratives.
- **Rust engine:** In-process adapters for topology, impact, centrality, TCO, and large payloads
  (Arrow-ready).
- **Local-first, cloud-ready:** Private, offline desktop app that can switch to a remote
  graph/worker by config.
- **Open formats:** JSON/CSV/GraphML/Arrow; diagram exports SVG/PNG/PDF.

> See: ROADMAP.md • Architecture-Boundary.md

## Architecture at a glance

- **Praxis (core):** meta-model, adapters, snapshots/scenarios, `state_at()` / `diff()`, local APIs.
- **Chrona (time UI):** AS-OF slider, scenario picker, confidence filters, story presets,
  palettes/legends.
- **Metis (analytics):** shortest path, centrality, clustering, topology deltas, trajectory
  analytics.
- **Continuum (automation):** scheduler, connectors, governance cadence, notifications/rules.

C4 views are generated as diagrams-as-code (Structurizr DSL, Mermaid/PlantUML snippets) and
published under `docs/c4/`.

## Repository layout (monorepo)

```
.
├─ app/
│  ├─ praxis-desktop/   # Svelte renderer bundle (Praxis + Chrona UI)
│  ├─ praxis-adapters/  # TypeScript adapters bridging renderer ↔ host
│  ├─ praxis-design-system/ # Shared UI components, theming, and tokens
│  └─ praxis-dtos/       # Centralised DTOs that shape IPC contracts
├─ crates/
│  ├─ tauri/            # Desktop host (Rust + Tauri)
│  ├─ praxis/           # Graph model crate (placeholder)
│  ├─ chrona/           # Time engine crate (placeholder)
│  ├─ metis/            # Analytics crate (placeholder)
│  └─ continuum/        # Orchestration/API crate (placeholder)
├─ docs/                # C4 diagrams, meta-model, viewpoints, ADRs
├─ scripts/             # Tooling, CI helpers, project automation
├─ Architecture-Boundary.md
├─ ROADMAP.md
└─ ...
```

### Canvas (M1) — Layout and Save

- The renderer performs auto‑layout with elkjs (default `org.eclipse.elk.rectpacking`) and respects saved positions by default.
- Saving is explicit: the canvas writes geometry per `asOf` to the host via a typed command. Persistence is JSON under the OS app data folder for M1 and will be moved behind a StorageAdapter without changing UI APIs.
- DTOs model nodes, edges, and groups (including nested groups) so we can add editing for edges and grouping while keeping the protocol stable.
- See `docs/canvas-architecture.md` for details and roadmap (undo/blame via event streams, “now” semantics, and storage pluggability).

## Quick start (local development)

### Prerequisites

- **Node.js** 24
- **pnpm** ≥ 9 (via Corepack)
- **Rust** (stable toolchain with `rustfmt` + `clippy` components)
- **Graphviz** (for some diagram tools, optional)

### 1) Clone and bootstrap

```bash
git clone <https://github.com/><owner>/<repo>.git
cd <repo>
```

#### Install JS/TS deps

```bash
pnpm install
```

### 2) Run the app (dev)

```bash
pnpm run dev
```

### 3) Tests and lint

#### TypeScript

```bash
pnpm run test
pnpm run lint
pnpm run typecheck
```

## Core capabilities

- **Time-slicing APIs (desktop read-only; server read/write):**
  - GET /graph?as_of=YYYY-MM-DD&scenario=&confidence=
  - GET /diff?from=...&to=...
  - GET /topology_delta?from=...&to=...
  - GET /tco?scope=...&as_of=...&scenario=...
- **Visual story modes:** Freshness Spotlight, Delivery Risk, EoL Radar, Scenario Trade-off,
  Validity Time-Travel.
- **Portfolio (TIME) & Roadmaps:** Disposition + review cycles; plateaus/gaps; AS-OF compare &
  exports.
- **Integration:** CSV/XLSX mapping wizard; connectors (e.g., CMDB) via Continuum scheduler.

## Security & privacy

- **Desktop:** renderer ↔ host via IPC only (no HTTP); optional encryption-at-rest; deny-by-default
  PII on exports.
- **Server mode:** mTLS, RBAC, audit, optimistic locking; same schemas over remote endpoints.

See: Architecture-Boundary.md

## Roadmap & milestones

We work in M0–M6 stages with clear acceptance criteria. See: ROADMAP.md

To create labels, milestones, and import issues:

```bash
Use the Issues CLI helpers via `pnpm run issues:*` (see AGENTS.md).
```

then in GitHub UI: Issues → Import → CSV (upload issues.csv)

## Contributing

We welcome issues and PRs. Start with CONTRIBUTING.md, then pick up a good-first issue or an item
from the active milestone.

## License

TBD (project stewardship to confirm).
