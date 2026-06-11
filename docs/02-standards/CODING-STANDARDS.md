# Coding Standards

Defines the shared coding rules, quality gates, IPC boundary discipline, and module boundary expectations for the Aideon Desktop repository.

> When changing a public API, a cross-module boundary, or establishing a new pattern, update this file and the relevant module `DESIGN.md`/`README.md` in the same PR so guidance stays in sync.

## Stacks

- **Renderer:** Node 24, TypeScript (strict), React 19, shadcn/ui + Tailwind, XYFlow canvases, React Hook Form, Vitest + Testing Library, pnpm 10
- **Host / Engines:** Rust 2024 edition, tokio, serde, thiserror, tracing + `log` facade, dirs/directories for platform paths
- **Monorepo:** pnpm workspaces; Cargo workspace for Rust crates

## Architecture & Boundaries

This document applies coding rules to the architecture; it does not redefine it. For the canonical description of layers, adapters, and time-first boundaries see [`docs/01-architecture/ARCHITECTURE-BOUNDARY.md`](../01-architecture/ARCHITECTURE-BOUNDARY.md).

### Product modules and naming

- **Canonical modules:** Praxis (core/host & engine orchestration), Mneme (persistence & shared DTOs), Metis (analytics/reasoning), Chrona (time/visualisation), Continuum (automation/orchestration).
- **When to add a module** (require ≥2): distinct runtime/container; distinct dependency profile; versioned public API with a different release cadence; multi-consumer reuse across UIs/services; separate security/licensing boundary.
- **Rust crate prefixes:** `praxis_*`, `mneme_*`, `metis_*`, `chrona_*`, `continuum_*`.
- **TypeScript package prefixes (pnpm workspace):** `@aideon/Praxis*`, `@aideon/Mneme*`, `@aideon/Metis*`, `@aideon/Chrona*`, `@aideon/Continuum*`.
- **Approved suffixes** (meaningful roles only): `-core`, `-engine`, `-adapter`, `-sqlite`, `-postgres`, `-api`, `-ui`, `-worker`, `-cli`, `-macros`, `-xtask`.
- **Prohibited names:** `util`, `common`, `shared` without a clarifying role suffix. Use domain-specific names.
- **Path stability:** external import paths must remain stable across refactors; reshape internal structure via facades/barrel exports rather than changing consumer paths.

## Frameworks-first Defaults

Use these before inventing alternatives:

- **TS/React:** React 19, shadcn/ui + Tailwind, React Flow/XYFlow for canvases, React Hook Form, Testing Library + Vitest, pnpm 10, Node 24. Use TanStack Table for tables; avoid bespoke component primitives.
- **Rust:** tokio for async, serde for serialisation, thiserror for typed errors, tracing + `log` facade for logging, dirs/directories for platform paths, serde_json/bincode as defaults before adding new formats, anyhow for internal glue only. Prefer established crates over custom helpers.

Do not build custom UI kits, form/state helpers, logging wrappers, or async executors unless module design docs require it.

---

## IPC Boundary Discipline

The renderer communicates with the host exclusively over typed Tauri IPC. This boundary is non-negotiable.

### Ownership and generated types

- **Rust owns the wire shape.** All command argument and return types are defined in Rust (`crates/mneme` for shared DTOs, `src-tauri` for host commands) and serialised via serde.
- **TypeScript consumes generated types.** The TS side is the generated consumer; it must not invent its own representations of IPC-crossing data.
- **Adapters own all IPC calls.** React components must not call `invoke()` directly; they call the typed `praxisApi` wrapper (or equivalent adapter module). No component imports `@tauri-apps/api` directly.
- **Validate at the boundary.** Sanitise and validate data crossing IPC in both directions; do not leak privileged host data into the renderer.
- **No renderer FS access, no renderer HTTP, no open TCP ports in desktop mode.** All file system and network operations belong to the Rust host.

### IPC error envelope

Every command returns a result envelope. The Rust host maps typed errors to this envelope before sending to the renderer:

```rust
// src-tauri/src/error.rs (illustrative)
#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct IpcError {
    pub code: String,       // stable machine-readable code (e.g. "NOT_FOUND")
    pub message: String,    // human-readable description
    pub detail: Option<serde_json::Value>, // optional structured context
}
```

```typescript
// renderer — consume the envelope
type IpcResult<T> = { ok: true; data: T } | { ok: false; error: IpcError };
```

- Error codes are stable across versions; do not expose Rust error variants directly.
- Map all foreign/library errors at the host boundary; raw internal error shapes must not reach the renderer.

---

## Error Handling

### Rust

- Each crate defines a local error type using `thiserror`; this is the crate's only public error surface.
- Convert foreign errors at the crate boundary using `From`/`map_err`; do not bubble raw `std::io::Error` or third-party error types through public APIs.
- Avoid `anyhow::Error` in public APIs; it is acceptable in binaries and internal glue.
- The host maps all engine errors to the `IpcError` envelope before crossing to the renderer.

