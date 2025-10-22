# Getting Started (Developer Setup)

This guide walks through a clean local setup for Aideon Praxis with
offline‑friendly defaults. It assumes macOS or Linux. Windows works with
WSL2 or native shells (PowerShell or Git Bash).

## Prerequisites

- Node.js 24
- Yarn 4 via Corepack (`corepack enable`)
- Python 3.13
- uv (Python package/dependency manager)
- GitHub CLI (`gh`) — required for the issues/project helpers
- Rust (via `rustup`) — required for the Tauri host migration work (#95)
- Tauri CLI (`@tauri-apps/cli`) — only if working on the Rust host

Recommended installs:

- macOS: `brew install node uv gh rustup-init` (then run `rustup-init`)
- Linux: use your package manager or see upstream instructions for
  Node 24, uv, GitHub CLI, and Rust via rustup.

## 1) Clone and bootstrap

```bash
git clone https://github.com/fenrick/aideon-praxis.git
cd aideon-praxis

# Enable Yarn 4 (Corepack)
corepack enable

# Install JS/TS deps
yarn install

# (Optional but recommended) Create and sync a project venv with uv
yarn py:sync  # wraps: uv sync --python 3.13 --extra dev

# (Host work only) Ensure Rust and Tauri CLI are available
rustup default stable || true
yarn dlx @tauri-apps/cli -v || true
```

Create your `.env` from the example and set the GitHub repo and token
so the issues helpers can talk to GitHub:

```bash
cp .env.example .env
${EDITOR:-nano} .env
# Required keys:
# AIDEON_GH_REPO=fenrick/aideon-praxis
# AIDEON_GH_PROJECT_OWNER=fenrick
# AIDEON_GH_PROJECT_NUMBER=2
# AIDEON_GH_STATUS_FIELD=Status
# AIDEON_GH_STATUS_MAP={"status/todo":"Todo","status/in-progress":"In Progress","status/blocked":"Blocked","status/done":"Done"}
# GH_TOKEN=...  # scopes: repo, project, read:org (if org project)
```

Verify the GitHub CLI sees your token:

```bash
gh auth status -h github.com
```

## 2) Run in development

Keep logs clear and separate by using two terminals. The host process will spawn the Python
worker over a Unix domain socket (desktop mode only, no TCP ports). Tauri injects a logging
plugin so host logs appear in the DevTools console in addition to the terminal.

```bash
# Terminal A — UI (Vite)
yarn workspace @aideon/app dev

# Terminal B — Host (Tauri). From repo root:
yarn tauri:dev

# Optional: tests/lint in a third terminal
yarn test && yarn lint && yarn typecheck
yarn py:test && yarn py:lint
```

What to expect:

- A Tauri window serving the Vite UI at http://localhost:5173.
- Desktop mode opens no TCP ports by default; the worker talks to the host via UDS.
- DevTools Console will show renderer logs (console) and host logs (tauri-plugin-log).
- If you see a port conflict on 5173, stop any previous Vite and retry.

### Worker endpoints (FastAPI over UDS)

- `GET /ping` — readiness check
- `POST /state_at` — body: `{ asOf, scenario?, confidence? }` → returns `{ asOf, scenario, confidence, nodes, edges }`

You can test locally (UDS) with curl:

```bash
curl --unix-socket .aideon/worker.sock http://localhost/ping
curl --unix-socket .aideon/worker.sock -H 'content-type: application/json' \
  -d '{"asOf":"2025-01-01"}' http://localhost/state_at
```

## 3) Working with issues (optional)

Helpers keep GitHub Issues and the local mirror (`docs/issues/`) in sync:

```bash
# Start work on issue #123: assigns, labels in-progress, creates a branch
yarn issues:start 123

# Ensure Definition of Done exists on in-progress issues
yarn issues:dod

# Mirror GitHub issues locally (pre-push check enforces freshness)
yarn issues:mirror
```

## Offline tips

- After the first successful `yarn install` and `yarn py:sync`, you can
  work offline for most tasks (build, lint, tests, dev app).
- GitHub helpers (`yarn issues:*`) require network; skip them offline.
- If you need to re-install JS packages offline, run `yarn install` with
  the existing `.yarn/cache` present. Avoid `yarn cache clean`.
- Python: uv uses the local `.venv` and its cache; avoid deleting the
  venv offline. `uv run` executes tools without hitting the network.

## Troubleshooting

- "gh: not logged in": ensure `GH_TOKEN` is set in `.env` and that
  `gh auth status` shows your account and scopes.
- TypeScript types missing: run `yarn install` again; ensure Node 24 is
  active and Corepack is enabled (`corepack enable`).
- Python tool versions drift: re-run `yarn py:sync` to refresh the venv.
- Rust not found: install via rustup: `curl https://sh.rustup.rs -sSf | sh`,
  then `rustup default stable`.
