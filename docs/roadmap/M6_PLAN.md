# M6 Plan — Extensible, Documented Platform

This plan expands `docs/ROADMAP.md` M6 into concrete, trackable work. It is written as an
**end-state** plan: each item describes what must be true for M6 to be considered delivered, not
what is currently implemented.

Status notation:

- `[x]` implemented and verified in this repo
- `[ ]` not yet met

## Design references (primary)

- Boundary rules and extension constraints: `ARCHITECTURE-BOUNDARY.md`
- Suite design overview: `docs/DESIGN.md`
- Contracts (IPC/events/envelopes): `docs/CONTRACTS-AND-SCHEMAS.md`, `docs/contracts/ipc-manifest.json`, `docs/contracts/event-manifest.json`
- Host design (capabilities, lifecycle, job orchestration, modules): `crates/desktop/DESIGN.md`
- Desktop shell UX contract: `app/AideonDesktop/DESIGN.md`
- Cross-cutting UX contract: `docs/UX-DESIGN.md`
- Module UX docs: `app/AideonDesktop/docs/praxis-workspace/DESIGN.md`, `app/AideonDesktop/docs/mneme-workspace/DESIGN.md`, `app/AideonDesktop/docs/metis-workspace/DESIGN.md`, `app/AideonDesktop/docs/chrona-time/DESIGN.md`, `app/AideonDesktop/docs/continuum-automation/DESIGN.md`
- Module engine designs: `crates/praxis/DESIGN.md`, `crates/mneme_core/DESIGN.md`, `crates/mneme_store/DESIGN.md`, `crates/metis/DESIGN.md`, `crates/chrona/DESIGN.md`, `crates/continuum/DESIGN.md`
- Coding standards and CI gates: `docs/CODING-STANDARDS.md`
- Testing strategy and coverage expectations: `docs/TESTING-STRATEGY.md`

## M6.1 Outcome — Extension seams are proven by at least one non‑core module with real UI + IPC surface

Roadmap status: `[ ]` (from `docs/ROADMAP.md`).

Actions (8–10):

1. [ ] Define the extension/module packaging model (what constitutes a module, versioning, and
       registration) without introducing renderer forks. Refs: `ARCHITECTURE-BOUNDARY.md`,
       `docs/DESIGN.md`, `crates/desktop/DESIGN.md`.
2. [ ] Define the extension manifest schema (module id, host/contract version constraints, IPC
       namespaces used, required capabilities, optional migrations). Refs:
       `ARCHITECTURE-BOUNDARY.md`, `docs/CONTRACTS-AND-SCHEMAS.md`.
3. [ ] Implement host-side module discovery and registration (local-only for desktop mode), and
       ensure it is deterministic and safe. Refs: `crates/desktop/DESIGN.md`,
       `ARCHITECTURE-BOUNDARY.md`.
4. [ ] Provide a renderer-side workspace registry mechanism that loads module definitions from
       host-provided metadata (no hardcoded module list). Refs: `app/AideonDesktop/DESIGN.md`,
       `ARCHITECTURE-BOUNDARY.md`.
5. [ ] Add at least one non-core module that proves the seam end-to-end (UI surface + a small set
       of IPC commands/events), with strict adherence to contracts. Refs:
       `docs/CONTRACTS-AND-SCHEMAS.md`, `docs/UX-DESIGN.md`.
6. [ ] Ensure module IPC surfaces are namespaced and snake_case, and update the IPC manifest and
       contract tests accordingly. Refs: `docs/contracts/ipc-manifest.json`,
       `docs/CONTRACTS-AND-SCHEMAS.md`, `docs/TESTING-STRATEGY.md`.
7. [ ] Ensure module UI renders inside the desktop shell slots only (no custom chrome). Refs:
       `app/AideonDesktop/DESIGN.md`, `docs/UX-DESIGN.md`, `ARCHITECTURE-BOUNDARY.md`.
8. [ ] Ensure modules cannot bypass capability gating; host enforces required capabilities per
       command. Refs: `crates/desktop/DESIGN.md`, `ARCHITECTURE-BOUNDARY.md`.
