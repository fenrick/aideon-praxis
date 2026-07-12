# CI checks

The single list of gates a change must pass before it merges: what each gate asserts, the command that runs it, and where the rule it enforces is defined. This is the doc to open to answer "what does CI actually check, and how do I run that check locally?" It aggregates the gates the existing scripts and workflow already run ([`package.json`](../../package.json) scripts; [`.github/workflows/pipeline.yml`](../../.github/workflows/pipeline.yml)); it does not invent new policy. The rules themselves live in [CODING-STANDARDS.md](./CODING-STANDARDS.md) and [TESTING-STRATEGY.md](./testing/README.md).

---

## The aggregate gate

`pnpm run ci` runs the whole renderer-plus-host gate set in fail-fast order and is the one command to run before pushing ([CODING-STANDARDS.md §17](./CODING-STANDARDS.md#17-commit-hygiene-and-ci)). It composes two halves:

```sh
pnpm run ci          # = node:ci && host:ci
pnpm run node:ci     # design:guard, node:lint, node:typecheck, node:test, node:format:check
pnpm run host:ci     # host:format:check, host:lint, host:check, host:test
```

CI runs the renderer and Rust halves as parallel jobs, with lint and typecheck ahead of the heavier test and build jobs so a quick failure fails fast ([`.github/workflows/pipeline.yml`](../../.github/workflows/pipeline.yml); [CODING-STANDARDS.md §17](./CODING-STANDARDS.md#17-commit-hygiene-and-ci)). A pre-commit hook (Husky + lint-staged) runs format and lint on changed files locally so the same rules are met before the commit lands; a pre-push hook runs the full `pnpm run ci`.

---

## Pre-validation before you push

`pnpm run ci` is the required local gate before pushing — do not rely on CI to catch what a local run would. Two gate families are **not** in the `ci` chain and must be run (or reasoned about) explicitly when a change touches their surface:

- **In-window e2e (Tier-1/Tier-2)** — the WebKitGTK/Tauri gates below run only in CI (they need a display + `tauri-driver`). They are **not** in `pnpm run ci`, so a change to the IPC surface, capabilities, or shell regions can pass `ci` locally and still fail the e2e gate. Reason about them before pushing, or accept the CI round-trip.
- **Coverage / Storybook story tests** — run `node:test:coverage`, `host:coverage`, `test:stories` when the change warrants.

**Keep enumerated gates in sync — this is the rule that most often bites.** Several gates assert a _live artefact matches an enumeration_; adding to the artefact without adding to the enumeration is a latent failure that only surfaces when that (often non-required) gate next runs:

| When you add…                        | Also update                                                                                                                                                         | Enforced by                                           |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------- |
| An IPC command (`#[tauri::command]`) | its invocation in [`tests/e2e/specs/tauri-commands.e2e.mjs`](../../tests/e2e/specs/tauri-commands.e2e.mjs) **and** regenerate `ipc-manifest.json` + the TS bindings | Tier-2 manifest-parity gate; IPC manifest drift check |
| A canonical op kind                  | a valid/invalid fixture pair + its schema                                                                                                                           | operation-fixtures contract test; schema↔DTO drift    |
| A mutating/job command               | its entry in `permissions/appcommands-mutating.toml`                                                                                                                | `security_posture` permission-parity test             |

If a gate enumerates a surface, treat "extend the surface" and "extend the gate" as one change — never two.

---

## Renderer gates (TypeScript / React)

| Gate                       | Command                       | What it asserts                                                                                                                                                            | Defined in                                                                                                                              |
| -------------------------- | ----------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| **Design-system guard**    | `pnpm run design:guard`       | Shared UI lives under `src/design-system`; `src/lib/ui` carries no implementation files ([`tools/design-system-guard.mjs`](../../tools/design-system-guard.mjs)).          | [CODING-STANDARDS.md §12](./CODING-STANDARDS.md), [DESIGN-SYSTEM.md](../03-design/DESIGN-SYSTEM.md)                                     |
| **ESLint**                 | `pnpm run node:lint`          | No lint errors and at most the warning budget; no inline suppressions without a scoped reason ([CODING-STANDARDS.md §17](./CODING-STANDARDS.md#17-commit-hygiene-and-ci)). | [CODING-STANDARDS.md §9, §12](./CODING-STANDARDS.md)                                                                                    |
| **Type-check**             | `pnpm run node:typecheck`     | `tsc --noEmit` passes under strict mode; no `ts-ignore` in new modules.                                                                                                    | [CODING-STANDARDS.md §9](./CODING-STANDARDS.md)                                                                                         |
| **Unit / component tests** | `pnpm run node:test`          | Vitest + Testing Library suites pass, including IPC contract tests mocked at the boundary.                                                                                 | [boundary-and-contract-tests.md](./testing/boundary-and-contract-tests.md)                                                              |
| **Coverage**               | `pnpm run node:test:coverage` | New/changed renderer code meets ≥ 80 % lines, branches, and functions.                                                                                                     | [CODING-STANDARDS.md §16](./CODING-STANDARDS.md), [coverage-and-gates.md](./testing/coverage-and-gates.md)                              |
| **Format**                 | `pnpm run node:format:check`  | Prettier reports no formatting drift across the tree.                                                                                                                      | [DOCUMENTATION-STANDARD.md §13](./DOCUMENTATION-STANDARD.md), [CODING-STANDARDS.md §17](./CODING-STANDARDS.md#17-commit-hygiene-and-ci) |

---

## Host and engine gates (Rust)

| Gate                 | Command                      | What it asserts                                                                            | Defined in                                                                                                   |
| -------------------- | ---------------------------- | ------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------ |
| **Format**           | `pnpm run host:format:check` | `cargo fmt --all --check` reports no drift.                                                | [CODING-STANDARDS.md §13](./CODING-STANDARDS.md)                                                             |
| **Clippy**           | `pnpm run host:lint`         | `cargo clippy --all-targets` is clean with warnings denied (`-D warnings`).                | [CODING-STANDARDS.md §13, §17](./CODING-STANDARDS.md#17-commit-hygiene-and-ci)                               |
| **Check**            | `pnpm run host:check`        | `cargo check --all-targets --all-features` compiles the workspace.                         | [CODING-STANDARDS.md §13](./CODING-STANDARDS.md)                                                             |
| **Tests**            | `pnpm run host:test`         | `cargo test --all` passes, including replay/rebuild and crash-recovery suites.             | [test-layers.md](./testing/test-layers.md), [per-module-obligations.md](./testing/per-module-obligations.md) |
| **Coverage**         | `pnpm run host:coverage`     | New/changed code meets ≥ 80 % (host crate) or ≥ 90 % (engine crates) via `cargo-llvm-cov`. | [CODING-STANDARDS.md §16](./CODING-STANDARDS.md), [coverage-and-gates.md](./testing/coverage-and-gates.md)   |
| **Dependency audit** | `pnpm run host:audit`        | `cargo audit` finds no advisories (warnings denied).                                       | [CODING-STANDARDS.md §15](./CODING-STANDARDS.md)                                                             |

---

## Cross-cutting gates

| Gate                      | Command / mechanism                                                             | What it asserts                                                                                                                                                                                                                                | Defined in                                                                                                                                       |
| ------------------------- | ------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Conventional Commits**  | `pnpm run commitlint`                                                           | Commit subjects use the `feat\|fix\|chore\|ci\|docs\|test\|refactor\|perf\|style` prefixes that drive release tooling.                                                                                                                         | [CODING-STANDARDS.md §17](./CODING-STANDARDS.md#17-commit-hygiene-and-ci)                                                                        |
| **Sonar Quality Gate**    | CI step, measured against `main`                                                | New code passes the Sonar gate (reliability, security, coverage, duplication); a failing gate blocks the merge.                                                                                                                                | [CODING-STANDARDS.md §16](./CODING-STANDARDS.md)                                                                                                 |
| **CodeQL**                | [`.github/workflows/codeql.yml`](../../.github/workflows/codeql.yml)            | Static security analysis finds no new alerts on the changed code.                                                                                                                                                                              | [CODING-STANDARDS.md §15](./CODING-STANDARDS.md)                                                                                                 |
| **Cross-platform build**  | CI `build` matrix (`pnpm run tauri:build`)                                      | The Tauri bundle builds on macOS, Windows, and Linux after the lint/test gates pass.                                                                                                                                                           | [cross-platform-matrix.md](./testing/cross-platform-matrix.md)                                                                                   |
| **IPC manifest drift**    | CI drift check vs [`ipc-manifest.json`](../contracts/ipc-manifest.json)         | The committed IPC manifest matches the host's declared command surface; a shape change requires a manifest update and a version decision.                                                                                                      | [boundary-and-contract-tests.md](./testing/boundary-and-contract-tests.md), [CONTRACTS-AND-SCHEMAS.md](../04-contracts/CONTRACTS-AND-SCHEMAS.md) |
| **Tier-1 host boundary**  | CI job (`cargo test` host-boundary suite)                                       | The golden-journey host seam round-trips create→author→rebuild with `foundation_rebuild_hash` equivalence over canonical files; no RFC-9457 leakage.                                                                                           | [test-layers.md](./testing/test-layers.md)                                                                                                       |
| **Tier-2 in-window e2e**  | CI job (WebKitGTK + `tauri-driver`); [`tests/e2e/specs`](../../tests/e2e/specs) | Shell regions render, capability denial holds, and **every command in `ipc-manifest.json` is exercised over the real Tauri bridge** (manifest-parity coverage) — a new command absent from the spec fails here. Not in `pnpm run ci`; CI-only. | [test-layers.md](./testing/test-layers.md)                                                                                                       |
| **Storybook story tests** | `pnpm run test:stories`                                                         | Story interaction tests render without error (run on UI changes; not part of the default `node:ci` chain).                                                                                                                                     | [DESIGN-SYSTEM.md](../03-design/DESIGN-SYSTEM.md)                                                                                                |

---

## Schema and contract breaking-change detection (design intent)

The corpus has one versioning policy — SemVer 2.0.0 across DTOs, contracts, crates, and metamodel packages ([ADR-0017](../06-adrs/ADR-0017-contract-and-dto-versioning.md)) — and one drift check that catches _accidental_ change to the IPC manifest shape. It does **not** yet have a gate that decides, from the diff, whether an _intentional_ contract or metamodel change is breaking and therefore demands a major-version bump. That gate is recorded here as **design intent** (it is not built; [DOCUMENTATION-STANDARD §12](./DOCUMENTATION-STANDARD.md)):

- **DTO / IPC breaking-change detection.** Compare the IPC manifest and DTO schemas on a branch against `main`; classify each change as additive (minor — new optional field, new command, new enum variant behind explicit handling) or incompatible (major — removed/renamed field, removed enum variant, changed type or meaning, renamed stable error code). An incompatible change with no major-version bump fails the gate. This makes the existing drift check ([boundary-and-contract-tests.md](./testing/boundary-and-contract-tests.md)) the _trigger_ to consider a version bump into an _enforced_ one ([ADR-0017](../06-adrs/ADR-0017-contract-and-dto-versioning.md), consequences).
- **Metamodel breaking-change detection.** Compare the metamodel package (`metamodel_version` and the declared types, slots, and rules) against the prior committed version; classify the diff by the migration op-types ([schema-migration-patterns.md](../05-modules/mneme/schema-migration-patterns.md)): add type / add optional slot / widen / deprecate are minor; add required slot / narrow / rename / remove are major and must carry a version bump and a documented data migration. A major change without the bump, or a narrow with no accompanying migration, fails the gate.

Both checks share one principle: CI can detect that a change _is_ breaking, but the policy for _how_ to version it remains SemVer, set by [ADR-0017](../06-adrs/ADR-0017-contract-and-dto-versioning.md) and applied to schema by [ADR-0035](../06-adrs/ADR-0035-schema-migration-and-evolution.md). The gate enforces the policy; it does not replace it.

---

## References & standards

_Normative:_

- **Semantic Versioning 2.0.0** — the breaking-change classification the detection gates enforce ([ADR-0017](../06-adrs/ADR-0017-contract-and-dto-versioning.md)).

_Informative:_

- Pact — **consumer-driven contracts**. The contract-test discipline the IPC drift check supports ([boundary-and-contract-tests.md](./testing/boundary-and-contract-tests.md)).

## Related documents

| Document                                                                         | What it covers                                                              |
| -------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| [CODING-STANDARDS.md](./CODING-STANDARDS.md)                                     | The quality gates, coverage targets, and commit/CI rules these gates apply. |
| [TESTING-STRATEGY.md](./testing/README.md)                                       | The test layers and coverage gates behind the test commands.                |
| [boundary-and-contract-tests.md](./testing/boundary-and-contract-tests.md)       | The IPC manifest drift check and contract-coverage matrix.                  |
| [ADR-0017](../06-adrs/ADR-0017-contract-and-dto-versioning.md)                   | The SemVer policy the breaking-change gates enforce.                        |
| [schema-migration-patterns.md](../05-modules/mneme/schema-migration-patterns.md) | The migration op-types the metamodel breaking-change gate classifies by.    |
| [ADR-0035](../06-adrs/ADR-0035-schema-migration-and-evolution.md)                | The forward-only schema-evolution decision.                                 |
