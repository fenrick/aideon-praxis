# Design Governance

## Purpose

This document explains how Aideon Desktop makes design decisions without trapping itself in a short-lived v1 shape or disappearing into speculative platform work.

The goal is simple:

- ship a good v1
- avoid design choices we already know will hurt later
- keep future flexibility in the seams, not in layers of guesswork

This is a standing review document. It is not optional reading for major design changes.

## Review Requirement

Any change that affects architecture, contracts, workflow semantics, persistence identities, security boundaries, the **workspace format**, or module responsibilities must be reviewed against this document.

That includes:

- new module boundaries
- changes to public DTOs, IPC commands, or error envelopes
- new persistence or migration patterns, or changes to the **canonical workspace format**
- new accepted-work / run-ledger semantics
- changes to event models
- changes to time, scenario, or branch semantics
- changes to the storage-engine abstraction or the derived-runtime contract
- decisions that would be expensive to reverse after adoption

If a design doc, ADR, or major PR does not make that review visible, it is incomplete.

## Practical Rules First

1. **Build v1, but design the seam for longer.** Implementation solves the problem in front of us; the seam should survive beyond the first implementation. Good: a storage trait that supports SQLite now and redb/RocksDB later; a workspace format that works before and after sync exists. Bad: a one-off payload "because we only need it for v1"; UI state that quietly becomes the system of record.
2. **Design invariants early** (see list below).
3. **Keep provisional decisions visibly provisional.** State what was chosen for now, why it is good enough, and what future pressure will change it. Hidden provisional design is how temporary shortcuts turn into accidental architecture.
4. **Do not abstract for imagined versions.** Add abstraction only when there is more than one real caller, a known second implementation shape, or a genuinely high reversal cost.
5. **Name the future pressure.** "It might matter later" is not good enough.
6. **Separate hard-to-reverse from easy-to-reverse decisions.** Spend effort where reversibility is low: public contracts, the workspace format, persistence IDs, module boundaries, security boundaries, accepted-work semantics, event/error envelopes.
7. **Prefer stable seams over premature platforms.** A clear contract, a narrow boundary, one good implementation — not a plugin system without plugins.
8. **Make review explicit.** State what is invariant, what is a stable seam, what is provisional, what is deferred, and what is expensive to change later.
9. **Show design lineage, not just agreement.** Parent documents drive child documents explicitly: Product Brief → HIG → design/UX → design system → module briefs. If a child document cannot show what it inherited and how it applies that inheritance, the design stack is still loose.

## Aideon Desktop invariants

These should hold beyond the current implementation. Changing one forces wide refactors or breaks the product model.

- **The portable workspace is the canonical authority.** Append-only ops + schema-as-data
  - content-addressed blobs are the truth; the runtime database is derived and rebuildable.
- **Explicit time and scenario context** on every read and write (valid time, asserted time, layer, optional scenario).
- **Contracts-first boundaries**; the Rust core owns the wire shape, the renderer consumes generated types.
- **Host (Tauri/Rust) owns side effects**; the renderer is untrusted and disposable. No renderer filesystem access, no local HTTP server as the primary seam.
- **Durable accepted-work / run-ledger semantics**, persisted in the workspace, not in a hosted service.
- **Replaceable storage engine** behind a stable trait; a single-writer queue per workspace.
- **Canonical semantic edge meanings** (see `05-modules/praxis/EDGE-CATALOGUE`).

## The Design Labels

Use these in design docs, ADRs, and major PR write-ups.

- **Invariant** — should hold beyond the current implementation; changing it later forces wide refactors or breaks the product model.
- **Stable seam** — the public shape stays stable even if the implementation changes (shared DTOs, the storage trait, the workspace format, the IPC surface, run-ledger entities, event envelopes).
- **Provisional** — chosen for now, expected to change, still documented on purpose (e.g. SQLite as the only storage backend before a second backend exists).
- **Deferred** — not solved yet, an intentional boundary (e.g. remote sync conflict resolution, encryption envelopes, plugin packaging).

## Using this in docs and PRs

When a design doc or ADR changes an important seam, include a **Governance Framing** section with these headings:

- `Decision type`
- `Known future pressure`
- `What stays stable`
- `What is provisional`
- `What is deferred`
- `Why this is hard or easy to reverse`

When a user-facing design doc changes, also show the inheritance path explicitly: link the parent document that governs the change, state which downstream document or module must realise it, and update the traceability section if product behaviour changed.

## Theory after practice

Good design is not prediction; it is control over change. We identify the decisions that are costly to reverse, keep those coherent, and leave the reversible parts light. That avoids both failure modes: a narrow v1 that collapses under real growth, and a bloated architecture built for futures that never arrive.

## References

- [Architecture and boundary rules](../01-architecture/ARCHITECTURE-BOUNDARY.md)
- [ADR format](./ADR-FORMAT.md) and [ADR index](../06-adrs/ADRS.md)
- [Contracts and schemas](../04-contracts/CONTRACTS-AND-SCHEMAS.md)
- [Desktop-first workspace thesis](../03-design/DESKTOP-FIRST-WORKSPACE.md)
- [Coding standards](./CODING-STANDARDS.md) · [Testing strategy](./TESTING-STRATEGY.md)