9. [ ] Add tests that validate module loading and the extension seam (happy path + denied by
       capability). Refs: `docs/TESTING-STRATEGY.md`, `docs/CODING-STANDARDS.md`.
10. [ ] Document the extension seam clearly (what is stable vs internal) and keep it evergreen. Refs:
        `ARCHITECTURE-BOUNDARY.md`, `docs/DESIGN.md`, `crates/desktop/DESIGN.md`.

## M6.2 Outcome — Module UX docs exist for core workspaces and cross-cutting time/automation patterns

Roadmap status: `[x]` (from `docs/ROADMAP.md`).

Actions (8–10):

1. [x] Maintain module UX docs under `app/AideonDesktop/docs/*` for core workspaces. Refs:
       `docs/UX-DESIGN.md`, `app/AideonDesktop/DESIGN.md`.
2. [x] Ensure Mneme workspace UX design is explicit and end-state oriented. Refs:
       `app/AideonDesktop/docs/mneme-workspace/DESIGN.md`.
3. [x] Ensure Metis workspace UX design is explicit and end-state oriented. Refs:
       `app/AideonDesktop/docs/metis-workspace/DESIGN.md`.
4. [x] Ensure Chrona time UX design is explicit and end-state oriented. Refs:
       `app/AideonDesktop/docs/chrona-time/DESIGN.md`.
5. [x] Ensure Continuum automation UX design is explicit and end-state oriented. Refs:
       `app/AideonDesktop/docs/continuum-automation/DESIGN.md`.
6. [ ] Ensure every module UX doc contains explicit loading/empty/error states and job-driven
       interaction patterns. Refs: `docs/UX-DESIGN.md`, `docs/TESTING-STRATEGY.md`.
7. [ ] Ensure each module UX doc includes security posture notes relevant to its actions (capability
       gating, redaction). Refs: `ARCHITECTURE-BOUNDARY.md`, `docs/UX-DESIGN.md`.
8. [ ] Ensure module UX docs cross-reference the relevant engine/host design docs so “UX intent”
       maps to contract surfaces. Refs: `docs/DESIGN.md`, `crates/desktop/DESIGN.md`.
9. [ ] Add a small “UX doc index” section in suite docs that stays current as modules grow. Refs:
       `docs/UX-DESIGN.md`, `docs/DESIGN.md`.
10. [ ] Keep module UX docs evergreen: describe the target end state and update as outcomes change
        (avoid stale “current implementation”). Refs: `docs/DESIGN.md`, `docs/ROADMAP.md`.

## M6.3 Outcome — Contracts and boundaries are documented and kept consistent (IPC + events + error envelopes)

Roadmap status: `[x]` (from `docs/ROADMAP.md`).

Actions (8–10):

1. [x] Keep IPC naming snake_case-only (no dots) and document it as a hard rule. Refs:
       `docs/CONTRACTS-AND-SCHEMAS.md`, `crates/desktop/DESIGN.md`, `ARCHITECTURE-BOUNDARY.md`.
2. [x] Maintain a canonical request/response error envelope contract. Refs:
       `docs/CONTRACTS-AND-SCHEMAS.md`, `crates/desktop/DESIGN.md`.
3. [x] Maintain the IPC manifest snapshot and ensure it matches the host command surface. Refs:
       `docs/contracts/ipc-manifest.json`, `docs/TESTING-STRATEGY.md`.
4. [x] Maintain the event manifest snapshot and keep event naming snake_case. Refs:
       `docs/contracts/event-manifest.json`, `docs/CONTRACTS-AND-SCHEMAS.md`.
5. [ ] Expand the event manifest beyond minimal entries to cover all host→renderer events used in
       production UX (jobs, model changes, workspace lifecycle). Refs:
       `docs/CONTRACTS-AND-SCHEMAS.md`, `docs/contracts/event-manifest.json`.
6. [ ] Add contract tests for the event manifest (similar to the IPC manifest contract test). Refs:
       `docs/TESTING-STRATEGY.md`, `docs/CONTRACTS-AND-SCHEMAS.md`.
