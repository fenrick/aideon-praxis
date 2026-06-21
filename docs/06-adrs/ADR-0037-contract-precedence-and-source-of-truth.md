# ADR-0037: Contract Precedence and Source of Truth

- Status: Accepted
- Date: 2026-06-16
- Depends-On: ADR-0011, ADR-0017
- Relates-To: ADR-0006, ADR-0016, ADR-0027
- Amended-By: ADR-0039 (2026-06-22) — the IPC/event/shell-command manifests under `docs/contracts/` are **generated** from the Rust command surface, not hand-maintained; the precedence order still holds, but the manifest tier is a codegen artefact verified by drift checks rather than an independently authored source.

## Context

The corpus describes the same surfaces in more than one place: an ADR fixes an invariant, a manifest under [`docs/contracts/`](../04-contracts/README.md) lists exact command and event names, a contract document in `docs/04-contracts/` states their semantics, a fixture under `docs/data/` gives a worked example, and the code realises all of it. This is healthy — each layer answers a different question — but only if there is one rule for **which wins when two disagree**. Without it, an implementer (or an autonomous agent) who finds prose and a manifest in tension has to make an architectural choice to proceed, which is exactly what the [`ready-for-agent`](../agents/triage-labels.md) bar forbids.

The repository already enforces parts of this implicitly: the IPC, event, and shell-command manifests in `docs/contracts/` are drift-checked by `tests/contracts/*.contract.test.ts`, and DTO/contract versioning is fixed by [ADR-0017](./ADR-0017-contract-and-dto-versioning.md). What is not yet written down is the ordering across all five layers and the rule for resolving a disagreement. A recent cleanup found empty duplicate manifests under `docs/data/meta/` — a second "source of truth" that should never have existed — which is the concrete failure this decision prevents.

## Governance Framing

- **Decision type:** Invariant (the precedence order) + stable seam (the `docs/contracts/` manifests as the authoritative shape surface).
- **Known future pressure:** more generated schemas (per-operation, per-DTO); more manifests; an autonomous agent population that needs an unambiguous authority chain; hosted/multi-user surfaces adding commands.
- **What stays stable:** the five-tier order; one source of truth per surface; generated-shape-wins / prose-means-semantics; disagreement is a defect, not a choice.
- **What is provisional:** which artefacts are generated vs hand-authored within a tier; the exact drift-check mechanism per surface.
- **What is deferred:** automated cross-tier validation beyond the existing manifest drift checks (e.g. fixture-validates-against-schema gates) — tracked as build-contract work.
- **Why hard to reverse:** every build contract, agent issue, and CI gate references this order; changing it would re-open every "which wins?" question across the corpus.

## Decision

- **Precedence, highest to lowest:** (1) Accepted ADRs — invariants; (2) versioned machine-readable schemas and manifests under `docs/contracts/` — exact shapes; (3) normative contract documents under `docs/04-contracts/` — semantics; (4) tested fixtures under `docs/data/` — expected outputs; (5) implementation code — the realisation. The higher tier wins.
- **One source of truth per surface.** A command name, event name, or data shape is defined in exactly one artefact. The `docs/contracts/` manifests are authoritative for the IPC, event, and shell-command surfaces; no duplicate may live elsewhere.
- **Generated shape wins; prose carries meaning.** When a contract document and a generated manifest/schema disagree about a _shape_, the generated artefact is authoritative and the prose is corrected. When they disagree about _meaning_, the contract document is authoritative and the shape is checked against it. Either way the disagreement is a **defect to fix**, never a decision an implementer makes ad hoc.
- **Drift is caught in CI.** Each shape surface has a drift check (today: `tests/contracts/*.contract.test.ts`). A change to a shape is a versioned event ([ADR-0017](./ADR-0017-contract-and-dto-versioning.md)), not a silent edit.

## Consequences

- An agent resolving a contradiction has a deterministic rule and does not invent architecture; an unresolvable gap sends the issue back to a human with the open question named.
- New generated artefacts (per-operation schemas, the MVP command registry) slot into tier 2 and inherit the drift-check obligation.
- The empty `docs/data/meta/*-manifest.json` duplicates are removed; `docs/build-contracts/README.md` records the precedence for day-to-day use and points here for the invariant.
- Code is never the authority for a shape or a rule; "the code does X" is evidence of a defect when X contradicts a higher tier, not a contract.
