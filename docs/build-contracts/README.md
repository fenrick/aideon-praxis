# Build contracts

The layer that turns the architecture into something an autonomous agent — or a new engineer — can build a step of
**without making an architectural choice**. The numbered design tree (`00-index`…`06-adrs`) is the constitution:
vocabulary, boundaries, invariants, intent. This folder is the executable surface on top of it: the golden journey that
proves the product works end to end, the per-milestone build contracts, the machine-readable schemas and fixtures that
act as test oracles, and the template every `ready-for-agent` issue follows.

The rule this folder enforces: an issue is `ready-for-agent` only when an agent can complete it from the issue alone —
clear acceptance criteria, named files, exact contracts, and no unresolved design question
([triage-labels.md](../agents/triage-labels.md)). A milestone or feature that cannot be reduced to such issues is not
ready; it is design work still in progress.

---

## Contents

| Document                                               | What it is                                                                                                            |
| ------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------- |
| [golden-journey.md](./golden-journey.md)               | The one end-to-end path through M0–M3, step by step, with commands, fixtures, and oracles.                            |
| [agent-issue-template.md](./agent-issue-template.md)   | The contract every `ready-for-agent` issue meets, and the canonical command block.                                    |
| [M0-foundation.md](./M0-foundation.md)                 | M0 build contract — portable workspace, operations, lossless rebuild.                                                 |
| [M1-meaning.md](./M1-meaning.md)                       | M1 build contract — authoring validated against the metamodel.                                                        |
| [M2-time.md](./M2-time.md)                             | M2 build contract — state-at and diff across valid/asserted time, layers, scenarios.                                  |
| [M3-artefacts.md](./M3-artefacts.md)                   | M3 build contract — the first catalogue artefact and bounded analytics (end of MVP).                                  |
| [mvp-command-registry.md](./mvp-command-registry.md)   | The MVP IPC/event surface derived from `docs/contracts/`, with the sync/accepted-work line.                           |
| [mvp-ui-state-machines.md](./mvp-ui-state-machines.md) | Per-surface MVP UI state tables, accessibility, persistence, and the settled library choices.                         |
| [MILESTONES.md](./MILESTONES.md)                       | The single build ledger — per-milestone requirements, the one-owner-per-aspect matrix, validation policy, and status. |
| [defect-register.md](./defect-register.md)             | Living register of cross-milestone conflicts, contradictions, and coverage gaps, with resolution status.              |
| [qa-red-team-log.md](./qa-red-team-log.md)             | The challenge-review red-team log — what was checked, what changed each pass.                                         |
| [counter-case-notes.md](./counter-case-notes.md)       | Steelman counter-cases for the milestone decomposition, and their rebuttals.                                          |

The machine-readable artefacts these contracts pin live alongside the design tree: operation JSON Schemas in
[`docs/contracts/operations/`](../contracts/operations/README.md), and the test-oracle fixture pack (operations,
metamodel, temporal, artefacts, rebuild) under [`docs/data/fixtures/`](../data/fixtures/operations/README.md).

---

## Contract precedence

When two sources describe the same thing, this is the order of authority. The higher tier wins; CI drift-checks each
boundary so a lower tier cannot silently diverge.

1. **Accepted ADRs** (`docs/06-adrs/`) — the invariants. They fix what must always be true; they do not change without a
   new ADR.
2. **Versioned machine-readable schemas and manifests** (`docs/contracts/`) — the exact data shapes. Command names live
   in [`docs/contracts/ipc-manifest.json`](../contracts/ipc-manifest.json); events in
   [`event-manifest.json`](../contracts/event-manifest.json); shell commands in
   [`shell-command-manifest.json`](../contracts/shell-command-manifest.json). These are the single source of truth for
   their surface and are asserted by `tests/contracts/*.contract.test.ts`.
3. **Normative contract documents** (`docs/04-contracts/`) — the _semantics_ of those shapes: the viewpoint frame,
   resolution rules, error taxonomy, projection contract, accepted-work model.
4. **Tested fixtures** (`docs/data/`) — the seed metamodel and dataset, and the expected-output oracles a build is
   checked against.
5. **Implementation code** (`crates/`, `src/`, `src-tauri/`) — the realisation. It conforms to everything above; where
   it disagrees, the code is wrong.

When prose and a generated contract disagree, the generated contract is authoritative for the _shape_ and the prose is
authoritative for the _meaning_ — and the disagreement is a defect to fix, not a choice to make. This precedence is
fixed as an invariant by [ADR-0037](../06-adrs/ADR-0037-contract-precedence-and-source-of-truth.md).

> **One source of truth per surface.** The IPC, event, and shell-command manifests live only in `docs/contracts/`. There
> must be no second copy elsewhere (a set of empty duplicates under `docs/data/meta/` was removed for exactly this
> reason).

---

## How an agent uses this folder

1. Read the milestone build contract for the work, and the [golden-journey](./golden-journey.md) segment it belongs to.
2. Take the named contracts (manifest entries, schemas) as fixed; take the fixtures as the expected output.
3. Implement until the acceptance scenarios pass and the commands in the
   [agent-issue template](./agent-issue-template.md) are green.
4. If a step requires an architectural decision the contracts do not settle, **stop** — the issue is not
   `ready-for-agent`; it returns to a human with the open question named.

---

## Related documents

| Document                                                  | What it covers                                                        |
| --------------------------------------------------------- | --------------------------------------------------------------------- |
| [00-index/ROADMAP.md](../00-index/ROADMAP.md)             | The MVP definition and the M0–M6 milestone gates this layer fills in. |
| [04-contracts/README.md](../04-contracts/README.md)       | The semantics of the typed shapes the manifests name.                 |
| [agents/triage-labels.md](../agents/triage-labels.md)     | The `ready-for-agent` bar this folder operationalises.                |
| [02-standards/CI-CHECKS.md](../02-standards/CI-CHECKS.md) | The CI gates that prove a build contract is met.                      |
