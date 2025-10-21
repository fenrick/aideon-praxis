# Aideon Praxis

This is a draft monorepo scaffold following the guardrails in `AGENTS.md`.

Packages:

- `packages/app` — Electron host + React renderer (secure defaults, preload IPC only).
- `packages/adapters` — TypeScript interfaces for Graph/Storage/Worker adapters.
- `packages/worker` — Python 3.13 sidecar (RPC-only). Includes minimal Temporal.StateAt stub.

Tooling:

- Yarn/NPM workspaces, ESLint + Prettier, strict TypeScript base config.
- Python `ruff` + `black` + `pytest` configured via `pyproject.toml`.
- GitHub Actions CI runs JS lint/typecheck and Python lint/tests.

See `CONTRIBUTING.md` and `AGENTS.md` for contribution rules and boundaries. For a walkthrough of
local setup (Node 24, Yarn 4, Python 3.13 via uv) and offline tips, see `docs/getting-started.md`.

Getting started

- Prereqs: Node 24, Python 3.13.
- Enable Corepack then install deps: `corepack enable && yarn install`.
- Build once: `yarn build` (renderer assets to `packages/app/dist/renderer`, main+preload to
  `packages/app/dist`).
- Dev (no HTTP server): `yarn workspace @aideon/app dev` (watches Vite build and tsup and launches
  Electron).
- Python tests: `pytest -q packages/worker` (or `yarn py:test`).

See docs/commands.md for the full list of yarn commands used across JS/TS and the Python worker.

Packaging

- Local packaging (unsigned): `yarn workspace @aideon/app dist`.
- Outputs installers to `packages/app/dist/pack/` for macOS (DMG), Windows (NSIS), and Linux
  (AppImage/DEB).
- The Python worker binary is embedded inside the app package (resources/worker) when the CI step
  builds it with PyInstaller. Local packaging embeds the worker if
  `packages/app/extra/worker/aideon-worker[.exe]` exists.
- CI packaging: when a GitHub Release is published (including nightly channel), the
  `Package Artifacts` workflow builds on macOS, Windows, and Linux and uploads assets to the release
  using the repo token.
- Each OS job builds the worker as a standalone binary (PyInstaller) and embeds it in the Electron
  package via `extraResources`.
- Code signing/notarization: not configured by default. Provide signing credentials as environment
  secrets if needed later. Builds remain unsigned for local/CI unless configured.

Commit conventions and releases

- Use Conventional Commits (e.g., `feat(app): add AS-OF slider`).
- Lint commit messages locally: `yarn commitlint`.
- CI enforces PR title style and runs semantic-release on `main` to generate changelog and GitHub
  releases.
- Version injection: during release, CI writes `packages/app/src/version.ts` and
  `packages/worker/.../_version.py` with the computed version so binaries embed an immutable
  version. Local dev uses `0.0.0-dev`.
- Nightly builds: push a `nightly` branch. CI publishes prereleases like `x.y.z-nightly.YYYYMMDD`,
  channel `nightly`.

Security posture

- No renderer HTTP in dev: we use Vite build in watch mode (no dev server) and load files from disk.
- Electron: `contextIsolation: true`, `nodeIntegration: false`; CSP present in renderer HTML.

License

- MIT — see `LICENSE`.

The intelligent companion that turns **design intent into action over time**.

Aideon Praxis is a **graph-native, local-first Enterprise Architecture (EA) platform** with a
**time-first meta-model**. It builds a **digital twin of the enterprise**, supports **bitemporal
state** (valid & record time), **scenario branches**, **Plan Events** for future projections, and a
Python worker for **heavy analytics and ML**. Designed for desktop (Electron + React) with a clean
path to server/cloud mode.

- **Graph-native:** Rich many-to-many relationships across Strategy → Capability → Service/Process →
  App/API → Tech/Cloud.
- **Time-first:** Snapshots, scenarios, **`state_at()`** time slicing, plateaus/gaps, and
  date-driven colour narratives.
- **Python worker:** Long-lived sidecar for topology, impact, centrality, TCO, and large payloads
  (Arrow).
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

. ├─ packages/ │ ├─ app/ # Electron host + React renderer (Praxis + Chrona) │ ├─ adapters/ #
GraphAdapter, StorageAdapter, WorkerClient (TS) │ ├─ worker/ # Python worker (Metis) + algorithms +
RPC server │ └─ docs/ # C4 diagrams, meta-model, viewpoint docs ├─ scripts/ │ └─ gh_bootstrap.sh #
Labels, milestones, import issues.csv ├─ ROADMAP.md ├─ Architecture-Boundary.md ├─ issues.csv #
Import via GitHub Issues → Import → CSV ├─ .markdownlint.json # (optional) markdown lint config └─
...

## Quick start (local development)

### Prerequisites

- **Node.js** 24
- **Yarn** ≥ 4 (Berry) or Classic (v1) — project uses `yarn` scripts
- **Python** 3.13 (for the worker)
- **Graphviz** (for some diagram tools, optional)

### 1) Clone and bootstrap

```bash
git clone <https://github.com/><owner>/<repo>.git
cd <repo>
```

#### Install JS/TS deps

```bash
yarn install
```

#### (Optional) Python worker via uv (recommended)

Use uv as the local Python manager for the worker. It respects the existing PEP 621 `pyproject.toml`
and keeps CI on plain `pip`.

```bash
# one‑time: install uv (see https://docs.astral.sh/uv/)
# macOS: brew install uv

# create a project venv (repo‑root `.venv`) and sync deps
uv venv .venv
cd packages/worker
uv sync --all-groups  # installs dev tools from [project.optional-dependencies].dev

# run checks via uv
uv run -m pytest -q
uv run -m ruff check .
uv run -m black --check .
```

If you prefer plain `pip`, you can install the dev tools directly:

```bash
python -m venv .venv && source .venv/bin/activate
pip install -e "packages/worker[dev]"
```

### 2) Run the app (dev)

```bash
yarn dev
```

### 3) Tests and lint

#### TypeScript

```bash
yarn test
yarn lint
yarn typecheck
```

#### Python

```bash
pytest -q packages/worker
ruff check packages/worker
black --check packages/worker  # or: yarn format:py:check
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
scripts/gh_bootstrap.sh <owner>/<repo>
```

then in GitHub UI: Issues → Import → CSV (upload issues.csv)

## Contributing

We welcome issues and PRs. Start with CONTRIBUTING.md, then pick up a good-first issue or an item
from the active milestone.

## License

TBD (project stewardship to confirm).
