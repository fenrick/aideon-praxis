# Coding Standards

The shared coding rules, quality gates, boundary discipline, and module expectations for the Aideon Desktop repository — the rules a competent engineer follows so that code at the renderer ↔ host ↔ engine seams stays correct, typed, and reviewable. This document applies the [architecture](../01-architecture/ARCHITECTURE-BOUNDARY.md) and [governance](./DESIGN-GOVERNANCE.md) rules to code; it does not redefine them.

> When changing a public API, a cross-module boundary, or establishing a new pattern, update this file and the relevant module `DESIGN.md`/`README.md` in the same PR so guidance stays in sync. A public-seam change is reviewed against the governance reversibility rubric ([DESIGN-GOVERNANCE.md §7](./DESIGN-GOVERNANCE.md#7-change-impact-and-reversibility-rubric)).

---

## Contents

1. [Stacks](#1-stacks)
2. [Architecture and boundaries](#2-architecture-and-boundaries)
3. [Frameworks-first defaults](#3-frameworks-first-defaults)
4. [API stability and SemVer](#4-api-stability-and-semver)
5. [IPC boundary discipline](#5-ipc-boundary-discipline)
6. [Error handling and the RFC 9457 envelope](#6-error-handling-and-the-rfc-9457-envelope)
7. [Rust — Result discipline and exception safety](#7-rust--result-discipline-and-exception-safety)
8. [Rust — concurrency](#8-rust--concurrency)
9. [TypeScript — strict mode](#9-typescript--strict-mode)
10. [Async and cancellation (AbortSignal)](#10-async-and-cancellation-abortsignal)
11. [Immutability and the append-only op model](#11-immutability-and-the-append-only-op-model)
12. [TypeScript / React — renderer conventions](#12-typescript--react--renderer-conventions)
13. [Rust — host and engine crates](#13-rust--host-and-engine-crates)
14. [PII handling](#14-pii-handling)
15. [Secure coding](#15-secure-coding)
16. [Quality gates](#16-quality-gates)
17. [Commit hygiene and CI](#17-commit-hygiene-and-ci)
18. [Versioning and governance](#18-versioning-and-governance)
19. [References & standards](#references--standards)
20. [Related documents](#related-documents)

---

## 1. Stacks

- **Renderer:** Node 24, TypeScript (strict), React 19, shadcn/ui + Tailwind, XYFlow canvases, React Hook Form, Vitest + Testing Library, pnpm 10.
- **Host / Engines:** Rust 2024 edition, tokio, serde, thiserror, tracing + the `log` facade, dirs/directories for platform paths.
- **Monorepo:** pnpm workspaces; Cargo workspace for Rust crates.

---

## 2. Architecture and boundaries

This document applies coding rules to the architecture; it does not restate it. For the canonical description of layers, adapters, and time-first boundaries see [ARCHITECTURE-BOUNDARY.md](../01-architecture/ARCHITECTURE-BOUNDARY.md).

### Product modules and naming

- **Canonical modules:** [Praxis](../05-modules/praxis/README.md) (meaning, types, artefact execution), [Mneme](../05-modules/mneme/README.md) (storage and shared DTOs), [Metis](../05-modules/metis/README.md) (analytics), [Chrona](../05-modules/chrona/README.md) (time and scenario), [Continuum](../05-modules/continuum/README.md) (orchestration), [Host](../05-modules/host/README.md) (the Tauri trust boundary), [Engine](../05-modules/engine/README.md) (the engine harness). The full taxonomy and the "earns its own module" test are in [ADR-0011](../06-adrs/ADR-0011-module-taxonomy-and-boundaries.md).
- **When to add a module** (require ≥ 2 of): distinct runtime/container; distinct dependency profile; a versioned public API with a different release cadence; multi-consumer reuse across UIs/services; a separate security/licensing boundary.
- **Rust crate prefixes:** `praxis_*`, `mneme_*`, `metis_*`, `chrona_*`, `continuum_*`.
- **TypeScript package prefixes (pnpm workspace):** `@aideon/praxis*`, `@aideon/mneme*`, `@aideon/metis*`, `@aideon/chrona*`, `@aideon/continuum*`.
- **Approved suffixes** (meaningful roles only): `-core`, `-engine`, `-adapter`, `-sqlite`, `-postgres`, `-api`, `-ui`, `-worker`, `-cli`, `-macros`, `-xtask`.
- **Prohibited names:** `util`, `common`, `shared` without a clarifying role suffix. Use domain-specific names.
- **Path stability:** external import paths must remain stable across refactors; reshape internal structure via facades/barrel exports rather than changing consumer paths.

---

## 3. Frameworks-first defaults

Use these before inventing alternatives.

- **TS/React:** React 19, shadcn/ui + Tailwind, XYFlow for canvases, React Hook Form, Testing Library + Vitest, pnpm 10, Node 24. Use TanStack Table for tables; avoid bespoke component primitives.
- **Rust:** tokio for async, serde for serialisation, thiserror for typed errors, tracing + the `log` facade for logging, dirs/directories for platform paths, serde_json/bincode as defaults before adding a new format, anyhow for internal glue only. Prefer established crates over custom helpers.

Do not build custom UI kits, form/state helpers, logging wrappers, or async executors unless a module design doc requires it.

---

## 4. API stability and SemVer

DTOs, contracts, crates, and packages are versioned with **Semantic Versioning 2.0.0** ([ADR-0017](../06-adrs/ADR-0017-contract-and-dto-versioning.md)). One rule answers "does this change need a MAJOR bump?" everywhere.

- A **MAJOR** bump is required for any incompatible change: removing or renaming a field, removing an enum variant, changing a field's type or meaning, or renaming a stable error code ([ADR-0016](../06-adrs/ADR-0016-error-envelope-rfc9457.md)).
- A **MINOR** bump covers backwards-compatible additions: a new optional field, a new enum variant behind explicit handling, a new command.
- A **PATCH** bump covers a backwards-compatible fix.
- **Schema evolution is forward-only and additive within a MAJOR.** A consumer reading a newer MINOR **must** ignore unknown fields rather than fail — additive changes do not break older readers. In TypeScript this means parsing the boundary shape, not asserting it (§9); in Rust it means `#[serde(default)]` and avoiding `deny_unknown_fields` on inbound DTOs.
- **Deprecation precedes removal.** A public seam follows the deprecation/sunset lifecycle ([DESIGN-GOVERNANCE.md §6](./DESIGN-GOVERNANCE.md#6-deprecation-and-sunset-lifecycle)): marked Deprecated in a MINOR for at least one release before a MAJOR removes it. Annotate the deprecation in code (`#[deprecated(note = "…; use X; removed in vN")]` in Rust, `@deprecated` TSDoc in TypeScript) and in the owning contract document.
- **Stored material records the version that wrote it** ([ADR-0002](../06-adrs/ADR-0002-portable-workspace-format.md)); a host rejects a workspace whose schema MAJOR exceeds what it supports with `SCHEMA_TOO_NEW`.
- The IPC-manifest drift check ([CONTRACTS-AND-SCHEMAS.md](../04-contracts/CONTRACTS-AND-SCHEMAS.md)) is the trigger to _consider_ a version bump, not a substitute for the policy.

A change to a versioned public seam is scored on the reversibility rubric ([DESIGN-GOVERNANCE.md §7](./DESIGN-GOVERNANCE.md#7-change-impact-and-reversibility-rubric)) and, where it scores Hard, carries an ADR.

---

## 5. IPC boundary discipline

The renderer communicates with the host exclusively over typed Tauri IPC. This boundary is non-negotiable ([ADR-0006](../06-adrs/ADR-0006-tauri-trust-boundary-and-typed-ipc.md)).

### Ownership and generated types

- **Rust owns the wire shape.** All command argument and return types are defined in Rust (`crates/mneme` for shared DTOs, `src-tauri` for host commands) and serialised via serde.
- **TypeScript consumes generated types.** The TS side is the generated consumer; it must not invent its own representations of IPC-crossing data.
- **Adapters own all IPC calls.** React components must not call `invoke()` directly; they call the typed `praxisApi` wrapper (or equivalent adapter module). No component imports `@tauri-apps/api` directly.
- **Validate at the boundary, in both directions.** The host validates every inbound payload against the contract before acting ([ADR-0023](../06-adrs/ADR-0023-threat-model-stride-asvs.md), §15); the renderer parses host responses rather than trusting their shape (§9). Privileged host data must not leak into the renderer.
- **No renderer FS access, no renderer HTTP, no open TCP ports in desktop mode.** All filesystem and network operations belong to the Rust host.

---

## 6. Error handling and the RFC 9457 envelope

Every command returns a result envelope shaped as an **RFC 9457 Problem Detail** carried over IPC rather than HTTP ([ADR-0016](../06-adrs/ADR-0016-error-envelope-rfc9457.md)). The host maps typed errors to this envelope before sending to the renderer.

```rust
// src-tauri/src/error.rs (illustrative — aligned to RFC 9457 members)
#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct IpcError {
    pub r#type: String,                     // stable URI reference identifying the problem kind
    pub title: String,                      // short human summary, safe for UI
    pub detail: Option<String>,             // human-readable explanation of this occurrence
    pub code: String,                       // stable machine-readable code (e.g. "BACKPRESSURE")
    pub category: ErrorCategory,            // validation | permission | conflict | transient | internal
    pub recovery: RecoveryHint,             // retry | reconcile | refresh | none | report
    pub correlation_id: String,            // joins the error to host logs and the trace (ADR-0019)
    pub details: Option<serde_json::Value>, // optional structured context — never secrets or stack traces
}
```

```typescript
// renderer — consume the envelope; react by category and hint, not by hard-coded code knowledge
type IpcResult<T> = { ok: true; data: T } | { ok: false; error: IpcError };
```

Rules:

- **Codes are stable across versions**; do not expose Rust error variants directly. Each code maps to exactly one **category** so the renderer reacts generically — `transient` + `recovery: retry` shows a queued state and retries with backoff; `validation` shows the problem inline; `internal` shows a generic failure and captures diagnostics ([ADR-0016](../06-adrs/ADR-0016-error-envelope-rfc9457.md)).
- **Map all foreign/library errors at the host boundary**; raw internal error shapes must not reach the renderer.
- **`detail` and `details` must not leak secrets or stack traces** ([security/audit-and-logging.md](./security/audit-and-logging.md), §15).
- **Errors carry the `correlation_id`** of the failing command, so a UI error joins to the host trace ([ADR-0019](../06-adrs/ADR-0019-observability-and-trace-context.md)).
- A renaming of a stable code is a MAJOR change (§4); adding a code, category mapping, or recovery hint is additive.

### TypeScript / React error handling

- Throw `Error` subclasses with a stable `code` property and an optional `cause`; never throw plain strings.
- Map IPC envelope errors at the adapter layer; components receive typed error states, not raw IPC shapes.
- Do not swallow errors silently; surface them through UI error states or log them with structured context.

---

## 7. Rust — Result discipline and exception safety

Rust has no exceptions in the C++/Java sense; its error model is `Result<T, E>` plus `panic!` for unrecoverable bugs. The discipline below keeps recoverable failure typed and panics rare and contained.

### Result and the typed error surface

- **Each crate defines one local error type** with `thiserror`; this is the crate's only public error surface. Convert foreign errors at the crate boundary with `From`/`map_err` — do not bubble raw `std::io::Error` or third-party error types through public APIs.

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

- **Public APIs return `Result`, not `anyhow::Error`.** `anyhow` is acceptable in binaries and internal glue only.
- **Propagate with `?`; do not discard a `Result`.** A deliberately ignored result is written `let _ = …;` with a comment saying why. Clippy's `must_use` lints are enforced (§17).
- **The host maps every engine error to the `IpcError` envelope** before crossing to the renderer (§6).

### Panic discipline and exception safety

- **`panic!`, `unwrap()`, and `expect()` are for invariants that cannot fail by construction, not for handling input.** Any failure derived from user input, a file, an IPC payload, or a network response is a `Result`, never a panic.
- **`unwrap()`/`expect()` are prohibited in library crates outside tests** (Clippy `unwrap_used`/`expect_used` are denied in library crates). Use `?` or an explicit error. In tests, `expect("…")` with a message is preferred over `unwrap()`.
- **No panic crosses a crate or IPC boundary.** The host catches a panic at the command boundary (`catch_unwind` around the dispatch) and maps it to an `INTERNAL_ERROR` envelope (`internal`/`report`), so a single command's bug cannot tear down the host process.
- **Exception safety = leave-no-broken-state.** A function that mutates shared state and may return `Err` must leave that state consistent on the error path. Prefer the **commit-or-rollback** shape: compute the new value, validate it, then swap it in as the last step, so an early `Err` leaves the prior value untouched. This mirrors the append-only model (§11): the canonical op log only gains a record once the op is fully formed and durable ([ADR-0001](../06-adrs/ADR-0001-workspace-is-canonical-authority.md)).
- **`Drop` impls must not panic**, and must not perform fallible I/O whose failure matters — a panic during unwinding aborts the process. Flush-and-close logic that can fail exposes an explicit fallible method; `Drop` is a best-effort backstop.

---

## 8. Rust — concurrency

The host is async (tokio); the engines are largely synchronous behind traits, invoked from a bounded worker. The rules keep shared state sound and the single-writer invariant intact.

- **Share state with explicit, clonable handles** (`Arc`, `Arc<Mutex<…>>`, connection pools), passed down from the composition layer. **No global mutable state**; if a singleton is unavoidable, keep it crate-private and document its lifecycle.
- **Hold a lock for the shortest possible span, and never across an `.await`.** Holding a `std::sync::Mutex` across an await point can deadlock the executor; if a lock must span async work, use `tokio::sync::Mutex` deliberately and document why. Prefer copying the needed value out, releasing the lock, then awaiting.
- **One single-writer queue per workspace serialises all mutations** ([ADR-0004](../06-adrs/ADR-0004-storage-engine-abstraction.md)). Engine code does not spawn its own writers; it submits to the queue. Concurrent reads are fine; concurrent writes are a contract violation, not a race to win.
- **Prefer message passing over shared mutation** for cross-task coordination: `tokio::sync::mpsc`/`oneshot` channels carry owned values, sidestepping shared-lock hazards. The accepted-work model is built this way — a command submits and returns an `AcceptedJob`; progress flows back as events ([accepted-work contract](../04-contracts/accepted-work-and-events/README.md)).
- **CPU-bound engine work runs off the async runtime** (`spawn_blocking` or a dedicated thread pool), so a heavy analytics pass ([Metis](../05-modules/metis/README.md)) does not starve the IPC reactor.
- **Cancellation is cooperative and explicit** (§10): long jobs check a cancellation token at safe points and unwind cleanly, leaving consistent state (§7).
- **Document the `Send`/`Sync` contract of any public handle** that crosses threads; do not paper over a non-`Send` type with `unsafe`.

---

## 9. TypeScript — strict mode

The renderer compiles under TypeScript `strict` (which enables `strictNullChecks`, `noImplicitAny`, `strictFunctionTypes`, and the rest). The boundary is where types are weakest, so the rules concentrate there.

- **`strict` is on and stays on.** Loosening a `tsconfig` strictness flag is a change to a quality gate and requires the same justification as a lint suppression (§17).
- **`any` is prohibited.** Where a value's type is genuinely unknown — most often a value crossing the IPC boundary — use **`unknown`** and narrow it explicitly. `any` disables type checking silently and is the usual root of a boundary bug. ESLint `@typescript-eslint/no-explicit-any` is enforced.
- **Parse, do not assert, at the boundary.** A value arriving from IPC, a file, or config is `unknown` until validated by a schema (Zod) that returns a typed value. **Type assertions (`as T`, `!` non-null) are last resorts**, used only where the compiler genuinely cannot follow a proven invariant, and then with a comment stating the proof. An `as` cast does not check anything at runtime; a parser does.
- **No unchecked index access surprises.** Treat array/object index access as possibly `undefined` (`noUncheckedIndexedAccess` is enabled) and handle the absent case.
- **Exhaustiveness is checked.** Discriminated-union `switch` statements end with a `never`-typed default (`assertNever`) so adding a variant is a compile error at every consumer — the same forward-compatibility discipline as §4.
- **Public types are declared, not inferred at the seam.** Exported functions and module public APIs carry explicit return types; internal locals may infer.

---

## 10. Async and cancellation (AbortSignal)

Cancellation is a first-class concern on both sides of the boundary: a user who navigates away, closes a panel, or cancels a long job must not leave work running or state half-written.

### TypeScript / React

- **Cancellable async work takes an `AbortSignal`.** `fetch`-style and IPC-adapter calls that can be abandoned accept a signal; on abort they reject with the signal's reason and stop.
- **Clean up in `finally` and on unmount.** A React effect that starts async work returns a cleanup that calls `controller.abort()`; an adapter that subscribes to host events unsubscribes on abort. Resource release lives in `finally`, not only on the happy path.
- **Do not set state after unmount.** Guard a post-`await` state update with `signal.aborted` (or an `AbortError` catch), so a resolved promise from an abandoned request does not write into a dead component.
- **A cancellation is not an error to surface.** Swallow `AbortError` at the adapter; only genuine failures reach the UI error state (§6).

### Host

- A long job's cancellation flows through the accepted-work control operations ([accepted-work contract](../04-contracts/accepted-work-and-events/README.md)); the renderer's abort maps to a cancel control message, and the host unwinds the job cooperatively (§8), leaving the op log consistent. Cancelling a job is distinct from failing it: a cancelled job records a terminal cancelled state, not an error envelope.

---

## 11. Immutability and the append-only op model

These rules enforce the time-first, append-only commitment model across the codebase ([ADR-0001](../06-adrs/ADR-0001-workspace-is-canonical-authority.md)).

- **Operations are immutable once written.** An operation record is a temporal fact; it is never updated or deleted in place. New operations supersede earlier ones through the normal resolution logic.
- **Never mutate a persisted entity directly.** Always produce a new operation that records the intended change; the storage layer derives the current view from the op log.
- **In-memory representations follow the same discipline.** Prefer returning new values over mutating existing ones. Rust: prefer owned values and `Clone` over interior mutation in domain code. TypeScript: prefer spreading or `structuredClone` over in-place property assignment.
- **Scenario branching is append-only.** Creating a scenario fork adds a branch record; it does not rewrite or copy the existing op log.
- **Content-addressed blobs are immutable by definition** ([ADR-0003](../06-adrs/ADR-0003-content-addressed-object-store.md)). Never overwrite a blob at an existing address; write a new blob and update the reference.

---

## 12. TypeScript / React — renderer conventions

### Module and file layout

1. **Packages (workspace)** — one purpose per package; no circular dependencies. Keep dependencies minimal (runtime deps in runtime packages, dev-deps in root or the consuming package). Import only from a package's root entry (`exports` field); do not deep-import into `pkg/internal/…`. Browser code must not depend on Node-only modules.
2. **Modules and directories** — one concept per module; if a module gains children, use a directory with an `index.ts` façade. Keep nesting shallow (≤ 3 levels). Avoid `util`/`misc`; name by domain or role.
3. **Files** — one responsibility per file; split when a second reason to change appears. Target ≤ 300–500 LOC; treat 500 as the hard ceiling. Co-locate unit tests as `*.test.ts`/`*.spec.ts`; put integration/e2e tests in dedicated `tests/` folders. Barrel files export only the public API.
4. **Naming** — folders/packages and files `kebab-case`; variables/functions `camelCase`; types/classes/interfaces `PascalCase`. Role suffixes: `*.service.ts`, `*.repo.ts`, `*.schema.ts`, `*.handler.ts`, `*.adapter.ts`. Avoid abbreviations and generic labels.
5. **Visibility and API shaping** — prefer named exports; avoid default exports in libraries. Surface a tidy API via `index.ts` with selective re-exports; do not leak folder structure.
6. **Layering and boundaries** — the renderer is UI only; no Node APIs — communicate via typed IPC adapters. Business logic shared across layers belongs in a pure library package. Define ports (TypeScript interfaces) for external systems; implement adapters in infra packages. DTOs (I/O shapes) are separate from domain models.
7. **Dependencies** — avoid leaking third-party types in public APIs; wrap at the boundary. Prefer small, well-maintained libraries; pin versions where stability matters.
8. **Configuration** — validate environment/config with a schema (Zod) at startup; crash fast on invalid config. Read `process.env`/`import.meta.env` only in one composition layer; pass typed config downward.
9. **Async and state** — prefer pure, stateless functions; isolate side effects. Use `AbortSignal` for cancellable async work and clean up in `finally` (§10). Avoid module-level mutable state in libraries; if required, hide behind a factory and document lifecycle.
10. **Feature flags** — centralise flags; do not scatter `if (import.meta.env…)`. Keep flags orthogonal and documented; avoid changing public types under flags.
11. **Testing** — unit-test behaviour via public exports. Use fakes over heavy mocks for ports/adapters; keep tests deterministic. Snapshot tests only for stable, intentional outputs.
12. **Documentation** — start each module with a brief TSDoc explaining purpose and invariants; document public exports succinctly.
13. **Lint and format** — enforce ESLint and Prettier; no inline suppressions without a narrow scope, a reason, and a removal condition referencing an issue.

---

## 13. Rust — host and engine crates

### Crate and module layout

1. **Crates** — one clear purpose and one reason to change. No cyclic dependencies; put shared traits/types/errors in a small core crate. Treat crate boundaries as public APIs; keep surfaces small and stable. Use additive, off-by-default features to toggle optional backends. Do not expose third-party types in public APIs where avoidable. Engine crates must not import Tauri or any UI dependency.
2. **Modules and directories** — one concept per module; if it gains children, switch to a directory with a concise `mod.rs` façade. Keep nesting shallow (≤ 3 levels). Avoid `util`/`misc`.
3. **Files** — one responsibility per file; target ≤ 300–500 LOC, 500 hard. When a module must stay in one namespace, split into a directory with a `mod.rs` façade. Place tests under crate-level `tests/`; for crate-private access include via `#[cfg(test)] #[path = "../tests/internal/<file>.rs"] mod <name>;` so test code stays out of `src/`. Prefer file-level `#[cfg(feature = "...")]` over scattered fine-grained `cfg`.
4. **Naming** — `snake_case` throughout. Nouns for data types; role suffixes for behaviour (`_repo`, `_service`, `_handler`). Crate package names kebab-case (`praxis-core`); library names snake_case. Feature names all-lowercase and additive; features must not change public type shapes incompatibly.
5. **Visibility** — default to private; escalate to `pub(super)`/`pub(crate)` before `pub`. Present a tidy API via facades with selective `pub use`.
6. **Layering** — separate domain, persistence, transport, and presentation. Do not cross-leak types between layers (DB row types must not appear in IPC DTOs). Cross layers via traits defined in the core crate.
7. **Dependencies** — do not leak implementation-specific types in public signatures; keep heavyweight/optional deps behind features and out of core crates.
8. **Errors** — a crate-local `thiserror` type; convert foreign errors at the boundary; no `anyhow::Error` in public APIs (§7).
9. **Configuration** — typed config structs deserialised once at the edge; initialise resources (pools, loggers) in the binary/composition layer and pass handles explicitly.
10. **Concurrency** — explicit clonable handles; no global mutable state (§8).
11. **Features** — keep orthogonal and documented; select backends (`sqlite`/`postgres`) without altering call sites.
12. **Testing** — test through public APIs and traits; provide in-memory/fake backends; keep tests deterministic and isolated.
13. **Documentation** — start each module/file with a `//!` explaining purpose and invariants; document `pub` items with examples where helpful.
14. **Lint and format** — enforce `rustfmt` defaults and `clippy` (at least `-W clippy::all`, denied in CI); ordered imports; no wildcard imports in libraries.
15. **Refactors** — apply changes incrementally; preserve history with `git mv`; reshape the façade so external paths stay stable after splits.

---

## 14. PII handling

Personally identifiable information is handled with deny-by-default rigour, because a desktop workspace is a cleartext folder and metadata flags alone do not protect content ([security/pii-and-export-redaction.md](./security/pii-and-export-redaction.md)).

- **PII is redacted by default on every export and diff surface.** The deterministic export pipeline ([ADR-0007](../06-adrs/ADR-0007-deterministic-package-export.md)) is the single path for shareable packages, and it strips PII before any package or diff is written.
- **Route PII through the shared redaction helpers, never ad hoc.** Code that produces an export, a log line, an analytics output, or an error `detail` calls the redaction layer rather than hand-trimming fields. Adding such a surface adds a redaction test ([TESTING-STRATEGY.md](./TESTING-STRATEGY.md)).
- **The schema tags PII.** A slot tagged `pii: true` in the metamodel ([CONTRACTS-AND-SCHEMAS.md](../04-contracts/CONTRACTS-AND-SCHEMAS.md)) is treated as personal data wherever it flows; the field classes redacted by default are listed in [security/pii-and-export-redaction.md](./security/pii-and-export-redaction.md).
- **Never log PII or secrets**, even at debug level ([security/audit-and-logging.md](./security/audit-and-logging.md)). An error envelope's `detail`/`details` must not carry personal data (§6).
- **PII must not leak through derived fields, references, or blob content.** A redacted export verifies redaction over derivations and blobs before finalising, not only over top-level fields.

---

## 15. Secure coding

Secure coding is verified against **OWASP ASVS 5.0** controls ([ADR-0023](../06-adrs/ADR-0023-threat-model-stride-asvs.md)); the per-concern mapping lives in [security/controls-asvs.md](./security/controls-asvs.md). The everyday rules:

- **Validate untrusted input at the boundary, deny-by-default.** Every IPC payload, imported file, and config value is validated against its contract before use ([ADR-0023](../06-adrs/ADR-0023-threat-model-stride-asvs.md)); a validation failure is a `validation`-category error (§6). The renderer is untrusted at all times.
- **The renderer gets product capabilities, not host capabilities** ([ADR-0006](../06-adrs/ADR-0006-tauri-trust-boundary-and-typed-ipc.md)). A command not in a window's capability manifest is unreachable. No renderer FS, no renderer HTTP, no open TCP ports ([security/capability-scoping.md](./security/capability-scoping.md)).
- **Secrets live in the OS key store**, never in workspace files, the runtime database, a log, or an exported package ([security/secrets-and-keys.md](./security/secrets-and-keys.md)). Only the Rust host reaches the key store; the renderer never receives a raw secret. Never hard-code a secret; CI scans for them.
- **Verify content-addressed blobs on read** by re-hashing against the stored digest; reject a blob whose content does not match its address ([security/blobs-and-integrity.md](./security/blobs-and-integrity.md)).
- **No unsafe Rust without justification.** `unsafe` blocks carry a comment proving the invariant they uphold and are reviewed as a boundary change; Miri/sanitiser coverage is added where it applies.
- **Avoid injection by construction.** Use parameterised queries in the storage layer, never string-built SQL; never pass renderer-supplied strings to a shell — there is no renderer shell access by design.
- **Threat-model new public interfaces and boundary changes** ([security/threat-model.md](./security/threat-model.md)) before merging.
- **Dependencies are an attack surface.** Review additions; prefer vetted, well-maintained crates/packages; lock through pnpm and Cargo; pin dev-tool versions. The build produces an SBOM and targets SLSA provenance ([security/supply-chain.md](./security/supply-chain.md)).

---

## 16. Quality gates

### Coverage targets (new/changed code)

| Scope              | Lines  | Branches | Functions |
| ------------------ | ------ | -------- | --------- |
| Node/TS renderer   | ≥ 80 % | ≥ 80 %   | ≥ 80 %    |
| Rust host crate    | ≥ 80 % | ≥ 80 %   | ≥ 80 %    |
| Rust engine crates | ≥ 90 % | ≥ 90 %   | ≥ 90 %    |

- Generated code and build artefacts are excluded; justify any additional exclusion with a comment and an issue reference.
- Flaky tests are quarantined behind a tag with an issue; fixing flakiness has priority over adding tests ([TESTING-STRATEGY.md](./TESTING-STRATEGY.md)).

### Sonar

- New code is measured against `main` (`sonar.new_code.referenceBranch=main`); CI waits for the Sonar Quality Gate and a failing gate blocks merges.
- Sonar runs Clippy as part of Rust analysis; keep the CI Rust toolchain consistent and include the `clippy` component.

---

## 17. Commit hygiene and CI

Run these locally before every commit; CI enforces the same gates.

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
- **No inline rule suppressions** without a narrow scope, a reason, and a removal condition referencing an issue; refactor to satisfy linters and static analysis rather than suppress.
- **Conventional Commits** are required: `feat|fix|chore|ci|docs|test|refactor|perf|style`.
- Pre-commit hooks run on changed files; use `--no-verify` only with justification and a follow-up issue.
- CI uses pnpm 10 and Cargo with `rustfmt`/`clippy` installed; fail-fast ordering runs lint/type before unit tests, with heavier jobs (coverage, integration) after the quick gates pass. JS/TS and Rust jobs run in parallel; pnpm/Cargo artefacts are cached.

---

## 18. Versioning and governance

- **Ownership:** standards are owned by maintainers; propose changes via a PR tagged `docs(standards)`.
- **Exceptions:** document and time-limit any deviation with issue links and a plan to converge.
- **Schema:** forward-only; provide migration scripts and bump `schemaVersion` ([ADR-0017](../06-adrs/ADR-0017-contract-and-dto-versioning.md)). Snapshots are immutable; scenarios branch and merge; no history rewrites ([ADR-0001](../06-adrs/ADR-0001-workspace-is-canonical-authority.md)).
- **Tooling and performance at scale:** enable dependency/build caches in CI; use TypeScript project references/path aliases for workspace packages; prefer streaming-friendly payloads (Arrow/bytes) over large JSON when adding Rust APIs; quarantine slow tests with an issue rather than disabling gates.

---

## References & standards

_Normative:_

- **RFC 9457** — Problem Details for HTTP APIs (obsoletes RFC 7807). _(IPC error envelope — [ADR-0016](../06-adrs/ADR-0016-error-envelope-rfc9457.md))_
- **Semantic Versioning 2.0.0**. _(contract/DTO/crate versioning — [ADR-0017](../06-adrs/ADR-0017-contract-and-dto-versioning.md))_
- **OWASP ASVS 5.0**. _(secure-coding verification controls — [ADR-0023](../06-adrs/ADR-0023-threat-model-stride-asvs.md))_
- **JSON Schema 2020-12**. _(payload validation at the boundary)_

_Informative:_

- **OWASP Top 10**. _(common-risk checklist for secure coding)_
- **NIST SSDF (SP 800-218)**. _(secure-development practices)_

Recorded in the [standards register](./STANDARDS-REGISTER.md).

## Related documents

| Document                                                             | What it covers                                                                 |
| -------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| [Architecture Boundary](../01-architecture/ARCHITECTURE-BOUNDARY.md) | The canonical layers, adapters, and time-first boundaries.                     |
| [Design Governance](./DESIGN-GOVERNANCE.md)                          | How decisions are classified, the reversibility rubric, deprecation lifecycle. |
| [Testing Strategy](./TESTING-STRATEGY.md)                            | The test layers, coverage, and contract/security testing this code is held to. |
| [Security standard](./security/README.md)                            | The trust boundary, controls, secrets, PII, and supply-chain rules.            |
| [Contracts and Schemas](../04-contracts/CONTRACTS-AND-SCHEMAS.md)    | The typed shapes the boundary exposes and versions.                            |
| [Getting Started](./GETTING-STARTED.md)                              | Local setup and the commands the gates above run.                              |
| [CONTRIBUTING.md](../../CONTRIBUTING.md)                             | Contributor practices and workflow.                                            |
