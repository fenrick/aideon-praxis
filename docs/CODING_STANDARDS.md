# Coding Standards (v2)

This is the single source of truth for code quality, testing, tooling, and
boundaries across the Aideon Praxis monorepo.

- Stacks: Node 24 (TS/SvelteKit), Rust 2024 (host + engines)
- Monorepo: pnpm workspaces; Cargo workspace for Rust crates
- Runtime posture: typed adapters over IPC; no renderer HTTP and no open TCP
  ports in desktop mode

## Architecture & Boundaries

- Modules & Layers
- Renderer (SvelteKit): UI only; never accesses local process APIs directly.
  - Main (Tauri host): IPC commands + local orchestration; no backend logic in renderer.
  - Engines (Rust crates): analytics/time/graph orchestration behind typed traits; host injects
    the appropriate adapter (local or remote).
- Contracts between layers
  - Renderer ↔ Main: typed preload bridge only.
- Main ↔ Engines: trait-bound adapters (local today; remote adapters follow the same contract).
  - Shared types encouraged in TS via dedicated package when needed; avoid
    circular deps. For cross‑language payloads, use OpenAPI (JSON Schema) as the
    source of truth.
- Contract Versioning
  - Version HTTP routes with `/api/v{n}` and embed `X-API-Version` in responses.
  - Changes follow semver:
    - patch/minor: additive, backward compatible
    - major: breaking; provide deprecation window and dual‑serve old version
  - Maintain a changelog of API changes (docs/ or OpenAPI description changes).

## Tooling & Performance at Scale

- Caching: enable dependency and build caches in CI for pnpm and Cargo.
- Incrementality:
  - TypeScript: use projectReferences and/or path aliases for workspace packages.
  - Tests: prefer package‑scoped test runs; use changed‑files filters when
    practical.
- Parallelism: run JS/TS and Rust checks in parallel CI jobs where possible.
- Slow tests: quarantine and track with an issue; do not disable gates.

## Quality Gates

- Coverage targets (Node/TS and Rust) on new/changed code:
  - Lines ≥ 80%
  - Branches ≥ 80%
  - Functions ≥ 80%
- Exceptions: generated code and build artifacts are excluded; justify any
  additional exclusions with a comment and an issue reference.
- Flaky tests: quarantine behind a tag and open an issue; fixing flakiness has
  higher priority than adding more tests.
- SonarQube
  - New code is measured against `main` (see `sonar.new_code.referenceBranch`)
  - CI waits for Sonar Quality Gate; failing the gate blocks merges

## TypeScript / Svelte

- Tooling: ESLint + Prettier; Vitest for unit tests; Svelte compiler checks
- Environment: Node 24, pnpm 9; strict TS config
- Rules
  - No inline rule suppressions (no `eslint-disable`, `ts-ignore`, etc.).
    If absolutely necessary, require an issue reference and a TODO explaining
    removal criteria.
  - No backend‑specific logic in the renderer; IPC only via preload bridge
  - Sanitise/validate data that crosses the preload boundary; avoid leaking
    privileged data into renderer state
- Keep code paths single and explicit; the app speaks to the host over typed
  IPC commands, and the host selects the appropriate engine adapter
- Coverage
  - Run: `pnpm run node:test:coverage`
  - Add targeted, focused tests; it is acceptable to export clearly named
    test‑only helpers (e.g., `__test__`) to improve branch coverage when it does
    not affect runtime
- Monorepo build health
  - Prefer TS projectReferences and/or path aliases for shared packages
  - Avoid deep imports across package boundaries; publish explicit entrypoints

## Rust (Host & Engine Crates)

- Tooling: Cargo (`cargo fmt`, `cargo clippy`, `cargo test`)
- Environment: Rust stable (rustup manages toolchain + components)
- Commands
  - `pnpm run host:format` / `host:format:check` — `cargo fmt`
  - `pnpm run host:lint` — `cargo clippy --all-targets -- -D warnings`
  - `pnpm run host:check` — `cargo check` across the workspace
  - `cargo test --all --all-targets` — unit/integration tests for host and
    engine crates
- Rules
  - Engines expose typed traits; keep adapters thin and deterministic
  - No open TCP ports in desktop mode; remote adapters must stay behind the
    same trait boundaries
  - Prefer fast, deterministic tests; add integration tests when touching IPC
    layers or async flows

## Commit Hygiene

Run these locally before every commit (CI enforces the same):

- App: `pnpm run node:format` → `pnpm run node:lint:fix` → `pnpm run node:typecheck` → `pnpm run node:test:coverage`
- Host/engines: `pnpm run host:format` → `pnpm run host:lint` → `pnpm run host:check` → `cargo test --all --all-targets`
- Coverage gates must be met on new/changed code in both app and Rust crates
- No rule suppressions; refactor to satisfy linters and analyzers
- Conventional Commits are required; use `feat|fix|chore|ci|docs|test|refactor|perf|style`
- Pre‑commit hooks should run only on changed files; use `--no-verify` only with
  justification and follow‑up issue

## CI & Sonar

- CI uses pnpm 9 and Cargo; ensure `rustfmt` and `clippy` components are
  installed in the build environment
- Sonar analyzes both Node/TS and Rust; coverage reports are uploaded from
  Vitest (lcov) and Rust coverage tooling (lcov). CI waits for the Sonar Quality Gate
- Fail‑fast ordering in CI: lint/type before unit tests; heavier jobs (coverage,
  integration) after quick gates pass
- Cache pnpm/Cargo artifacts; prefer parallel jobs for app and host/engine checks

## Security & Boundaries

- No renderer HTTP; renderer ↔ host via IPC only
- Desktop: no open TCP ports; host ↔ engine adapters stay in-process and typed
- PII: redact by default on exports/APIs; add tests where applicable
- Dependencies: review regularly; avoid unvetted libraries; lock through pnpm
  and Cargo; prefer pinned dev‑tool versions
- Secrets: never hard‑code; provide via env/config; CI scans for secrets
- Threat modeling: required for new public interfaces or boundary changes

## Version & Governance

- Ownership: standards are owned by maintainers; propose changes via PR tagged
  `docs(standards)`.
- Versioning: this document is versioned; record notable changes in PRs and
  changelog.
- Exceptions: document and time‑limit any deviation with issue links and a plan
  to converge.

## References

- Commands: `docs/commands.md`
- Practices & guardrails: `AGENTS.md`
- Contributor workflow: `CONTRIBUTING.md`