```rust
// crates/praxis/src/error.rs
#[derive(Debug, thiserror::Error)]
pub enum PraxisError {
    #[error("op not found: {0}")]
    NotFound(String),
    #[error("storage failure")]
    Storage(#[from] mneme::StorageError),
    // ...
}
```

### TypeScript / React

- Throw `Error` subclasses with a stable `code` property and an optional `cause`; never throw plain strings.
- Map IPC envelope errors at the adapter layer; components receive typed error states, not raw IPC shapes.
- Do not swallow errors silently; surface them through UI error states or log them with structured context.

---

## Immutability and the Append-Only Op Model

These rules enforce the time-first, append-only commitment model across the codebase.

- **Ops are immutable once written.** An op record is a temporal fact; it is never updated or deleted in place. New ops supersede earlier ones through the normal resolution logic.
- **Never mutate a persisted entity directly.** Always produce a new op that records the intended change; the storage layer derives the current view from the op log.
- **In-memory representations follow the same discipline.** Prefer returning new objects/values over mutating existing ones. Rust: prefer owned values and `Clone` over interior mutation in domain code. TypeScript: prefer spreading or structuredClone over in-place property assignment.
- **Scenario branching is append-only.** Creating a scenario fork adds a branch record; it does not rewrite or copy the existing op log.
- **Content-addressed blobs are immutable by definition.** Never overwrite a blob at an existing address; write a new blob and update the reference.

---

## TypeScript / React — Renderer Conventions

### Module and file layout

1. **Packages (workspace)**
   - One purpose per package; no circular dependencies.
   - Keep dependencies minimal; runtime deps in runtime packages, dev-deps in root or the consuming package.
   - Import only from a package's root entry (`exports` field); do not deep-import into `pkg/internal/…`.
   - Use the `exports` field to define the public surface; keep internals private.
   - Browser code must not depend on Node-only modules.

2. **Modules and directories**
   - One concept per module; if a module gains children, use a directory with an `index.ts` façade.
   - Keep nesting shallow (≤3 levels); prefer a flat tree to deep hierarchies.
   - Avoid `util`/`misc`; name by domain or role.

3. **Files**
   - One responsibility per file; split when a second reason to change appears.
   - Target ≤300–500 LOC; treat 500 as the hard ceiling.
   - Co-locate unit tests as `*.test.ts`/`*.spec.ts`; put integration/e2e tests in dedicated `tests/` folders.
   - Barrel files (`index.ts`) export only the public API, not everything by default.

4. **Naming**
   - Folders/packages: `kebab-case`; files: `kebab-case`.
   - Variables/functions: `camelCase`; types/classes/interfaces: `PascalCase`.
   - Suffixes by role: `*.service.ts`, `*.repo.ts`, `*.schema.ts`, `*.handler.ts`, `*.adapter.ts`.
   - Avoid abbreviations and generic labels.

5. **Visibility and API shaping**
   - Prefer named exports; avoid default exports in libraries.
   - Surface a tidy API via `index.ts` with selective re-exports; do not leak folder structure.

6. **Layering and boundaries**
   - Renderer is UI only; no Node APIs — communicate via typed IPC adapters.
   - Host orchestrates side effects; business logic shared across layers belongs in a pure library package.
   - Define ports (TypeScript interfaces) for external systems; implement adapters in infra packages.
   - DTOs (I/O shapes) are separate from domain models.

7. **Dependencies**
   - Avoid leaking third-party types in public APIs; wrap at the boundary.
   - Prefer small, well-maintained libraries; pin versions where stability matters.
   - Keep test-only deps as dev-deps; avoid bringing heavy test deps into runtime packages.

8. **Configuration**
   - Validate environment/config with a schema (Zod) at startup; crash fast on invalid config.
   - Read `process.env` only in one composition layer; pass typed config downward.
   - Use build-time flags (`import.meta.env`) for environment branches; avoid ad-hoc globals.

9. **Async and state**
   - Prefer pure, stateless functions; isolate side effects.
   - Use `AbortSignal` for cancelable async work; ensure cleanup in `finally` blocks.
   - Avoid module-level mutable state in libraries; if required, hide behind a factory and document lifecycle.

10. **Feature flags**
    - Centralise feature flags; do not scatter `if (import.meta.env…)` throughout the codebase.
    - Keep flags orthogonal and documented; avoid changing public types under flags.

11. **Testing**
    - Unit-test behaviour via public exports; minimise reliance on private internals.
    - Use fakes over heavy mocks for ports/adapters; keep tests deterministic and isolated.
    - Snapshot tests only for stable, intentional outputs (e.g., rendered HTML fragments, schemas).
    - It is acceptable to export clearly named test-only helpers (e.g., `__test__`) to improve branch coverage when they have no runtime effect.

