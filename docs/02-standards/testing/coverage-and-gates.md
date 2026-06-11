# Coverage and Gates

The coverage targets, the flakiness SLA, and mutation testing — the quality gates a change passes before merge. The everyday CI commands and the Sonar gate are in [CODING-STANDARDS.md §16–17](../CODING-STANDARDS.md#16-quality-gates).

## Coverage targets

| Language / crate group                                           | Lines  | Branches | Functions | Statements |
| ---------------------------------------------------------------- | ------ | -------- | --------- | ---------- |
| TypeScript / React (new code)                                    | ≥ 80 % | ≥ 80 %   | ≥ 80 %    | ≥ 80 %     |
| Rust host (`src-tauri`)                                          | ≥ 80 % | ≥ 80 %   | ≥ 80 %    | —          |
| Rust engines (`praxis`, `chrona`, `metis`, `continuum`, `mneme`) | ≥ 90 % | ≥ 90 %   | ≥ 90 %    | —          |

- Coverage gates are **hard failures** in CI. Overall coverage must trend upward; never regress an existing baseline.
- Generated code and build artefacts are excluded from accounting; justify any further exclusion with a comment and an issue reference.
- Deterministic tests are preferred over broad snapshots.

Coverage is a floor, not a goal. High line coverage with weak assertions passes the gate and misses bugs; mutation testing (below) is the check that the covered lines are actually _tested_, not merely _executed_.

## Flakiness SLA

A flaky test — one that passes and fails without a code change — erodes trust in the whole suite, so flakiness is handled under an explicit service-level agreement, not tolerated:

- **A flaky test is quarantined within one working day** of being identified: tagged (e.g. `#[ignore = "flaky: <issue>"]` in Rust, `test.skip` with an issue link in Vitest) and tracked by an opened issue. A quarantined test does not block the gate, but its quarantine is visible.
- **A quarantined test is fixed or deleted within ten working days.** Fixing flakiness has **higher priority than adding new tests** — a suite that cries wolf is worse than a smaller honest one.
- **The quarantine list is reviewed each release;** a test that cannot be made deterministic is rewritten at a layer where it can be, or removed with its coverage replaced.
- The usual causes are non-determinism the strategy already forbids ([README.md](./README.md) rules): wall-clock time, unfixed seeds, filesystem/order dependence, real Tauri APIs instead of `mockIPC`. A flaky test is almost always a test that broke a determinism rule.

## Mutation testing

Coverage proves a line ran; **mutation testing** proves a test would notice if that line were wrong. A mutation tool makes small changes to the source (flip a comparison, swap a boundary, delete a statement) and runs the suite; a surviving mutant — one no test caught — is a gap in assertion strength, not just in line coverage.

- **Where it applies:** the highest-value, lowest-tolerance logic — temporal resolution ([Chrona](../../05-modules/chrona/README.md)), scenario merge ([Praxis](../../05-modules/praxis/README.md)), graph analytics ([Metis](../../05-modules/metis/README.md)), and op-log/blob integrity ([Mneme](../../05-modules/mneme/README.md)). These are where a silent wrong answer is most damaging and a passing-but-weak test most likely.
- **Tooling:** `cargo-mutants` for Rust crates; **Stryker** for the TypeScript renderer.
- **How it is used:** mutation runs are a periodic deepening check on the engine crates, not a per-PR gate (they are expensive). A surviving mutant on a critical path is a tracked gap; the response is a stronger assertion, not a higher line-coverage number.

Mutation testing is **design intent** at the level of an adopted practice: the tools are named and the target crates identified; wiring them into a periodic CI job is a follow-up. Property-based testing ([property-and-fuzz-testing.md](./property-and-fuzz-testing.md)) is the complementary technique — it strengthens what is asserted across many generated inputs, where mutation testing checks whether existing assertions bite.

## Related documents

| Document                                                           | What it covers                                        |
| ------------------------------------------------------------------ | ----------------------------------------------------- |
| [Testing index](./README.md)                                       | The cross-cutting posture and rules.                  |
| [property-and-fuzz-testing.md](./property-and-fuzz-testing.md)     | The complementary assertion-strengthening techniques. |
| [Coding Standards §16–17](../CODING-STANDARDS.md#16-quality-gates) | The CI commands, Sonar gate, and commit hygiene.      |
