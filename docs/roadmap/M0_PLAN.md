# M0 Plan — Launchable, Secure Desktop

This plan expands `docs/ROADMAP.md` M0 into concrete, trackable work. It is written as an
**end-state** plan: each item describes what must be true for M0 to be considered delivered, not
what is currently implemented.

Status notation:

- `[x]` implemented and verified in this repo
- `[~]` in progress (partially implemented / partially verified)
- `[ ]` not yet met

## Design references (primary)

- Boundary rules: `ARCHITECTURE-BOUNDARY.md`
- Suite design overview: `docs/DESIGN.md`
- Contracts (IPC/events/envelopes): `docs/CONTRACTS-AND-SCHEMAS.md`
- Host design (capabilities, lifecycle, windowing, jobs): `crates/desktop/DESIGN.md`
- Desktop shell UX contract: `app/AideonDesktop/DESIGN.md`
- Cross-cutting UX contract: `docs/UX-DESIGN.md`
- Storage design: `crates/mneme_core/DESIGN.md`, `crates/mneme_store/DESIGN.md`, `docs/storage/SQLITE.md`

## M0.1 Outcome — Desktop app launches offline and completes first-run setup without network access

Roadmap status: `[~]` (from `docs/ROADMAP.md`).

Actions (8–10):

1. [x] Ensure first-run setup is a host-owned flow with explicit lifecycle phases (backend setup,
       frontend ready ack), not renderer-side hidden defaults. Refs: `crates/desktop/DESIGN.md`,
       `docs/CONTRACTS-AND-SCHEMAS.md`, `ARCHITECTURE-BOUNDARY.md`.
2. [~] Define and document the **first-run state machine** (states, transitions, failure modes,
       retry points) and keep the UI aligned to those states. Refs: `crates/desktop/DESIGN.md`,
       `app/AideonDesktop/DESIGN.md`, `docs/UX-DESIGN.md`.
3. [ ] Make “offline-first” testable: add an automated “no network available” boot smoke test
       (E2E or host integration) that asserts setup completes without external calls. Refs:
       `ARCHITECTURE-BOUNDARY.md`, `docs/TESTING-STRATEGY.md`.
4. [ ] Ensure all first-run required assets are packaged locally (no CDN/runtime downloads); verify
       `next export` output is sufficient for Tauri boot. Refs: `app/AideonDesktop/DESIGN.md`,
       `ARCHITECTURE-BOUNDARY.md`.
5. [ ] Define “first-run required storage” explicitly (paths, minimum schema, seeded data) and
       guarantee host creates it using platform-conventional directories. Refs:
       `crates/desktop/DESIGN.md`, `crates/mneme_store/DESIGN.md`, `docs/storage/SQLITE.md`.
6. [x] Add a dedicated “Setup/Status” UX path for setup failures that avoids crash loops and
       supports retry/copy diagnostics. Refs: `docs/UX-DESIGN.md`, `app/AideonDesktop/DESIGN.md`,
       `crates/desktop/DESIGN.md`.
7. [x] Make setup progress visible (at minimum: “starting”, “migrating”, “ready”), sourced from host
       events rather than polling. Refs: `docs/CONTRACTS-AND-SCHEMAS.md`, `docs/UX-DESIGN.md`,
       `crates/desktop/DESIGN.md`.
8. [ ] Ensure first-run seeding is deterministic and idempotent (safe to re-run); record what was
       seeded and at what schema version. Refs: `crates/mneme_store/DESIGN.md`, `crates/desktop/DESIGN.md`.
9. [ ] Provide a “factory reset” / “safe wipe” action gated by explicit confirmation and
       capabilities (for development and recovery). Refs: `crates/desktop/DESIGN.md`,
       `ARCHITECTURE-BOUNDARY.md`, `docs/UX-DESIGN.md`.
10. [x] Establish a “setup contract” snapshot (commands/events involved in setup) and cover it with
        contract tests. Refs: `docs/CONTRACTS-AND-SCHEMAS.md`, `docs/TESTING-STRATEGY.md`.

## M0.2 Outcome — Security boundaries are enforced by default (no renderer HTTP, no open TCP ports)

Roadmap status: `[~]` (from `docs/ROADMAP.md`).

Actions (8–10):

1. [x] Keep the renderer untrusted: all privileged actions flow through host IPC (commands/events)
       and capability checks. Refs: `ARCHITECTURE-BOUNDARY.md`, `crates/desktop/DESIGN.md`.