7. [ ] Ensure error codes are stable and snake_case across all modules and document a taxonomy. Refs:
       `crates/desktop/DESIGN.md`, `docs/CONTRACTS-AND-SCHEMAS.md`.
8. [ ] Ensure schema versioning policies are explicit and followed for DTO evolution. Refs:
       `docs/CONTRACTS-AND-SCHEMAS.md`, `docs/DESIGN.md`.
9. [ ] Ensure contract drift is visible in CI (manifests generated/checked) and does not regress. Refs:
       `docs/CODING-STANDARDS.md`, `docs/TESTING-STRATEGY.md`.
10. [ ] Document the contract change workflow as a required PR checklist and keep it evergreen. Refs:
        `docs/CONTRACTS-AND-SCHEMAS.md`, `docs/CODING-STANDARDS.md`.

## M6.4 Outcome — Contract tests and coverage thresholds remain enforced as the command/event surface grows

Roadmap status: `[ ]` (from `docs/ROADMAP.md`).

Actions (8–10):

1. [ ] Ensure every IPC command in the manifest has at least one meaningful test that exercises its
       wrapper and asserts response envelope shape. Refs: `docs/TESTING-STRATEGY.md`,
       `docs/contracts/ipc-manifest.json`.
2. [ ] Add event manifest contract tests and ensure every production event is covered by at least
       one subscription test. Refs: `docs/TESTING-STRATEGY.md`, `docs/contracts/event-manifest.json`.
3. [ ] Enforce coverage thresholds for new code (TS >= 80%, Rust host >= 80%, engines >= 90% where
       applicable) and keep CI gates hard. Refs: `docs/TESTING-STRATEGY.md`,
       `docs/CODING-STANDARDS.md`.
4. [ ] Ensure contract tests run in CI and fail on drift (no manual updates required). Refs:
       `docs/CODING-STANDARDS.md`, `docs/TESTING-STRATEGY.md`.
5. [ ] Ensure “golden path” fixtures exist for contract-heavy flows (setup, workspace open, jobs,
       artefact run). Refs: `docs/TESTING-STRATEGY.md`, `docs/CONTRACTS-AND-SCHEMAS.md`.
6. [ ] Add a CI guard that prevents introducing new IPC/event names without updating manifests and
       tests. Refs: `docs/CONTRACTS-AND-SCHEMAS.md`, `docs/CODING-STANDARDS.md`.
7. [ ] Ensure tests remain deterministic and fast; quarantine perf tests as optional but runnable.
       Refs: `docs/TESTING-STRATEGY.md`.
8. [ ] Ensure renderer code cannot bypass adapters/IPC by importing low-level Tauri APIs in feature
       code (lint/guard). Refs: `docs/CODING-STANDARDS.md`, `ARCHITECTURE-BOUNDARY.md`.
9. [ ] Ensure contract artifacts under `docs/contracts/` remain small, human-reviewable, and updated
       only by generation scripts (target). Refs: `docs/CONTRACTS-AND-SCHEMAS.md`.
10. [ ] Update `docs/ROADMAP.md` M6 checkboxes only when coverage and contract enforcement are
        verified to be stable over time. Refs: `docs/ROADMAP.md`.

## M6.5 Outcome — Performance SLOs are continuously tracked and do not regress with extensions

Roadmap status: `[ ]` (from `docs/ROADMAP.md`).

Actions (8–10):

1. [ ] Define the SLOs that must be tracked continuously (cold start, workspace open, artefact p95,
       job p95) and how they are measured. Refs: `docs/ROADMAP.md`, `crates/desktop/DESIGN.md`.
2. [ ] Implement instrumentation hooks in host for timing and correlation ids (local and remote),
       and ensure they are safe and redacted. Refs: `crates/desktop/DESIGN.md`,
       `ARCHITECTURE-BOUNDARY.md`.
3. [ ] Add a lightweight local performance harness that can be run consistently and produces
       comparable outputs. Refs: `docs/TESTING-STRATEGY.md`, `docs/ROADMAP.md`.