12. **Documentation and comments**
    - Start each module with a brief TSDoc explaining purpose and invariants.
    - Document all public exports succinctly; include small examples where helpful.

13. **Lint, format, and CI**
    - Enforce ESLint and Prettier; no inline suppressions without a narrow scope, a reason, and a removal condition referencing an issue.
    - CI fails on lint/type errors and on coverage gates for changed code.

---

## Rust — Host and Engine Crates

### Crate and module layout

1. **Crates**
   - Each crate has one clear purpose and one reason to change.
   - No cyclic dependencies. Put shared traits/types/errors in a small core crate; implementation crates depend on it.
   - Keep dependencies minimal; isolate heavy/optional deps in leaf crates.
   - Treat crate boundaries as public APIs; keep surfaces small and stable.
   - Use features to toggle optional backends or integrations; features are additive and off by default.
   - Do not expose third-party types in public APIs where avoidable.

2. **Modules and directories**
   - One concept per module. If a module gains children, switch to a directory with a concise `mod.rs` façade.
   - Keep nesting shallow (≤3 levels); prefer a flat tree to deep hierarchies.
   - Avoid `util`/`misc` modules; name by domain or role.

3. **Files**
   - One responsibility per file; split when a second reason to change appears.
   - Target ≤300–500 LOC; treat 500 as the hard ceiling.
   - When a Rust module must stay in one namespace, split into a directory with a `mod.rs` façade to keep each file small without changing the public API.
   - Place Rust tests under crate-level `tests/`. If a test needs crate-private access, include it as `#[cfg(test)] #[path = "../tests/internal/<file>.rs"] mod <name>;` from the owning source file so test code stays out of `src/` and is not auto-discovered as an integration test.
   - Prefer file-level `#[cfg(feature = "...")]` over scattered fine-grained `cfg` attributes.

4. **Naming**
   - `snake_case` throughout. Choose descriptive, stable names.
   - Nouns for data types; role suffixes for behaviour (`_repo`, `_service`, `_handler`).
   - Avoid abbreviations and generic labels.
   - Crate package names (`Cargo [package].name`): kebab-case (e.g., `praxis-core`); library name defaults to snake_case; set `lib.name` only if needed for coherence.
   - Only create a `prelude` module for a small set of frequently used traits/types; keep it minimal and opt-in.
   - Feature names: all-lowercase, additive; backend features (`sqlite`, `postgres`, `memory`), platform features (`desktop`, `server`). Features must not change public type shapes in incompatible ways.

5. **Visibility and API shaping**
   - Default to private. Escalate to `pub(super)` or `pub(crate)` before `pub`.
   - Present a tidy API via facades (`lib.rs`/`mod.rs`) with selective `pub use`.
   - Keep internal structure hidden; callers see a clean, flat surface.

6. **Layering and boundaries**
   - Separate domain, persistence, transport, and presentation concerns.
   - Do not cross-leak types between layers (e.g., DB row types must not appear in IPC DTOs).
   - Cross layers via traits defined in the core crate.
   - Engine crates must not import Tauri or any UI dependency.

7. **Dependencies**
   - Do not leak implementation-specific types in public function signatures.
   - Keep optional or heavyweight deps behind features and out of core crates.

8. **Errors**
   - Provide a crate-local error type (`thiserror`) and convert foreign errors at the boundary.
   - Avoid `anyhow::Error` in public APIs; fine for internals and binaries.

9. **Configuration and initialisation**
   - Define typed config structs; deserialise once at the edge.
   - Initialise resources (pools, loggers, caches) in the binary/composition layer; pass handles explicitly.

10. **Concurrency and state**
    - Prefer explicit, clonable handles (`Arc`, connection pools).
    - No global mutable state; if a singleton is required, keep it crate-private and well-documented.

11. **Features and conditional compilation**
    - Keep features orthogonal and well-documented; avoid feature combinations that change public types.
    - Use features to select backends (e.g., `sqlite`/`postgres`) without altering call sites.

12. **Testing**
    - Test behaviour through public APIs and traits; minimise reliance on private internals.
    - Provide lightweight in-memory or fake backends for logic tests.
    - Keep tests deterministic and isolated; no shared mutable state across tests.

13. **Documentation and comments**
    - Start each module/file with a brief `//!` explaining purpose and invariants.
    - Document all `pub` items succinctly with examples where helpful.

14. **Lint, format, and CI**
    - Enforce `rustfmt` defaults and `clippy` at least `-W clippy::all`; fail CI on warnings in library crates.
    - Keep imports ordered; avoid wildcard imports in libraries.