2. [x] Add a hard test that fails if renderer code introduces direct HTTP usage (e.g. `fetch`,
       `axios`) outside explicitly allowed host-owned adapters (if any). Refs:
       `ARCHITECTURE-BOUNDARY.md`, `docs/CODING-STANDARDS.md`, `docs/TESTING-STRATEGY.md`.
3. [x] Add a hard test/guard that fails if desktop mode opens TCP listeners (scan /proc, or
       platform-specific heuristics in E2E). Refs: `ARCHITECTURE-BOUNDARY.md`,
       `docs/TESTING-STRATEGY.md`.
4. [~] Document and enforce capability deny-by-default posture for any OS integration (fs, dialog,
       clipboard, export/print, etc.) and ensure every new IPC command is associated with a capability.
       Refs: `crates/desktop/DESIGN.md`, `ARCHITECTURE-BOUNDARY.md`.
5. [x] Ensure CSP and WebView hardening remain strict (no Node integration, no remote resource
       loads, content isolation), and document the invariants in the host design. Refs:
       `crates/desktop/DESIGN.md`, `ARCHITECTURE-BOUNDARY.md`.
6. [~] Establish a “PII and export deny-by-default” baseline even for M0 (exports may be limited
       functionality, but posture must be correct). Refs: `ARCHITECTURE-BOUNDARY.md`, `docs/UX-DESIGN.md`,
       `crates/desktop/DESIGN.md`.
7. [ ] Confirm logs/diagnostics do not leak sensitive data by default; require redaction on any
       user-facing “copy diagnostics” flows. Refs: `crates/desktop/DESIGN.md`, `docs/UX-DESIGN.md`.
8. [ ] Ensure “remote mode” remains off by default; any network features must be host-owned and
       explicitly configured. Refs: `ARCHITECTURE-BOUNDARY.md`, `docs/DESIGN.md`,
       `crates/desktop/DESIGN.md`.
9. [x] Provide security regression checklist automation in CI (no renderer HTTP, no TCP listeners,
       no new privileged plugins without capability mapping). Refs: `docs/CODING-STANDARDS.md`,
       `docs/TESTING-STRATEGY.md`, `ARCHITECTURE-BOUNDARY.md`.
10. [x] Add a short “security invariants” section to module UX docs for any workspace that triggers
        OS actions (at M0, at least shell + Praxis). Refs: `docs/UX-DESIGN.md`,
        `app/AideonDesktop/docs/praxis-workspace/DESIGN.md`, `crates/desktop/DESIGN.md`.

## M0.3 Outcome — IPC command surface is stable snake_case with a canonical request/response error envelope

Roadmap status: `[x]` (from `docs/ROADMAP.md`).

Actions (8–10):

1. [x] Require snake_case command identifiers (no dots) for all invoke surfaces. Refs:
       `docs/CONTRACTS-AND-SCHEMAS.md`, `crates/desktop/DESIGN.md`, `ARCHITECTURE-BOUNDARY.md`.
2. [x] Standardize request/response envelope shape (request id, status, result/error). Refs:
       `docs/CONTRACTS-AND-SCHEMAS.md`, `crates/desktop/DESIGN.md`.
3. [x] Standardize `HostError` shape (`code`, `message`, optional `details`) and ensure it is stable
       across commands. Refs: `crates/desktop/DESIGN.md`, `docs/CONTRACTS-AND-SCHEMAS.md`.
4. [x] Snapshot command list in `docs/contracts/ipc-manifest.json` and keep it enforceable in CI.
       Refs: `docs/CONTRACTS-AND-SCHEMAS.md`, `docs/TESTING-STRATEGY.md`.
5. [x] Ensure renderer-side invocations target only commands in the manifest (contract test guard).
       Refs: `docs/CONTRACTS-AND-SCHEMAS.md`, `docs/TESTING-STRATEGY.md`.
6. [x] Add the same level of contract discipline for host→renderer events (manifest + contract
       tests), starting with M0-required events. Refs: `docs/CONTRACTS-AND-SCHEMAS.md`.
7. [x] Document versioning policy for commands/events (additive changes, deprecation windows,
       schemaVersion bumps). Refs: `docs/CONTRACTS-AND-SCHEMAS.md`, `crates/desktop/DESIGN.md`.
8. [x] Establish “contract change workflow” as a checklist that must be followed in PRs. Refs:
       `docs/CONTRACTS-AND-SCHEMAS.md`, `docs/CODING-STANDARDS.md`.
