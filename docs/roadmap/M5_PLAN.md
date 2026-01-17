# M5 Plan — Remote‑Ready Without UI Fork

This plan expands `docs/ROADMAP.md` M5 into concrete, trackable work. It is written as an
**end-state** plan: each item describes what must be true for M5 to be considered delivered, not
what is currently implemented.

Status notation:

- `[x]` implemented and verified in this repo
- `[ ]` not yet met

## Design references (primary)

- Boundary rules: `ARCHITECTURE-BOUNDARY.md`
- Suite design overview: `docs/DESIGN.md`
- Contracts (IPC/events/envelopes): `docs/CONTRACTS-AND-SCHEMAS.md`, `docs/contracts/ipc-manifest.json`, `docs/contracts/event-manifest.json`
- Host design (capabilities, lifecycle, job orchestration, events): `crates/desktop/DESIGN.md`
- Desktop shell UX contract: `app/AideonDesktop/DESIGN.md`
- Cross-cutting UX contract: `docs/UX-DESIGN.md`
- Mneme designs (export/import, durability, sync primitives): `crates/mneme_core/DESIGN.md`, `crates/mneme_store/DESIGN.md`
- Continuum design (remote orchestration and connector posture): `crates/continuum/DESIGN.md`
- Metis/Chrona designs (remote parity constraints for analytics/time): `crates/metis/DESIGN.md`, `crates/chrona/DESIGN.md`
- Testing strategy: `docs/TESTING-STRATEGY.md`

## M5.1 Outcome — Remote execution preserves renderer contracts; switching locality is configuration-only

Roadmap status: `[ ]` (from `docs/ROADMAP.md`).

Actions (8–10):

1. [ ] Define “locality” as a host-level adapter selection (local engine vs remote adapter) and
       document the contract invariants: same IPC commands, same DTOs, same error shapes. Refs:
       `ARCHITECTURE-BOUNDARY.md`, `crates/desktop/DESIGN.md`, `docs/CONTRACTS-AND-SCHEMAS.md`.
2. [ ] Implement remote adapters behind Rust traits for engines (Praxis/Chrona/Metis/Mneme access)
       without changing renderer code paths. Refs: `ARCHITECTURE-BOUNDARY.md`, `docs/DESIGN.md`,
       `crates/desktop/DESIGN.md`.
3. [ ] Ensure remote mode adds no renderer networking; all network calls are host-owned. Refs:
       `ARCHITECTURE-BOUNDARY.md`.
4. [ ] Define the remote transport(s) supported (e.g., HTTPS RPC) and keep it behind host config;
       no sockets opened in desktop mode. Refs: `ARCHITECTURE-BOUNDARY.md`, `crates/desktop/DESIGN.md`.
5. [ ] Ensure all remote errors map into the same `HostError` contract (`code`, `message`,
       redacted `details`) used in local mode. Refs: `crates/desktop/DESIGN.md`,
       `docs/CONTRACTS-AND-SCHEMAS.md`.
6. [ ] Ensure the IPC manifest remains the “public surface” for the renderer even in remote mode
       (no new renderer-visible commands just for remote). Refs: `docs/contracts/ipc-manifest.json`,
       `docs/CONTRACTS-AND-SCHEMAS.md`.
7. [ ] Add a configuration UX that lets users view current locality and switch when safe (with
       clear warnings and rollback). Refs: `docs/UX-DESIGN.md`, `app/AideonDesktop/DESIGN.md`,
       `crates/desktop/DESIGN.md`.
8. [ ] Add tests that run the same renderer flows against local and remote adapters with identical
       expected DTO shapes. Refs: `docs/TESTING-STRATEGY.md`, `docs/CONTRACTS-AND-SCHEMAS.md`.
9. [ ] Ensure remote mode is opt-in and cannot be activated accidentally (explicit config switch).
       Refs: `crates/desktop/DESIGN.md`, `ARCHITECTURE-BOUNDARY.md`.
10. [ ] Document the remote readiness seam and invariants in architecture and contract docs to
        prevent drift. Refs: `ARCHITECTURE-BOUNDARY.md`, `docs/CONTRACTS-AND-SCHEMAS.md`.

