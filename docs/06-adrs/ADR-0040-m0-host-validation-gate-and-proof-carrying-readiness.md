# ADR-0040: M0 Host-Validation Gate — Two-Tier In-Window Strategy and Proof-Carrying Readiness

- Status: Accepted
- Date: 2026-06-22
- Accepted: 2026-06-22 (ratified via the execution-discipline review of the milestone gates, defects [D2](../build-contracts/defect-register.md)/[D3](../build-contracts/defect-register.md)/[D4](../build-contracts/defect-register.md))
- Depends-On: ADR-0006 (Tauri trust boundary and typed IPC), ADR-0027 (projection consistency / rebuild equivalence)
- Relates-To: ADR-0016 (RFC-9457 error envelope), ADR-0019 (observability and trace context), ADR-0039 (typed-IPC codegen)

## Context

M0's headline — "a portable workspace opens, round-trips, and rebuilds losslessly through the typed host boundary" — is currently provable only **below** the boundary it claims to exercise:

- **Every** M0 exit-test row maps to a `mneme_*`/`engine` crate oracle or a fixture ([M0-foundation](../build-contracts/M0-foundation.md) "Exit tests"). No assertion exercises the assembled host IPC surface — the exact gap [D4](../build-contracts/defect-register.md) names.
- The only in-window test asserts a window title and the presence of one `[data-testid="aideon-shell-content"]` node — no region composition, no interaction ([D2](../build-contracts/defect-register.md)). The e2e harness **silently exits 0 on macOS** (`tests/e2e/run.mjs`), because `tauri-driver` has **no macOS support** — so the gate is a no-op on a shipped target.
- `foundation_rebuild_hash` (the M0 determinism oracle, [ADR-0027](./ADR-0027-projection-consistency-model.md)) is asserted only in `crates/mneme_store/tests/m0_exit.rs`, calling the engine struct directly. The readiness contract (`ready_read_write` / `workspace.lifecycle.changed`) is unbuilt; even when built, a **bare boolean flag is satisfiable by a stub** that emits readiness before — or instead of — running the projection.

Net: CI-green is fully consistent with a host boundary that does not exist and a rebuild path whose determinism never travels through the host. The design is ratified; what is missing is a gate that makes those false positives **impossible to merge**.

`tauri-driver` drives Linux (WebKitWebDriver) and Windows (Edge WebDriver) but not macOS WKWebView. A uniform WebDriver gate across all three shipped targets — the form D2 originally implied — is therefore contradicted by the toolchain, not merely unbuilt.

## Governance Framing

- **Decision type:** stable seam — _how M0 host correctness is gated, and how the readiness event proves it_.
- **Known future pressure:** more commands/events; later UX milestones (M1–M3) each needing the same in-window pattern; a possible future macOS WebView driver.
- **What stays stable:** the typed-IPC trust boundary ([ADR-0006](./ADR-0006-tauri-trust-boundary-and-typed-ipc.md)); the RFC-9457 envelope ([ADR-0016](./ADR-0016-error-envelope-rfc9457.md)); the rebuild-equivalence relation ([ADR-0027](./ADR-0027-projection-consistency-model.md)); deny-by-default capabilities.
- **What is provisional:** the WebDriver runner choice; whether macOS later gains an interactive in-window driver (Playwright/WKWebView automation) and is promoted to Tier 2.
- **Why hard to reverse:** milestone-exit definitions and the readiness event shape are cross-referenced by the build contracts, the event manifest, and the golden journey; changing the gate later means re-touching all of them.

## Decision

### 1. M0 host correctness is gated in two tiers

**Tier 1 — the wall: a portable, merge-blocking real-host boundary test.** Runs on macOS, Windows, and Linux. Drives the **actual** Tauri command registrations / handler functions — never jsdom, mocked IPC, or renderer-only adapters. Minimum assertions:

- `workspace.create` / `open` / `close` / `rebuild` and the readiness event are actually registered.
- Command registration matches the generated TypeScript bindings ([ADR-0039](./ADR-0039-typed-ipc-codegen-over-hand-maintained-manifests.md)) and the capability manifest.
- Capability denial works per window/context.
- Error responses use the RFC-9457 envelope ([ADR-0016](./ADR-0016-error-envelope-rfc9457.md)) and do not leak Rust internals.
- `correlation_id` propagates from request to event/log ([ADR-0019](./ADR-0019-observability-and-trace-context.md)).
- A long-running rebuild returns an `AcceptedJob`, not a blocking response.
- `BACKPRESSURE` returns the documented code and shape.
- Unknown, malformed, and denied commands fail predictably.