9. [ ] Ensure every IPC command has at least one meaningful test path (success + one failure) to
       validate envelopes and error codes. Refs: `docs/TESTING-STRATEGY.md`,
       `docs/CONTRACTS-AND-SCHEMAS.md`.
10. [ ] Ensure all naming across IPC, events, capabilities, and job identifiers remains consistent
        (snake_case only). Refs: `ARCHITECTURE-BOUNDARY.md`, `crates/desktop/DESIGN.md`,
        `docs/CONTRACTS-AND-SCHEMAS.md`.

## M0.4 Outcome — Local storage and migrations exist for desktop mode (SQLite + forward-only migrations)

Roadmap status: `[x]` (from `docs/ROADMAP.md`).

Actions (8–10):

1. [x] Use Mneme Store as the only persistence layer (no raw DB access elsewhere). Refs:
       `ARCHITECTURE-BOUNDARY.md`, `crates/mneme_store/DESIGN.md`.
2. [x] Ensure schema is forward-only and versioned; migrations are applied by the host/store on
       startup. Refs: `crates/mneme_store/DESIGN.md`, `docs/storage/SQLITE.md`, `docs/DESIGN.md`.
3. [x] Ensure database location follows platform conventions (app data directories), not repo-relative
       paths. Refs: `crates/desktop/DESIGN.md`, `ARCHITECTURE-BOUNDARY.md`.
4. [ ] Add an explicit “migration report” surfaced in the Status window (what ran, versions, any
       warnings) to support recovery. Refs: `docs/UX-DESIGN.md`, `crates/desktop/DESIGN.md`.
5. [ ] Add test coverage for “fresh DB boot” and “migrate from previous schemaVersion” paths with
       deterministic fixtures. Refs: `docs/TESTING-STRATEGY.md`, `crates/mneme_store/DESIGN.md`.
6. [ ] Provide a backup/restore mechanism at the workspace boundary (not raw DB copy unless
       explicitly safe), and document it. Refs: `crates/desktop/DESIGN.md`, `docs/UX-DESIGN.md`.
7. [ ] Define retention/compaction defaults for M0 (may be conservative), and document “safe
       maintenance” tasks. Refs: `crates/mneme_store/DESIGN.md`, `docs/storage/SQLITE.md`.
8. [ ] Ensure migrations are resilient to partial failure and provide safe rollback/retry semantics
       (or explicit “requires restore” guidance). Refs: `crates/mneme_store/DESIGN.md`,
       `docs/UX-DESIGN.md`.
9. [ ] Add “storage health” checks surfaced via host diagnostics (disk full, DB locked, corruption
       hints). Refs: `crates/desktop/DESIGN.md`, `docs/UX-DESIGN.md`.
10. [ ] Document how “workspace identity” maps to storage partitions and how multiple workspaces are
        isolated in storage. Refs: `crates/desktop/DESIGN.md`, `crates/mneme_core/DESIGN.md`.

## M0.5 Outcome — Core windows open reliably via menu/commands (splash, main, settings, status, about)

Roadmap status: `[x]` (from `docs/ROADMAP.md`).

Actions (8–10):

1. [x] Define the canonical window set and their responsibilities (including Status as the recovery
       and diagnostics surface). Refs: `crates/desktop/DESIGN.md`, `app/AideonDesktop/DESIGN.md`.
2. [x] Ensure window open operations are host-owned and capability-gated where needed. Refs:
       `crates/desktop/DESIGN.md`, `ARCHITECTURE-BOUNDARY.md`.
3. [x] Ensure menus/accelerators dispatch into the renderer via a snake_case event (`shell_command`)
       with snake_case command ids. Refs: `docs/CONTRACTS-AND-SCHEMAS.md`, `crates/desktop/DESIGN.md`.
4. [x] Document the “shell command” catalog (ids, payloads, expected behaviour) and treat it as a
       contract with tests and a manifest. Refs: `docs/CONTRACTS-AND-SCHEMAS.md`, `docs/UX-DESIGN.md`.
5. [x] Ensure window routes are stable and reflect the packaged Next export. Refs:
       `app/AideonDesktop/DESIGN.md`, `crates/desktop/DESIGN.md`.
6. [ ] Add E2E coverage for window open/close flows and “no crash loop” behaviour on errors. Refs:
       `docs/TESTING-STRATEGY.md`, `docs/UX-DESIGN.md`.