## M5.2 Outcome — Authn/z, audit, and capability posture match desktop security defaults

Roadmap status: `[ ]` (from `docs/ROADMAP.md`).

Actions (8–10):

1. [ ] Define the authentication model as host-owned (renderer never handles secrets), including
       token storage in platform-secure stores. Refs: `ARCHITECTURE-BOUNDARY.md`,
       `crates/desktop/DESIGN.md`.
2. [ ] Define authorization as capability-driven (deny-by-default) and consistent across local and
       remote modes. Refs: `ARCHITECTURE-BOUNDARY.md`, `crates/desktop/DESIGN.md`.
3. [ ] Ensure every privileged action is audited with correlation ids (export, ingest, scenario
       mutations, remote writes) and audits are durable. Refs: `crates/desktop/DESIGN.md`,
       `docs/DESIGN.md`.
4. [ ] Define and implement “capability equivalence” rules: remote mode must not add new default
       privileges compared to local mode. Refs: `ARCHITECTURE-BOUNDARY.md`,
       `crates/desktop/DESIGN.md`.
5. [ ] Ensure PII redaction posture remains deny-by-default in remote mode, including diagnostics
       and exports. Refs: `ARCHITECTURE-BOUNDARY.md`, `docs/UX-DESIGN.md`.
6. [ ] Provide UX for auth failures and permission denials that is actionable and routes to Status
       (no silent failures). Refs: `docs/UX-DESIGN.md`, `crates/desktop/DESIGN.md`.
7. [ ] Ensure remote credentials can be revoked/cleared easily (Settings) and that the app returns
       to safe local mode. Refs: `crates/desktop/DESIGN.md`, `docs/UX-DESIGN.md`.
8. [ ] Add tests for auth flows (missing credentials, expired, denied) and assert consistent error
       codes and UI messaging. Refs: `docs/TESTING-STRATEGY.md`,
       `docs/CONTRACTS-AND-SCHEMAS.md`.
9. [ ] Document audit event shapes and redaction rules, and treat them as contracts. Refs:
       `crates/desktop/DESIGN.md`, `docs/CONTRACTS-AND-SCHEMAS.md`.
10. [ ] Add a CI/security regression suite ensuring remote mode does not violate boundary rules
        (renderer HTTP remains absent). Refs: `ARCHITECTURE-BOUNDARY.md`,
        `docs/CODING-STANDARDS.md`.

## M5.3 Outcome — Remote mode does not introduce renderer networking; host remains the boundary

Roadmap status: `[ ]` (from `docs/ROADMAP.md`).

Actions (8–10):

1. [ ] Keep renderer networking prohibited; enforce via lint/guard (no `fetch`/HTTP libs in
       renderer) and tests. Refs: `ARCHITECTURE-BOUNDARY.md`, `docs/CODING-STANDARDS.md`,
       `docs/TESTING-STRATEGY.md`.
2. [ ] Ensure any remote transport client lives in Rust host only and is capability-gated. Refs:
       `crates/desktop/DESIGN.md`, `ARCHITECTURE-BOUNDARY.md`.
3. [ ] Ensure remote connectivity cannot open inbound ports in desktop mode; only outbound
       client calls are allowed. Refs: `ARCHITECTURE-BOUNDARY.md`.
4. [ ] Ensure renderer uses the same adapters and IPC command set for local and remote; no new
       IPC commands that “leak” transport concerns. Refs: `docs/contracts/ipc-manifest.json`,
       `docs/CONTRACTS-AND-SCHEMAS.md`.
5. [ ] Add explicit host config for remote endpoints and ensure it is validated and safe (no
       arbitrary URL execution). Refs: `crates/desktop/DESIGN.md`.
6. [ ] Ensure logs/diagnostics do not include secrets or full URLs with tokens; redact by default.
       Refs: `crates/desktop/DESIGN.md`, `ARCHITECTURE-BOUNDARY.md`.
7. [ ] Provide Status window indicators for connectivity state and last remote sync attempt (read-only
       summary). Refs: `docs/UX-DESIGN.md`, `crates/desktop/DESIGN.md`.