**Tier 2 — supplementary in-window UI smoke, asymmetric by toolchain reality.**

- **Windows WebView2 + Linux WebKitGTK:** launch the real app; assert the shell composes the required regions (not just a title + one node); perform ≥1 interaction per implemented surface; assert the interaction crosses the real adapter/host seam where the surface claims host-backed behaviour.
- **macOS:** build the DMG/ZIP; launch; capture screenshot artefacts; assert shell render, title, and stable test IDs where accessible; **log explicitly** that interactive WebDriver coverage is unavailable under the current toolchain. **Never silently `exit 0`.**

**macOS interactive in-window automation is explicitly out of scope for M0** unless the toolchain changes. Tier 1 (which runs on macOS) is what protects the macOS host contract; Tier 2 macOS is launch-smoke + screenshot only.

### 2. Readiness is proof-carrying

The readiness event **carries the `foundation_rebuild_hash`** for the rebuilt foundation state, plus enough context to bind it to the workspace and the job that produced it — it is an **integrity claim with evidence attached**, not a status message. Minimum event shape:

```ts
type WorkspaceReadinessEvent = {
  type: 'workspace.ready_read_write';
  workspace_id: string;
  job_id: string;
  readiness: 'read_write';
  foundation_rebuild_hash: string;
  runtime_generation: string;
  correlation_id: string;
};
```

**The host carries and publishes the proof; it must not invent it.** The hash is computed by the **same engine path** `crates/mneme_store/tests/m0_exit.rs` already tests — there is no second hash algorithm in the host. Faking the event therefore requires either running the real rebuild or deliberately falsifying the engine proof path, which the crate oracle catches.

The Tier-1 boundary test asserts the full chain through the host surface:

1. Open the workspace through the host surface.
2. Read the current `foundation_rebuild_hash` through `workspace.status`.
3. Delete `.aideon/runtime/`.
4. Call `workspace.rebuild`.
5. Assert the command returns an `AcceptedJob`, **not** completion.
6. Assert read-write readiness is **withheld** while rebuild is incomplete.
7. Wait for `workspace.ready_read_write`.
8. Assert the event includes `job_id`, `correlation_id`, and `foundation_rebuild_hash`.
9. Assert the event hash **equals the pre-wipe hash**.
10. Assert `workspace.status` after readiness reports the **same** hash.

`crates/mneme_store/tests/m0_exit.rs` remains **necessary but insufficient** — its role is engine isolation ("Mneme can deterministically rebuild foundation state"). The host boundary test proves the **product claim** ("the app rebuilds as accepted work and only declares read-write readiness once equivalent foundation state exists"). The golden journey reuses this same proof as the user-facing acceptance path. The MILESTONES ledger rows for rebuild and the accepted-work core point at the Tier-1 host boundary test.

### 3. The golden journey reuses, not re-implements

Golden-journey steps 8–10 (close/reopen, delete runtime, rebuild with proven equivalence) are validated by **the same** Tier-1 assertion, not a second determinism implementation — consistent with [ADR-0037](./ADR-0037-contract-precedence-and-source-of-truth.md) one-source-of-truth.

## Considered Options

- **Uniform WebDriver on all three shipped targets.** Rejected: `tauri-driver` has no macOS support; this is the impossibility that caused the silent Darwin skip in the first place.
- **Full in-window e2e as the hard merge gate.** Rejected: flaky and partial-coverage by tooling necessity; as a hard gate it either blocks on flakes or gets weakened until it proves little. In-window is the supplementary smoke, not the wall.
- **Keep the determinism proof at the crate layer only.** Rejected: recreates D4 — a green tick with the boundary unbuilt.
- **Invest now in macOS interactive automation (Playwright/WKWebView).** Rejected for M0: a multi-week tooling yak-shave for marginal gain over a screenshot artefact plus the portable Tier-1 test, and it would burn effort before the command surface even exists.

## Consequences

- macOS interaction coverage is weaker **by design**; mitigated by the portable Tier-1 boundary test (which runs on macOS) plus screenshot artefacts. The asymmetry is recorded here so it is not re-litigated as an oversight.
- The readiness event gains a `foundation_rebuild_hash` payload field — a contract addition tracked against the event manifest ([#291](https://github.com/aideon-ai/aideon-desktop/issues/291)).
- The MILESTONES "Validated by" cells for the rebuild, accepted-work, typed-IPC, and shell rows re-point from crate oracles to the Tier-1 host boundary test / Tier-2 in-window gate.
- M0 cannot exit on crate oracles alone; the host boundary test ([#319](https://github.com/aideon-ai/aideon-desktop/issues/319)) becomes a named M0 exit deliverable.