7. [x] Ensure splash is closed only when both backend + frontend readiness conditions are met; the
       policy should be explicit and testable. Refs: `crates/desktop/DESIGN.md`,
       `docs/CONTRACTS-AND-SCHEMAS.md`, `app/AideonDesktop/DESIGN.md`.
8. [x] Ensure About and Status windows are available even when main workspace fails to open (recovery
       guarantee). Refs: `docs/UX-DESIGN.md`, `crates/desktop/DESIGN.md`.
9. [x] Ensure multi-window behaviour is deterministic across platforms (macOS vs Windows/Linux)
       and documented. Refs: `crates/desktop/DESIGN.md`.
10. [x] Ensure “Debug style guide” window is dev-only and never expands the production capability
        surface. Refs: `ARCHITECTURE-BOUNDARY.md`, `app/AideonDesktop/DESIGN.md`.

## M0.6 Outcome — Workspace seed/navigation works without renderer-side storage (projects/scenarios list; templates list/save)

Roadmap status: `[x]` (from `docs/ROADMAP.md`).

Actions (8–10):

1. [x] Ensure workspace seed data is host-owned (projects/scenarios/templates are not stored in the
       renderer). Refs: `ARCHITECTURE-BOUNDARY.md`, `crates/desktop/DESIGN.md`.
2. [x] Ensure the host provides the minimal navigation contract required for the shell and Praxis
       workspace. Refs: `docs/CONTRACTS-AND-SCHEMAS.md`, `docs/UX-DESIGN.md`,
       `app/AideonDesktop/docs/praxis-workspace/DESIGN.md`.
3. [x] Ensure templates list/save works via host IPC and is stable across restarts. Refs:
       `docs/CONTRACTS-AND-SCHEMAS.md`, `crates/desktop/DESIGN.md`.
4. [ ] Define a persistent “workspace identity” model (ids, display names, last opened, pinned)
       and make navigation deterministic. Refs: `crates/desktop/DESIGN.md`, `docs/UX-DESIGN.md`.
5. [ ] Define the scenario lifecycle UX even for M0: list, select, create, delete (or explicit
       “read-only” posture), and ensure it’s host-driven. Refs: `docs/UX-DESIGN.md`,
       `crates/desktop/DESIGN.md`, `crates/chrona/DESIGN.md`.
6. [ ] Add loading/error/empty states for seed/navigation flows (especially “no projects yet” and
       “corrupt seed data”), with tests. Refs: `docs/UX-DESIGN.md`,
       `app/AideonDesktop/docs/praxis-workspace/DESIGN.md`, `docs/TESTING-STRATEGY.md`.
7. [ ] Ensure template seeding is idempotent and versioned (upgrade path for default templates).
       Refs: `crates/desktop/DESIGN.md`, `crates/mneme_store/DESIGN.md`.
8. [ ] Ensure navigation supports recovery mode when seed data is unavailable (offer restore or
       create new workspace). Refs: `docs/UX-DESIGN.md`, `crates/desktop/DESIGN.md`.
9. [ ] Ensure all navigation contracts are snake_case and present in the IPC manifest. Refs:
       `docs/contracts/ipc-manifest.json`, `docs/CONTRACTS-AND-SCHEMAS.md`.
10. [ ] Define and document the future “module workspace switcher” behaviour (Praxis ↔ Mneme ↔
        Metis ↔ Chrona ↔ Continuum) while keeping M0 focused on Praxis-first. Refs:
        `app/AideonDesktop/DESIGN.md`, `docs/UX-DESIGN.md`, `docs/DESIGN.md`.

## M0.7 Outcome — Workspace lifecycle is fully usable and safe (create/open/close/backup/restore + recovery UX)

Roadmap status: `[ ]` (from `docs/ROADMAP.md`).

Actions (8–10):

1. [ ] Define the workspace lifecycle contract in the host (commands + events): create, open,
       close, list, rename, archive/delete, and describe the invariants. Refs:
       `crates/desktop/DESIGN.md`, `docs/CONTRACTS-AND-SCHEMAS.md`.
2. [ ] Define storage isolation per workspace (separate partitions/DBs or equivalent) and ensure
       “delete workspace” cannot impact others. Refs: `crates/mneme_store/DESIGN.md`,
       `crates/desktop/DESIGN.md`.
3. [ ] Implement “backup” as a user-visible workflow with bounded, explainable behaviour (what is
       included, redaction posture, where saved). Refs: `docs/UX-DESIGN.md`, `crates/desktop/DESIGN.md`,
       `ARCHITECTURE-BOUNDARY.md`.