8. [ ] Add tests that assert renderer remains offline-capable even when remote config exists (no
       startup failure if remote is unreachable). Refs: `docs/TESTING-STRATEGY.md`,
       `docs/UX-DESIGN.md`.
9. [ ] Document remote mode boundary guarantees explicitly and keep them evergreen. Refs:
       `ARCHITECTURE-BOUNDARY.md`, `docs/DESIGN.md`.
10. [ ] Ensure any future “server mode” remains a host config switch and not a renderer fork. Refs:
        `ARCHITECTURE-BOUNDARY.md`, `docs/ROADMAP.md`.

## M5.4 Outcome — Network failures degrade gracefully; offline mode remains fully functional

Roadmap status: `[ ]` (from `docs/ROADMAP.md`).

Actions (8–10):

1. [ ] Define network failure classes (DNS, timeout, auth, partial outage) and map them to stable
       host error codes and UI guidance. Refs: `crates/desktop/DESIGN.md`, `docs/UX-DESIGN.md`.
2. [ ] Ensure offline mode remains fully functional: local engines and local data are always
       accessible regardless of remote failures. Refs: `ARCHITECTURE-BOUNDARY.md`, `docs/DESIGN.md`.
3. [ ] Ensure remote mode failures do not block startup or workspace open; degrade to local mode or
       show a bounded error with recovery options. Refs: `docs/UX-DESIGN.md`,
       `crates/desktop/DESIGN.md`.
4. [ ] Provide a clear UI indicator when in “degraded remote” mode, and a one-click action to
       return to local mode (if safe). Refs: `docs/UX-DESIGN.md`, `app/AideonDesktop/DESIGN.md`.
5. [ ] Ensure any queued remote operations are either safely retried or explicitly cancelled with
       user control; avoid silent data loss. Refs: `crates/desktop/DESIGN.md`, `docs/DESIGN.md`.
6. [ ] Ensure result caching and job histories still work locally when remote is down. Refs:
       `crates/mneme_store/DESIGN.md`, `crates/desktop/DESIGN.md`.
7. [ ] Add tests that simulate remote outage and assert core local flows still work (artefact run,
       selection, edits). Refs: `docs/TESTING-STRATEGY.md`, `docs/UX-DESIGN.md`.
8. [ ] Ensure retry/backoff policies are bounded and do not drain resources; surface when retries
       are happening. Refs: `crates/desktop/DESIGN.md`, `docs/UX-DESIGN.md`.
9. [ ] Ensure diagnostics (Status) includes the minimum actionable details (without secrets) for
       network failures. Refs: `docs/UX-DESIGN.md`, `crates/desktop/DESIGN.md`.
10. [ ] Document remote failure UX patterns and ensure they match the evergreen UX contract. Refs:
        `docs/UX-DESIGN.md`, `ARCHITECTURE-BOUNDARY.md`.

## M5.5 Outcome — Data portability is proven: workspace export/import works across modes

Roadmap status: `[ ]` (from `docs/ROADMAP.md`).

Actions (8–10):

1. [ ] Define the canonical workspace export format (op-log stream and/or snapshot stream) and
       ensure it is portable across local/remote. Refs: `crates/mneme_store/DESIGN.md`,
       `docs/DESIGN.md`, `docs/CONTRACTS-AND-SCHEMAS.md`.
2. [ ] Ensure export/import is host-owned (dialogs/filesystem access capability-gated) and deny-by-default.
       Refs: `ARCHITECTURE-BOUNDARY.md`, `crates/desktop/DESIGN.md`.
3. [ ] Provide import validation: schemaVersion checks, metamodel compatibility, and safe migration
       strategy. Refs: `crates/mneme_store/DESIGN.md`, `crates/praxis/DESIGN.md`,
       `docs/storage/SQLITE.md`.
4. [ ] Ensure imports can be staged in a “preview” / “dry run” mode with bounded diff summary.
       Refs: `docs/UX-DESIGN.md`, `crates/praxis/DESIGN.md`.
