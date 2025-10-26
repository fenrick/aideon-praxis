# Getting Started (Developer Setup)

This guide walks through a clean local setup for Aideon Praxis with
offline‑friendly defaults. It assumes macOS or Linux. Windows works with
WSL2 or native shells (PowerShell or Git Bash).

## Prerequisites

- Node.js 24
- pnpm 9 via Corepack (`corepack enable`)
- GitHub CLI (`gh`) — required for the issues/project helpers
- Rust (via `rustup`) — required for the Tauri host migration work (#95)
- Tauri CLI (`@tauri-apps/cli`) — only if working on the Rust host

Recommended installs:

- macOS: `brew install node gh rustup-init` (then run `rustup-init`)
- Linux: use your package manager or see upstream instructions for
  Node 24, GitHub CLI, and Rust via rustup.

## 1) Clone and bootstrap

```bash
git clone https://github.com/fenrick/aideon-praxis.git
cd aideon-praxis

# Enable pnpm via Corepack
corepack enable
corepack prepare pnpm@9.12.0 --activate

# Install JS/TS deps
pnpm install

# (Host work only) Ensure Rust and Tauri CLI are available
rustup default stable || true
pnpm dlx @tauri-apps/cli -v || true
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

Keep logs clear and separate by using two terminals. The host process initializes the Rust
temporal engine in-process (desktop mode only, no TCP ports). Tauri injects a logging plugin so
host logs appear in the DevTools console in addition to the terminal.

```bash
# Terminal A — UI (SvelteKit)
pnpm --filter @aideon/app dev

# Terminal B — Host (Tauri). From repo root:
pnpm tauri dev

# Optional: tests/lint in a third terminal
pnpm run node:test && pnpm run node:lint && pnpm run node:typecheck
pnpm run host:lint && pnpm run host:check
```

What to expect:

- A Tauri window serving the SvelteKit UI at http://localhost:1420.
- Desktop mode opens no TCP ports by default; all work happens via typed IPC in-process.
- DevTools Console will show renderer logs (console) and host logs (tauri-plugin-log).
- If you see a port conflict on 1420, stop any previous dev server and retry.

## 3) Working with issues (optional)

Helpers keep GitHub Issues and the local mirror (`docs/issues/`) in sync:

```bash
# Start work on issue #123: assigns, labels in-progress, creates a branch
pnpm run issues:start 123

# Ensure Definition of Done exists on in-progress issues
pnpm run issues:dod

# Mirror GitHub issues locally (pre-push check enforces freshness)
pnpm run issues:mirror
```

## Offline tips

- After the first successful `pnpm install`, you can work offline for most tasks (build, lint,
  tests, dev app).
- GitHub helpers (`pnpm run issues:*`) require network; skip them offline.
- If you need to re-install JS packages offline, run `pnpm install --offline` with
  the existing pnpm store available. Avoid clearing the pnpm store while offline.
- Cargo uses the local target directory and cache; avoid deleting the cache offline. `cargo` will
  reuse compiled artifacts when possible.

## Troubleshooting

- "gh: not logged in": ensure `GH_TOKEN` is set in `.env` and that
  `gh auth status` shows your account and scopes.
- TypeScript types missing: run `pnpm install` again; ensure Node 24 is
  active and Corepack is enabled (`corepack enable`).
- Rust not found: install via rustup: `curl https://sh.rustup.rs -sSf | sh`,
  then `rustup default stable`.
- Cargo cache issues: run `cargo clean` (or `pnpm run host:clean`) and rebuild.
