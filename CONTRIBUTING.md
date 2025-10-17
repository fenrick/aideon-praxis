# Contributing to Aideon Praxis

Thanks for your interest in contributing! This guide explains how we work, how to set up your environment, and what we expect in issues and pull requests.

## Values

- **Time-first, graph-native:** keep the meta-model and `state_at()` semantics authoritative.
- **Local-first, cloud-ready:** do not break desktop mode; design for a clean switch to server.
- **Security by default:** safe IPC, PII redaction, least privilege.
- **Evidence & tests:** measurable SLOs; PRs come with tests/docs.

## Ways to contribute

- **Bug reports:** clear steps to reproduce, expected vs actual, logs/screenshots.
- **Feature requests:** problem statement, acceptance criteria, mockups if relevant.
- **Docs:** fix typos, improve examples, add diagrams/captions.
- **Code:** pick a labeled issue, discuss approach, then open a PR.

Labels to look for: `good first issue`, `priority/P1`, `area/*`, `module/*`.
Milestones (M0–M6) track staged delivery (see `ROADMAP.md`).

## Development setup

### Prerequisites

- Node.js ≥ 20, Yarn ≥ 4 (or v1), Python ≥ 3.11
- Optional: Graphviz for diagram exports

### Install

yarn install

#### Python worker (choose one)

Option A — uv (recommended for local dev)

```bash
uv venv .venv
cd packages/worker && uv sync --all-groups
```

Option B — pip (portable fallback)

```bash
python -m venv .venv && source .venv/bin/activate
pip install -e "packages/worker[dev]"
```

### Run

#### Electron + renderer

```bash
yarn dev
```

### Test & lint

#### TS/JS

```bash
yarn test
yarn lint
yarn typecheck
```

#### Python

See docs/commands.md for the full list of yarn commands.

```bash
# pip / system python
yarn py:test
yarn py:lint

# uv (local)
yarn py:uv:test
yarn py:uv:lint
```

> We gate CI on lint + unit tests for both TS and Python.

## Repository structure

packages/app # Electron host + React UI
packages/adapters # GraphAdapter, StorageAdapter, WorkerClient (TS)
packages/worker # Python worker (analytics/ML, RPC server)
packages/docs # C4 diagrams, meta-model documentation
scripts/ # gh_bootstrap.sh and helpers

- **Adapters are contracts.** Do not leak backend specifics into the renderer.
- **Worker is long-lived.** No open TCP ports in desktop mode; pipes/UDS only.

## Branching, commits, PRs

### Branching

- `main`: protected, always releasable.
- Feature branches: `feat/<short-name>`; fixes: `fix/<short-name>`; chores/docs: `chore/<short-name>`, `docs/<short-name>`.

### Conventional Commits

- `feat: add PlanEvent confidence filter`
- `fix(worker): handle Arrow payload >50MB`
- `chore(ci): cache pip and yarn`
- `docs(c4): update system context`

### Pull Requests

- Link an issue and milestone.
- Describe problem, approach, trade-offs, and testing.
- Update docs/ROADMAP if APIs or modules change.
- Keep `Architecture-Boundary.md` accurate when touching host/renderer/worker boundaries.
- Add/adjust tests and SLO baselines where relevant.

### PR checklist

- [ ] Lint & tests pass (TS + Python)
- [ ] No heading-level jumps in docs (markdownlint clean)
- [ ] Security considerations noted (IPC/PII if relevant)
- [ ] ADR added/updated for boundary or protocol decisions

## Architecture decisions (ADR)

When a change affects the **RPC boundary**, **adapters**, **time semantics** (`state_at`, plateaus, gaps), or **security posture**, add/update an ADR:

- Folder: `docs/adrs/NNN-short-title.md`
- Template: Context → Decision → Consequences → Alternatives

## Issue hygiene

When raising an issue, include:

- **Context:** what problem/user need this solves
- **Acceptance criteria:** observable outcomes
- **Non-goals:** what is explicitly out of scope
- **Artifacts:** screenshots, logs, API examples

Use labels (`type/*`, `area/*`, `module/*`, `priority/*`) and assign the **milestone** (M0–M6).

## Code style

- **TypeScript:** ESLint + Prettier, strict TS config.
- **Python:** Ruff + Black defaults; keep imports sorted.
- **Docs:** markdownlint (see `.markdownlint.json` if present).

## Security

- Never open worker TCP ports in desktop mode.
- IPC over pipes/UDS with per-launch token.
- Redact PII on exports by default.
- Report vulnerabilities privately: <security@yourdomain.tld> (replace with project address).

## Releases

- Conventional Commits in PR title and commits (e.g., `feat(time): add plateau diff endpoint`).
- semantic-release manages versioning and CHANGELOG on merges to `main`.
- Package installers are built and uploaded on GitHub Releases; worker dists attached.

## License and CLA

- License: TBD (confirm with maintainers).
- CLA: not required at this time.

Thanks for helping build Aideon Praxis!