5. [ ] Ensure exports respect PII redaction posture by default; allow opt-in only with explicit
       capability. Refs: `ARCHITECTURE-BOUNDARY.md`, `crates/desktop/DESIGN.md`.
6. [ ] Prove portability across modes: export from local, import into remote-backed workspace (and
       vice versa) with identical observable state. Refs: `docs/DESIGN.md`,
       `docs/TESTING-STRATEGY.md`.
7. [ ] Ensure exports/imports are job-driven when expensive (progress/cancel), and results are
       recorded as durable job history. Refs: `crates/desktop/DESIGN.md`, `docs/UX-DESIGN.md`.
8. [ ] Add tests for export/import flows and at least one failure (incompatible schema, corrupted
       stream) with actionable UI guidance. Refs: `docs/TESTING-STRATEGY.md`, `docs/UX-DESIGN.md`.
9. [ ] Document the export/import user flows in UX docs (Status + workspace recovery), including
       empty/loading/error states. Refs: `docs/UX-DESIGN.md`, `app/AideonDesktop/DESIGN.md`.
10. [ ] Update contracts docs for the export/import commands/events and ensure manifests remain
        enforced. Refs: `docs/CONTRACTS-AND-SCHEMAS.md`, `docs/contracts/ipc-manifest.json`.

## M5.6 Outcome — Latency budgets are tracked and surfaced against SLOs

Roadmap status: `[ ]` (from `docs/ROADMAP.md`).

Actions (8–10):

1. [ ] Define per-operation latency budgets for remote mode (artefact execute, task apply, list
       scenarios/templates) and align them with SLO targets. Refs: `docs/ROADMAP.md`,
       `crates/desktop/DESIGN.md`.
2. [ ] Instrument host calls (local and remote) with timing metrics and correlation ids. Refs:
       `crates/desktop/DESIGN.md`.
3. [ ] Surface latency indicators in Status window (p50/p95 snapshots, recent slowest operations)
       without exposing sensitive data. Refs: `docs/UX-DESIGN.md`, `crates/desktop/DESIGN.md`.
4. [ ] Ensure the UI remains responsive under higher latency by using job-driven flows and showing
       progress rather than blocking. Refs: `docs/UX-DESIGN.md`, `crates/desktop/DESIGN.md`.
5. [ ] Add a local perf harness for key flows and optionally a remote mock adapter harness to
       validate budgets. Refs: `docs/TESTING-STRATEGY.md`, `docs/ROADMAP.md`.
6. [ ] Ensure retries/backoff are included in latency accounting and visible to users. Refs:
       `docs/UX-DESIGN.md`, `crates/desktop/DESIGN.md`.
7. [ ] Add tests that assert timing instrumentation exists and that extreme latency triggers
       actionable UI states (timeout guidance). Refs: `docs/TESTING-STRATEGY.md`,
       `docs/UX-DESIGN.md`.
8. [ ] Ensure latency budgets are not treated as “nice to have”: include regression guardrails in
       CI (non-flaky). Refs: `docs/CODING-STANDARDS.md`, `docs/ROADMAP.md`.
9. [ ] Document latency expectations and budgets in the roadmap and host design. Refs:
       `docs/ROADMAP.md`, `crates/desktop/DESIGN.md`.
10. [ ] Update the roadmap checkboxes only when budgets are validated end-to-end. Refs:
        `docs/ROADMAP.md`, `CHANGELOG.md`.

## M5.7 Outcome — Capability defaults remain deny-by-default in both modes

Roadmap status: `[ ]` (from `docs/ROADMAP.md`).

Actions (8–10):

1. [ ] Ensure capabilities are defined centrally and that default config grants the minimum set,
       regardless of local or remote mode. Refs: `crates/desktop/DESIGN.md`,
       `ARCHITECTURE-BOUNDARY.md`.
2. [ ] Ensure adding remote mode does not require relaxing CSP or enabling renderer features. Refs:
       `ARCHITECTURE-BOUNDARY.md`, `crates/desktop/DESIGN.md`.