15. **Refactors and history**
    - Apply changes incrementally; preserve history with `git mv`.
    - After splits, reshape the façade so external paths stay stable.

---

## Quality Gates

### Coverage targets (new/changed code)

| Scope              | Lines | Branches | Functions |
| ------------------ | ----- | -------- | --------- |
| Node/TS renderer   | ≥ 80% | ≥ 80%    | ≥ 80%     |
| Rust host crate    | ≥ 80% | ≥ 80%    | ≥ 80%     |
| Rust engine crates | ≥ 90% | ≥ 90%    | ≥ 90%     |

- Generated code and build artefacts are excluded; justify any additional exclusions with a comment and an issue reference.
- Flaky tests: quarantine behind a tag and open an issue; fixing flakiness has higher priority than adding new tests.

### Sonar

- New code is measured against `main` (`sonar.new_code.referenceBranch=main`).
- CI waits for the Sonar Quality Gate; a failing gate blocks merges.
- Sonar runs Clippy as part of Rust analysis; keep the CI environment's Rust toolchain consistent and include the `clippy` component.

---

## Commit Hygiene

Run these locally before every commit; CI enforces the same gates:

```sh
# Renderer (TypeScript / React)
pnpm run node:format
pnpm run node:lint:fix
pnpm run node:typecheck
pnpm run node:test:coverage

# Host and engines (Rust)
pnpm run host:format        # cargo fmt
pnpm run host:lint          # cargo clippy --all-targets -- -D warnings
pnpm run host:check         # cargo check (workspace)
cargo test --all --all-targets
```

- Coverage gates must be met on new/changed code in both renderer and Rust crates.
- No inline rule suppressions; refactor to satisfy linters and static analysis.
- Conventional Commits are required: `feat|fix|chore|ci|docs|test|refactor|perf|style`.
- Pre-commit hooks run only on changed files; use `--no-verify` only with justification and a follow-up issue.

---

## CI

- CI uses pnpm 10 and Cargo; ensure `rustfmt` and `clippy` components are installed in the build environment.
- Fail-fast ordering: lint/type before unit tests; heavier jobs (coverage, integration) after quick gates pass.
- Run JS/TS and Rust checks in parallel CI jobs where possible.
- Cache pnpm/Cargo artefacts between runs.
- Prefer package-scoped test runs and changed-files filters for incremental builds.

---

## Security and Boundaries

- **No renderer HTTP.** Renderer ↔ host communication is Tauri IPC only.
- **No open TCP ports in desktop mode.** Host ↔ engine adapters stay in-process and typed.
- **PII:** redact by default on exports and APIs; add tests where applicable.
- **Dependencies:** review regularly; avoid unvetted libraries; lock through pnpm and Cargo; prefer pinned dev-tool versions.
- **Secrets:** never hard-code; provide via env/config; CI scans for secrets.
- **Threat modelling:** required for new public interfaces or boundary changes.
- Deny-by-default on authorisation; structured logs with correlation identifiers at boundaries; never log secrets or raw tokens.

---

## Tooling and Performance at Scale

- Enable dependency and build caches in CI for pnpm and Cargo.
- TypeScript: use project references and/or path aliases for workspace packages.
- Prefer streaming-friendly payloads (Arrow/bytes) over large JSON blobs when adding new Rust APIs.
- Quarantine slow tests and track with an issue; do not disable quality gates.

---

## Versioning and Governance

- **Ownership:** standards are owned by maintainers; propose changes via PR tagged `docs(standards)`.
- **Exceptions:** document and time-limit any deviation with issue links and a plan to converge.
- **Schema:** forward-only; provide migration scripts and bump `schemaVersion`. Snapshots are immutable; scenarios branch and merge; no history rewrites.

---

## References

- Commands: root `package.json` (`pnpm -w run`)
- Practices and guardrails: [`AGENTS.md`](../../AGENTS.md)
- Architecture layers and adapters: [`docs/01-architecture/ARCHITECTURE-BOUNDARY.md`](../01-architecture/ARCHITECTURE-BOUNDARY.md)
- Design governance and ADR format: [`docs/02-standards/DESIGN-GOVERNANCE.md`](DESIGN-GOVERNANCE.md), [`docs/02-standards/ADR-FORMAT.md`](ADR-FORMAT.md)
- Testing strategy: [`docs/02-standards/TESTING-STRATEGY.md`](TESTING-STRATEGY.md)
- Contracts and schemas: [`docs/04-contracts/CONTRACTS-AND-SCHEMAS.md`](../04-contracts/CONTRACTS-AND-SCHEMAS.md)
- Desktop-first workspace: [`docs/03-design/DESKTOP-FIRST-WORKSPACE.md`](../03-design/DESKTOP-FIRST-WORKSPACE.md)
- Contributor workflow: [`CONTRIBUTING.md`](../../CONTRIBUTING.md)