4. [ ] Ensure extensions/modules cannot bypass instrumentation (all work goes through host traits
       and job systems). Refs: `ARCHITECTURE-BOUNDARY.md`, `crates/desktop/DESIGN.md`.
5. [ ] Add regression detection in CI that is non-flaky (trend-based or threshold-based). Refs:
       `docs/CODING-STANDARDS.md`, `docs/ROADMAP.md`.
6. [ ] Surface SLO indicators in Status window (summary view). Refs: `docs/UX-DESIGN.md`,
       `crates/desktop/DESIGN.md`.
7. [ ] Ensure large result rendering remains performant (virtualization) even as modules expand.
       Refs: `docs/UX-DESIGN.md`, `docs/CODING-STANDARDS.md`.
8. [ ] Define and enforce payload size budgets for IPC/events and require streaming for large
       payloads. Refs: `ARCHITECTURE-BOUNDARY.md`, `crates/desktop/DESIGN.md`.
9. [ ] Document performance expectations per module and keep them evergreen. Refs: `docs/ROADMAP.md`,
       module `crates/*/DESIGN.md`.
10. [ ] Update roadmap statuses only when continuous tracking is in place and regressions are
        detectable. Refs: `docs/ROADMAP.md`.

## M6.6 Outcome — Extension install/uninstall is safe and reversible

Roadmap status: `[ ]` (from `docs/ROADMAP.md`).

Actions (8–10):

1. [ ] Define extension install/uninstall lifecycle (download/verify/install/activate/deactivate/
       uninstall) and safe rollback steps. Refs: `ARCHITECTURE-BOUNDARY.md`,
       `crates/desktop/DESIGN.md`.
2. [ ] Ensure installation is host-owned and capability-gated; renderer never writes arbitrary
       files. Refs: `ARCHITECTURE-BOUNDARY.md`, `crates/desktop/DESIGN.md`.
3. [ ] Define integrity checks (signatures/hashes) for installed extensions. Refs:
       `crates/desktop/DESIGN.md`, `docs/DESIGN.md`.
4. [ ] Ensure uninstall is reversible and does not corrupt workspace data (data stays workspace-scoped).
       Refs: `ARCHITECTURE-BOUNDARY.md`, `crates/mneme_store/DESIGN.md`.
5. [ ] Provide Settings UX for managing extensions (list installed, enable/disable, uninstall),
       with explicit warnings and audits. Refs: `docs/UX-DESIGN.md`, `crates/desktop/DESIGN.md`.
6. [ ] Ensure extensions can declare migrations and those are applied safely (forward-only, with
       backup/restore options). Refs: `crates/mneme_store/DESIGN.md`, `docs/storage/SQLITE.md`.
7. [ ] Add tests that validate installing/uninstalling does not weaken security or break contracts.
       Refs: `docs/TESTING-STRATEGY.md`, `ARCHITECTURE-BOUNDARY.md`.
8. [ ] Ensure extensions cannot execute arbitrary code beyond declared seams (capability and
       namespace restrictions). Refs: `ARCHITECTURE-BOUNDARY.md`, `crates/desktop/DESIGN.md`.
9. [ ] Document extension lifecycle and recovery (failed install) in Status window UX. Refs:
       `docs/UX-DESIGN.md`, `crates/desktop/DESIGN.md`.
10. [ ] Update roadmap statuses only when install/uninstall is proven safe and reversible end-to-end.
        Refs: `docs/ROADMAP.md`.

## M6.7 Outcome — Extension capabilities are explicitly declared and audited

Roadmap status: `[ ]` (from `docs/ROADMAP.md`).

Actions (8–10):

1. [ ] Define extension capability declaration schema (per command namespace, per OS integration),
       and require it for module registration. Refs: `ARCHITECTURE-BOUNDARY.md`,
       `crates/desktop/DESIGN.md`.
2. [ ] Ensure capabilities are deny-by-default and require explicit user/admin approval. Refs:
       `ARCHITECTURE-BOUNDARY.md`, `crates/desktop/DESIGN.md`.