3. [ ] Ensure any remote-only capability (e.g., “remote_write”) is off by default and requires
       explicit user/admin enablement. Refs: `crates/desktop/DESIGN.md`, `docs/DESIGN.md`.
4. [ ] Provide audit logging for capability changes and remote mode toggles. Refs:
       `crates/desktop/DESIGN.md`.
5. [ ] Add a Settings UI that shows capability posture (read-only baseline) and where applicable
       provides enable/disable with explicit confirmation. Refs: `docs/UX-DESIGN.md`,
       `crates/desktop/DESIGN.md`.
6. [ ] Add tests that assert default capability posture stays minimal and new capabilities are not
       accidentally granted. Refs: `docs/TESTING-STRATEGY.md`, `docs/CODING-STANDARDS.md`.
7. [ ] Ensure capability gating is enforced for export/import, connector/network use, and any
       privileged OS integration in both modes. Refs: `ARCHITECTURE-BOUNDARY.md`,
       `crates/desktop/DESIGN.md`.
8. [ ] Ensure capability enforcement produces stable errors that are actionable in UI. Refs:
       `docs/UX-DESIGN.md`, `docs/CONTRACTS-AND-SCHEMAS.md`.
9. [ ] Document deny-by-default policy in architecture, host design, and UX contract docs. Refs:
       `ARCHITECTURE-BOUNDARY.md`, `crates/desktop/DESIGN.md`, `docs/UX-DESIGN.md`.
10. [ ] Update manifests and contract tests when capability-relevant commands/events change. Refs:
        `docs/CONTRACTS-AND-SCHEMAS.md`, `docs/TESTING-STRATEGY.md`.

## M5.8 Outcome — DoD: parity tests confirm identical UX and contracts in local vs remote mode

Roadmap status: `[ ]` (from `docs/ROADMAP.md`).

Actions (8–10):

1. [ ] Define “parity” precisely: same commands/events/DTOs, same user-visible flows, same error
       semantics, differences only in latency and availability constraints. Refs:
       `ARCHITECTURE-BOUNDARY.md`, `docs/UX-DESIGN.md`.
2. [ ] Add a parity test harness that runs a minimal suite of core flows against both local and
       remote adapters. Refs: `docs/TESTING-STRATEGY.md`, `crates/desktop/DESIGN.md`.
3. [ ] Include at least these flows in parity:
   - boot + workspace open,
   - list scenarios/templates,
   - run one artefact,
   - apply one task op,
   - observe a job update,
   - export/import (where enabled).
     Refs: `docs/UX-DESIGN.md`, `docs/TESTING-STRATEGY.md`.
4. [ ] Ensure parity tests validate DTO shapes strictly (schema validation), not “looks roughly ok”.
       Refs: `docs/CONTRACTS-AND-SCHEMAS.md`, `docs/TESTING-STRATEGY.md`.
5. [ ] Ensure parity tests validate security posture (no renderer HTTP, no new ports). Refs:
       `ARCHITECTURE-BOUNDARY.md`, `docs/CODING-STANDARDS.md`.
6. [ ] Ensure parity tests validate error mappings (auth failures, timeouts) are stable and user
       guidance matches UX contract. Refs: `docs/UX-DESIGN.md`, `crates/desktop/DESIGN.md`.
7. [ ] Ensure parity tests validate event-driven correctness (no polling by default). Refs:
       `docs/UX-DESIGN.md`, `docs/CONTRACTS-AND-SCHEMAS.md`.
8. [ ] Update `docs/ROADMAP.md` M5 checkboxes only when parity evidence exists and record the
       milestone completion in `CHANGELOG.md`. Refs: `docs/ROADMAP.md`, `CHANGELOG.md`.
9. [ ] Ensure remote mode documentation remains evergreen (describes end-state and invariants, not
       temporary implementation details). Refs: `docs/DESIGN.md`, `ARCHITECTURE-BOUNDARY.md`.
10. [ ] Mark M5 complete only when every M5 outcome and the DoD line are `[x]` and the parity suite
        is reliable and non-flaky. Refs: `docs/TESTING-STRATEGY.md`, `docs/CODING-STANDARDS.md`.
