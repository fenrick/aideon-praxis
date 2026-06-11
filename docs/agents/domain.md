# Domain orientation for agents

How an agent should orient itself in this repository before changing anything. This is a **single-context** repo: one product, one design corpus, one glossary. Reading the right three things first keeps an agent's output in the project's vocabulary and inside its decided invariants.

## Orient: read these, in this order

1. **[`CONTEXT.md`](../../CONTEXT.md) at the repo root — the canonical domain glossary.** It **exists**; read it first. It defines the project's vocabulary (twin, workspace, viewpoint, entity/relationship, Plan Event, layer, scenario) and marks the synonyms to avoid. Any output that names a domain concept uses these terms exactly.
2. **[`02-standards/DOCUMENTATION-STANDARD.md`](../02-standards/DOCUMENTATION-STANDARD.md) — the writing and consistency standard.** It is normative for all authors, human and agent: British English, present tense, deliberate must/should/may, evidence-backed claims, the unified scales (§8), and the honest-state vocabulary (§9). Anything an agent writes into the corpus obeys it.
3. **The relevant layer README.** The design lives under `docs/` in numbered layers (`00-index` … `06-adrs`, plus `05-modules`, `04-contracts`). Open the README of the layer you are about to work in — it is that layer's entry point and links the focused files beneath it.

The ADR index is **[`06-adrs/ADRS.md`](../06-adrs/ADRS.md)**. ADR files are named `ADR-NNNN-<slug>.md`. Read the ADRs that touch the area you are about to change before you change it.

When `CONTEXT.md` and the ADRs are silent, the suite and module design docs are the next authority — see the precedence order in the root [`CLAUDE.md`](../../CLAUDE.md). Documentation is authoritative over code where they disagree ([ARCHITECTURE-BOUNDARY.md](../01-architecture/ARCHITECTURE-BOUNDARY.md), _Documentation Precedence_).

## Repository shape

```
/
├── CONTEXT.md                         ← domain glossary (exists; read first)
├── CLAUDE.md                          ← precedence order and agent guidance
├── docs/
│   ├── 00-index/                      ← documentation map and reading order
│   ├── 01-architecture/               ← system shape, C4, boundaries
│   ├── 02-standards/                  ← how docs and code are held to standard
│   ├── 03-design/                     ← what the product is and how it behaves
│   ├── 04-contracts/                  ← the typed renderer↔host↔engine seams
│   ├── 05-modules/                    ← per-module design (praxis, mneme, …)
│   └── 06-adrs/
│       ├── ADRS.md                    ← the ADR index
│       └── ADR-NNNN-<slug>.md         ← individual decisions
├── src/                               ← React renderer
├── src-tauri/                         ← Tauri host
└── crates/                            ← engine crates (praxis, chrona, metis, continuum, mneme)
```

## Use the glossary's vocabulary

When your output names a domain concept — in an issue title, a refactor proposal, a hypothesis, a test name, a doc — use the term as [`CONTEXT.md`](../../CONTEXT.md) defines it: _valid time_ / _asserted time_, _scenario_, _plan_ vs _actual_, _Plan Event_, _entity_ / _relationship_ (not node/edge in domain prose), _workspace as canonical authority_. Do not drift to a synonym the glossary marks `_Avoid_`.

If the concept you need is not in the glossary, that is a signal: either you are inventing language the project does not use (reconsider), or there is a real gap (note it rather than coin a term silently).

## Flag ADR conflicts, do not override them

If your output contradicts an existing ADR, surface it explicitly rather than silently overriding:

> _Contradicts [ADR-0006](../06-adrs/ADR-0006-tauri-trust-boundary-and-typed-ipc.md) (Tauri trust boundary and typed IPC) — worth reopening because…_

A contradiction is a reason to open a discussion or a new ADR, never a reason to quietly ship against a decided invariant.

## Related documents

| Document                                                               | What it covers                                        |
| ---------------------------------------------------------------------- | ----------------------------------------------------- |
| [`CONTEXT.md`](../../CONTEXT.md)                                       | The canonical domain glossary — read first.           |
| [DOCUMENTATION-STANDARD.md](../02-standards/DOCUMENTATION-STANDARD.md) | The writing and consistency standard for all authors. |
| [06-adrs/ADRS.md](../06-adrs/ADRS.md)                                  | The ADR index.                                        |
| [triage-labels.md](./triage-labels.md)                                 | The canonical triage roles and their tracker labels.  |
| [issue-tracker.md](./issue-tracker.md)                                 | GitHub issue conventions and the label taxonomy.      |
| [`CLAUDE.md`](../../CLAUDE.md)                                         | The precedence order when sources disagree.           |
