# Domain Docs

How the engineering skills should consume this repo's domain documentation when exploring the codebase. This is a **single-context** repo.

## Before exploring, read these

- **`CONTEXT.md`** at the repo root — the project's domain glossary. (Doesn't exist yet; see below.)
- **`docs/06-adrs/`** — read ADRs that touch the area you're about to work in. Files are named `ADR-NNNN-<slug>.md`, indexed by `docs/06-adrs/ADRS.md`.

The broader design corpus also lives under `docs/` (`00-index` … `06-adrs`, plus `05-modules`, `04-contracts`). When an ADR or `CONTEXT.md` is silent, the suite/module design docs are the next authority — see the precedence order in the root `CLAUDE.md`.

If `CONTEXT.md` doesn't exist, **proceed silently**. Don't flag its absence or suggest creating it upfront. The producer skill (`/grill-with-docs`) creates it lazily when terms actually get resolved. ADRs already exist at `docs/06-adrs/`.

## File structure

```
/
├── CONTEXT.md                         ← domain glossary (created lazily)
├── docs/
│   └── 06-adrs/
│       ├── ADRS.md                    ← ADR index
│       ├── ADR-0001-workspace-is-canonical-authority.md
│       ├── ADR-0006-tauri-trust-boundary-and-typed-ipc.md
│       └── …
├── src/                               ← React renderer
├── src-tauri/                         ← Tauri host
└── crates/                            ← engine crates (praxis, chrona, metis, continuum, mneme)
```

## Use the glossary's vocabulary

When your output names a domain concept (in an issue title, a refactor proposal, a hypothesis, a test name), use the term as defined in `CONTEXT.md` and the design docs — e.g. *valid time* / *asserted time*, *scenario*, *plan vs actual*, *Plan Event*, *workspace as canonical authority*. Don't drift to synonyms the glossary explicitly avoids.

If the concept you need isn't in the glossary yet, that's a signal — either you're inventing language the project doesn't use (reconsider) or there's a real gap (note it for `/grill-with-docs`).

## Flag ADR conflicts

If your output contradicts an existing ADR, surface it explicitly rather than silently overriding:

> _Contradicts ADR-0006 (Tauri trust boundary and typed IPC) — but worth reopening because…_