4. [ ] Implement “restore/import” with schemaVersion checks, migration strategy, and clear failure
       messaging. Refs: `crates/mneme_store/DESIGN.md`, `docs/storage/SQLITE.md`, `docs/UX-DESIGN.md`.
5. [ ] Add a “read-only recovery open” mode for corrupted workspaces (when possible), and expose
       explicit user actions to export diagnostics/attempt repair. Refs: `docs/UX-DESIGN.md`,
       `crates/desktop/DESIGN.md`.
6. [ ] Ensure workspace open/close transitions are observable via host→renderer events (no hidden
       state), with a stable UI summary. Refs: `docs/CONTRACTS-AND-SCHEMAS.md`, `docs/UX-DESIGN.md`.
7. [ ] Implement safe concurrency rules (prevent double-open, handle multi-window attempts) and
       make them testable. Refs: `crates/desktop/DESIGN.md`.
8. [ ] Provide a “workspace lock” / “in use” story (especially for future remote parity), but
       implement a safe desktop baseline (single-process assumptions made explicit). Refs:
       `crates/desktop/DESIGN.md`, `docs/DESIGN.md`.
9. [ ] Add E2E coverage for create/open/close/backup/restore plus at least one failure mode (restore
       incompatible, DB corrupt). Refs: `docs/TESTING-STRATEGY.md`, `docs/UX-DESIGN.md`.
10. [ ] Update module UX docs to include lifecycle UX flows (navigation + Status + recovery) with
        explicit empty/loading/error states. Refs: `app/AideonDesktop/DESIGN.md`,
        `app/AideonDesktop/docs/praxis-workspace/DESIGN.md`, `docs/UX-DESIGN.md`.

## M0.8 Outcome — DoD: cold start meets SLO and core flows are covered by tests with no security exceptions required

Roadmap status: `[ ]` (from `docs/ROADMAP.md`).

Actions (8–10):

1. [ ] Define the “cold start” benchmark method (what is measured, on what hardware class, with
       what dataset) and make it repeatable. Refs: `docs/ROADMAP.md`, `crates/desktop/DESIGN.md`.
2. [ ] Ensure cold start SLO is measured end-to-end (process start → main window interactive), not
       only “backend ready”. Refs: `docs/ROADMAP.md`, `docs/UX-DESIGN.md`, `crates/desktop/DESIGN.md`.
3. [ ] Add CI-friendly performance guardrails (smoke thresholds or trend checks) without making
       builds flaky. Refs: `docs/CODING-STANDARDS.md`, `docs/ROADMAP.md`.
4. [ ] Ensure “core flows” are explicitly enumerated and tested:
   - app boot + setup completion,
   - open Praxis workspace,
   - list templates/projects,
   - run one artefact,
   - apply one task operation,
   - open Status and view diagnostics.
     Refs: `docs/TESTING-STRATEGY.md`, `docs/UX-DESIGN.md`, `docs/CONTRACTS-AND-SCHEMAS.md`.
5. [x] Add contract coverage for M0-required events (at minimum `shell_command`, setup lifecycle
       events) similar to the IPC command manifest test. Refs: `docs/CONTRACTS-AND-SCHEMAS.md`,
       `docs/TESTING-STRATEGY.md`.
6. [ ] Ensure all tests run without “security exceptions” (no mocked CSP bypasses, no enabling
       renderer networking, no opening ports). Refs: `ARCHITECTURE-BOUNDARY.md`,
       `docs/TESTING-STRATEGY.md`.
7. [ ] Ensure startup failures are tested (migration fails, workspace open fails) and the UI
       remains navigable (Status window reachable, retry possible). Refs: `docs/UX-DESIGN.md`,
       `crates/desktop/DESIGN.md`.
8. [x] Add a “security posture regression” suite (no renderer HTTP usage, no TCP listeners, deny-by-default
       capabilities) and run it as part of CI. Refs: `ARCHITECTURE-BOUNDARY.md`,
       `docs/CODING-STANDARDS.md`, `docs/TESTING-STRATEGY.md`.
9. [ ] Ensure docs are in sync with what is validated (tests reflect contract docs; roadmap items
       are checked only when verification exists). Refs: `docs/ROADMAP.md`, `docs/TESTING-STRATEGY.md`.
10. [ ] Mark M0 complete only when every M0 outcome and the DoD line are `[x]`, and record the
        milestone completion in `CHANGELOG.md`. Refs: `docs/ROADMAP.md`, `CHANGELOG.md`.
