# ADR-0039: Typed IPC Bindings by Codegen, Retiring the Hand-Maintained Manifest Layer

- Status: Proposed
- Date: 2026-06-18
- Depends-On: ADR-0006
- Relates-To: ADR-0016, ADR-0017, ADR-0037

## Context

The renderer↔host bridge is Tauri's stringly-typed `invoke("command", payload)` ([ADR-0006](./ADR-0006-tauri-trust-boundary-and-typed-ipc.md)). On top of it the project maintains the command surface in **four parallel places**, kept in agreement by **three tests**:

- Rust `#[tauri::command]` handlers, composed once in `generate_handler!` (the registration/composition root — a container pattern, not a choke point);
- the capability **allowlist** (the `appcommands` permission referenced by `src-tauri/capabilities/default.json`) — the deny-by-default security gate;
- the generated `docs/contracts/{ipc,event,shell-command}-manifest.json` (produced by `aideon_xtask`);
- **six** TypeScript `*_IPC_COMMANDS` constant arrays + per-engine typed adapters, funnelled through one `src/adapters/ipc.ts` `invoke` wrapper.

The three enforcement tests are: `security_posture` (allowlist **==** manifest), `ipc-manifest.contract` (renderer command strings **⊆** manifest), and the `xtask` self-drift check (manifest **==** Rust source). This works, but it is a **manual stand-in for what Tauri-v2 codegen does at build time**: the wire stays stringly-typed, type-safety is only enforced at _test_ time, every new command must be edited into ~four places, and the single `invoke` wrapper collapses every failure into one location so stack traces lose the call site. ADR-0037 made the generated manifest "the source of truth"; this ADR moves the source of truth one step earlier — to the Rust commands themselves — and generates everything else.

## Governance Framing

- **Decision type:** stable seam — _how the IPC contract is authored and kept in agreement_. Amends [ADR-0037](./ADR-0037-contract-precedence-and-source-of-truth.md): the **Rust commands** are the source; the TS client and any manifest are **generated artefacts**.
- **Known future pressure:** more commands and events; non-trivial arg/return types; multiple engines contributing commands under licensing.
- **What stays stable:** `#[tauri::command]` is the single source of the surface; the capability allowlist remains the deny-by-default security gate; Rust→frontend stays events/channels ([ADR-0006](./ADR-0006-tauri-trust-boundary-and-typed-ipc.md)); the RFC-9457 error envelope ([ADR-0016](./ADR-0016-error-envelope-rfc9457.md)) and DTO/SemVer versioning ([ADR-0017](./ADR-0017-contract-and-dto-versioning.md)) are unchanged.
- **What is provisional:** the codegen tool (default **`tauri-specta`**; `taurpc` is the alternative); whether a human-readable manifest is still emitted (as a _generated_ doc, not hand-authored).
- **Why hard to reverse:** command names are cross-link targets and renderer call sites; switching the generation source is a one-time migration of the seam, best done in the clean rebuild.

## Decision

- **Adopt build-time codegen for the IPC client (default `tauri-specta`).** Annotate `#[tauri::command]`s (and event/channel payload types); generate the TypeScript client — a **named typed function per command**, with arg and return types — from the Rust definitions. The generated client **is** the renderer's command surface.
- **Retire the hand-maintained layer.** Delete the six `*_IPC_COMMANDS` constant arrays, the `renderer ⊆ manifest` contract test, and `aideon_xtask`'s manifest generators + drift self-check. Drift becomes **impossible by construction** (codegen), not test-enforced; with the datastore subcommands already gone, retiring manifest-gen removes the remaining reason for the `xtask` crate.
- **Single source of truth = the Rust commands.** This amends ADR-0037: the generated bindings are the authoritative contract; any human-readable command/event inventory is a **generated** artefact under `docs/contracts/`, never hand-edited.
- **Keep the capability allowlist as the deny-by-default security gate**, and **re-home the "allowlist == surface" check** onto the generated command set, so that security invariant survives the manifest's retirement (no command exposed outside the allowlist; no stale allowlist entry).
- **Author capability / permission / scope files in TOML**, not JSON — Tauri v2 accepts `.toml` for capabilities and scopes, and TOML is the readable form for hand-authored scopes ([Tauri scope](https://tauri.app/security/scope/)). Migrate `src-tauri/capabilities/*.json` and the `appcommands` permission accordingly.
- **Preserve error attributability.** Because codegen emits one function per command, a failure is attributable to its binding rather than a single anonymous `invoke` wrapper. A thin shared layer still maps the RFC-9457 envelope and stamps `command` + `correlation_id`, but it does not collapse every call site into one throw point.
- **`generate_handler!` is unchanged** — the registration/composition root stays; commands continue to live across modules.

## Considered Options

- **Status quo (hand-maintained manifest + TS constant arrays + three drift tests).** Rejected: four-way manual sync, stringly-typed wire, type-safety only at test time, single-point error obscuring.
- **`tauri-specta` (chosen default).** Closest to plain `#[tauri::command]`; generates typed client + types; mature in the Tauri v2 ecosystem.
- **`taurpc`.** Viable RPC-style typed client; heavier abstraction over the command model — kept as the alternative pending a spike.
- **`ts-rs` (types only).** Rejected: generates types but not the command functions, so the parallel command enumeration (and its drift risk) would remain.
- **Keep the manifest as SoT but auto-generate the TS constants from it.** Rejected half-measure: still a stringly-typed wire and a hand-authored manifest.

## Consequences

- Fewer moving parts: the six TS arrays, one contract test, and `xtask`'s manifest generators (likely the whole crate) are deleted; compile-time type-safety replaces test-time drift checks.
- Runtime `zod` validation narrows to genuinely untrusted boundaries (e.g. import) rather than every command return.
- The **allowlist-equality security check** and a **generated doc inventory** must be re-homed onto the codegen output so ADR-0037's reviewability and the security invariant are not lost.
- This is **renderer + host work (M1)**, not M0; until it lands, the existing manual layer stands. The post-hollow manifests are currently stale (51 removed mneme commands) — resolved either by a one-time manual sync now, or as the first step of this migration.

## Follow-ups / Open Questions

- Spike `tauri-specta` vs `taurpc` and confirm the default; wire codegen into the build and `pnpm run ci`.
- Decide whether to still emit a generated human-readable manifest for docs/ADR-0037 (likely yes, generated).
- Re-implement the `allowlist == surface` security test against the generated command set.
- Migrate capabilities/permissions/scope to TOML.
- Sequence this into the M1 host/renderer rebuild; ratify this ADR (Proposed → Accepted) at that point.