3. [ ] Ensure capability changes are audited with timestamps, actor, and reason. Refs:
       `crates/desktop/DESIGN.md`.
4. [ ] Provide Settings UX to review granted capabilities per extension, and revoke them. Refs:
       `docs/UX-DESIGN.md`, `crates/desktop/DESIGN.md`.
5. [ ] Ensure extension IPC calls are checked against declared capabilities at runtime (host
       enforcement). Refs: `crates/desktop/DESIGN.md`, `ARCHITECTURE-BOUNDARY.md`.
6. [ ] Ensure capability denials produce stable error codes and actionable UI guidance. Refs:
       `docs/CONTRACTS-AND-SCHEMAS.md`, `docs/UX-DESIGN.md`.
7. [ ] Add tests that assert an extension cannot call commands outside its namespace or without
       capability. Refs: `docs/TESTING-STRATEGY.md`, `ARCHITECTURE-BOUNDARY.md`.
8. [ ] Document the capability posture and expected declarations in contracts docs. Refs:
       `docs/CONTRACTS-AND-SCHEMAS.md`, `crates/desktop/DESIGN.md`.
9. [ ] Ensure audits are visible in Status window diagnostics (bounded view). Refs:
       `docs/UX-DESIGN.md`, `crates/desktop/DESIGN.md`.
10. [ ] Mark this outcome complete only when declarations and audits are enforced end-to-end and
        verified by tests. Refs: `docs/ROADMAP.md`, `docs/TESTING-STRATEGY.md`.

## M6.8 Outcome — DoD: extensions behave like first‑class workspaces with no boundary exceptions

Roadmap status: `[ ]` (from `docs/ROADMAP.md`).

Actions (8–10):

1. [ ] Enumerate the extension “first-class workspace” requirements:
   - renders in shell slots,
   - participates in job tray,
   - uses typed IPC and events,
   - respects capability gating,
   - provides loading/empty/error states,
   - supports Status/recovery flows.
     Refs: `docs/UX-DESIGN.md`, `app/AideonDesktop/DESIGN.md`, `ARCHITECTURE-BOUNDARY.md`.
2. [ ] Add parity tests for extension vs core workspace flows (navigation, commands, events) with
       no special-case bypasses. Refs: `docs/TESTING-STRATEGY.md`.
3. [ ] Ensure extensions cannot add renderer chrome or custom layout primitives. Refs:
       `ARCHITECTURE-BOUNDARY.md`, `docs/UX-DESIGN.md`.
4. [ ] Ensure extension commands/events are included in manifests and contract tests. Refs:
       `docs/CONTRACTS-AND-SCHEMAS.md`, `docs/TESTING-STRATEGY.md`.
5. [ ] Ensure extensions do not open ports or start servers in desktop mode, and add regression
       tests. Refs: `ARCHITECTURE-BOUNDARY.md`, `docs/CODING-STANDARDS.md`.
6. [ ] Ensure extension data access remains workspace-scoped and cannot cross-read without explicit
       user intent. Refs: `ARCHITECTURE-BOUNDARY.md`, `crates/mneme_store/DESIGN.md`.
7. [ ] Ensure extension UX docs exist (for the proving module) and match the same level of detail
       as core module UX docs. Refs: `docs/UX-DESIGN.md`, `app/AideonDesktop/docs/*/DESIGN.md`.
8. [ ] Update `docs/ROADMAP.md` M6 checkboxes only when the extension seam is proven and contracts
       remain stable with no boundary exceptions. Refs: `docs/ROADMAP.md`.
9. [ ] Record milestone completion in `CHANGELOG.md` and keep the roadmap evergreen (retire stale
       items). Refs: `CHANGELOG.md`, `docs/ROADMAP.md`.
10. [ ] Mark M6 complete only when every M6 outcome and the DoD line are `[x]` and CI gates remain
        enforced (coverage/contract/perf). Refs: `docs/CODING-STANDARDS.md`,
        `docs/TESTING-STRATEGY.md`.
