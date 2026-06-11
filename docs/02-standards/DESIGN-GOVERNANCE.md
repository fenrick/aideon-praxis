# Design Governance

How Aideon Desktop makes durable design decisions, classifies them, and reviews changes against them — so the product ships a coherent v1 without trapping itself in a short-lived shape or disappearing into speculative platform work. This document is for anyone proposing or reviewing a change to architecture, contracts, persistence, security, or module boundaries.

This is a standing review document, not optional reading for major design changes. It governs _how_ decisions are made and recorded; the decisions themselves live in [ADRs](../06-adrs/ADRS.md), framed by the headings this document defines. It does not set documentation form — that is the [Documentation Standard](./DOCUMENTATION-STANDARD.md) — nor the bibliography, which is the [Standards Register](./STANDARDS-REGISTER.md).

---

## Contents

1. [The goal](#1-the-goal)
2. [When this review is required](#2-when-this-review-is-required)
3. [Practical rules](#3-practical-rules)
4. [The invariants](#4-the-invariants)
5. [The design labels](#5-the-design-labels)
6. [Deprecation and sunset lifecycle](#6-deprecation-and-sunset-lifecycle)
7. [Change-impact and reversibility rubric](#7-change-impact-and-reversibility-rubric)
8. [Using this in docs and PRs](#8-using-this-in-docs-and-prs)
9. [Traceability to ADRs](#9-traceability-to-adrs)
10. [References & standards](#references--standards)
11. [Related documents](#related-documents)

---

## 1. The goal

Good design is not prediction; it is control over change. The aim is threefold and the three pull against each other:

- ship a good v1;
- avoid design choices already known to hurt later;
- keep future flexibility in the seams, not in layers of guesswork.

The two failure modes this governance avoids are a narrow v1 that collapses under real growth, and a bloated architecture built for futures that never arrive. The method is to identify the decisions that are costly to reverse, keep those coherent, and leave the reversible parts light.

---

## 2. When this review is required

Any change that affects architecture, contracts, workflow semantics, persistence identities, security boundaries, the **workspace format**, or module responsibilities must be reviewed against this document. That includes:

- new module boundaries, or changes to a module's responsibility ([ADR-0011](../06-adrs/ADR-0011-module-taxonomy-and-boundaries.md));
- changes to public DTOs, IPC commands, or the error envelope ([ADR-0016](../06-adrs/ADR-0016-error-envelope-rfc9457.md));
- new persistence or migration patterns, or changes to the **canonical workspace format** ([ADR-0002](../06-adrs/ADR-0002-portable-workspace-format.md));
- new accepted-work / run-ledger semantics;
- changes to event models, or to idempotency/deduplication contracts ([ADR-0018](../06-adrs/ADR-0018-idempotency-and-deduplication.md));
- changes to time, scenario, or layer semantics ([ADR-0009](../06-adrs/ADR-0009-temporal-model-valid-interval-layer-policy-viewpoint.md));
- changes to the storage-engine abstraction or the derived-runtime contract ([ADR-0004](../06-adrs/ADR-0004-storage-engine-abstraction.md));
- any decision that would be expensive to reverse after adoption (§7).

If a design doc, ADR, or major PR does not make that review visible, it is incomplete.

---

## 3. Practical rules

1. **Build v1, but design the seam for longer.** Implementation solves the problem in front of us; the seam should survive beyond the first implementation. Good: a storage trait that supports SQLite now and redb/RocksDB later; a workspace format that works before and after sync exists. Bad: a one-off payload "because we only need it for v1"; UI state that quietly becomes the system of record.
2. **Design invariants early** (§4).
3. **Keep provisional decisions visibly provisional.** State what was chosen for now, why it is good enough, and what future pressure will change it. Hidden provisional design is how temporary shortcuts turn into accidental architecture.
4. **Do not abstract for imagined versions.** Add abstraction only when there is more than one real caller, a known second implementation shape, or a genuinely high reversal cost.
5. **Name the future pressure.** "It might matter later" is not good enough.
6. **Separate hard-to-reverse from easy-to-reverse decisions.** Spend effort where reversibility is low: public contracts, the workspace format, persistence IDs, module boundaries, security boundaries, accepted-work semantics, event/error envelopes.
7. **Prefer stable seams over premature platforms.** A clear contract, a narrow boundary, one good implementation — not a plugin system without plugins.
8. **Make review explicit.** State what is invariant, what is a stable seam, what is provisional, what is deferred, and what is expensive to change later (§5, §8).
9. **Show design lineage, not just agreement.** Parent documents drive child documents explicitly: Product Brief → HIG → design/UX → design system → module briefs. If a child document cannot show what it inherited and how it applies that inheritance, the design stack is still loose.

---

## 4. The invariants

These should hold beyond the current implementation. Changing one forces wide refactors or breaks the product model, so each is a deliberate, ADR-backed commitment — not a default that drifts.

| Invariant                                                                                                                                                                               | Stated by                                                                                                                                                                                            |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| The portable **workspace** is the canonical authority — append-only operations plus schema-as-data; content-addressed blobs are truth; the runtime database is derived and rebuildable. | [ADR-0001](../06-adrs/ADR-0001-workspace-is-canonical-authority.md), [ADR-0002](../06-adrs/ADR-0002-portable-workspace-format.md), [ADR-0003](../06-adrs/ADR-0003-content-addressed-object-store.md) |
| **Explicit time and scenario context** on every read and write — valid time, asserted time, layer, optional scenario.                                                                   | [ADR-0009](../06-adrs/ADR-0009-temporal-model-valid-interval-layer-policy-viewpoint.md)                                                                                                              |
| **Contracts-first boundaries** — the Rust core owns the wire shape; the renderer consumes generated types.                                                                              | [ADR-0006](../06-adrs/ADR-0006-tauri-trust-boundary-and-typed-ipc.md), [ADR-0017](../06-adrs/ADR-0017-contract-and-dto-versioning.md)                                                                |
| **Host owns side effects** — the renderer is untrusted and disposable; no renderer filesystem access, no local HTTP server as the primary seam.                                         | [ADR-0006](../06-adrs/ADR-0006-tauri-trust-boundary-and-typed-ipc.md), [ADR-0023](../06-adrs/ADR-0023-threat-model-stride-asvs.md)                                                                   |
| **Durable accepted-work / run-ledger semantics**, persisted in the workspace, not in a hosted service.                                                                                  | [ADR-0018](../06-adrs/ADR-0018-idempotency-and-deduplication.md), [accepted-work contract](../04-contracts/accepted-work-and-events/README.md)                                                       |
| **Replaceable storage engine** behind a stable trait; a single-writer queue per workspace.                                                                                              | [ADR-0004](../06-adrs/ADR-0004-storage-engine-abstraction.md)                                                                                                                                        |
| **Canonical semantic relationship meanings** — the edge catalogue is authoritative and ArchiMate-aligned.                                                                               | [EDGE-CATALOGUE](../05-modules/praxis/EDGE-CATALOGUE.md), [ADR-0011](../06-adrs/ADR-0011-module-taxonomy-and-boundaries.md)                                                                          |

An invariant is changed only by superseding the ADR that fixed it, with a migration plan for the stored material and contracts that depend on it.

---

## 5. The design labels

Use these in design docs, ADRs, and major PR write-ups. They classify a decision by how its shape relates to change.

- **Invariant** — should hold beyond the current implementation; changing it later forces wide refactors or breaks the product model (§4).
- **Stable seam** — the public shape stays stable even if the implementation changes (shared DTOs, the storage trait, the workspace format, the IPC surface, run-ledger entities, event envelopes, the error envelope).
- **Provisional** — chosen for now, expected to change, still documented on purpose (e.g. SQLite as the only storage backend before a second backend exists).
- **Deferred** — not solved yet, an intentional boundary (e.g. remote-sync conflict resolution, encryption envelopes, plugin packaging, hosted authentication).

A label is a commitment about reversibility, not a confidence level. A provisional decision can be held with high confidence; a stable seam can still be wrong — the label says what changing it would cost, and §7 makes that cost explicit.

---

## 6. Deprecation and sunset lifecycle

A stable seam that can never be retired is a liability disguised as a guarantee. Every public seam — a DTO field, an IPC command, an error code, an event type, a workspace-schema element — moves through an explicit lifecycle so consumers always know what they may rely on and for how long. The lifecycle is the operational counterpart to the SemVer policy ([ADR-0017](../06-adrs/ADR-0017-contract-and-dto-versioning.md)): SemVer says _which kind of version bump_ a change requires; this lifecycle says _what must happen before_ that bump.

| State          | Meaning                                                     | Consumer obligation                                                     | Version effect                                                                     |
| -------------- | ----------------------------------------------------------- | ----------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| **Active**     | The supported, recommended shape.                           | Use it.                                                                 | —                                                                                  |
| **Deprecated** | Still works; a successor exists; removal is announced.      | Migrate to the successor; new code must not adopt the deprecated shape. | Marked in a MINOR ([ADR-0017](../06-adrs/ADR-0017-contract-and-dto-versioning.md)) |
| **Sunset**     | A removal date or release is fixed; the shape is on notice. | Complete migration before the stated boundary.                          | Removal scheduled for the next MAJOR                                               |
| **Removed**    | Gone from the contract.                                     | None — references are now errors.                                       | MAJOR                                                                              |

Rules:

- A public seam **must** be marked Deprecated for at least one MINOR release before a MAJOR removes it ([ADR-0017](../06-adrs/ADR-0017-contract-and-dto-versioning.md)). A field or command **must not** jump from Active to Removed.
- A deprecation **must** name its successor and the migration path, or state explicitly that there is none and why.
- A deprecated shape **must** keep working unchanged until removal — deprecation announces intent, it does not degrade behaviour.
- Stored material that records the version that wrote it ([ADR-0002](../06-adrs/ADR-0002-portable-workspace-format.md)) lets a newer host detect and migrate a deprecated workspace element; a removed element in stored material **must** have a migration, because a user's workspace cannot be edited out from under them.
- A **stable error code** is part of the contract: renaming or removing it follows the same lifecycle and is a MAJOR change ([ADR-0016](../06-adrs/ADR-0016-error-envelope-rfc9457.md)).
- The deprecation window length is provisional (≥ one MINOR is the floor; [ADR-0017](../06-adrs/ADR-0017-contract-and-dto-versioning.md) follow-up).

This lifecycle is design intent: the tooling that marks and reports deprecations across the IPC manifest is not yet built. Until it is, deprecations are recorded in the owning contract document and the [ADR index](../06-adrs/ADRS.md).

---

## 7. Change-impact and reversibility rubric

Rule 6 (§3) says to separate hard-to-reverse from easy-to-reverse decisions. This rubric makes "hard to reverse" assessable rather than asserted, so two reviewers reach the same classification. It scores a proposed change on three factors and combines them into a reversibility tier that sets the review effort the change is due.

The scoring shape is adapted from the **OWASP Risk Rating Methodology** (likelihood × impact, scored on ordinal factors) — applied here not to security risk but to _design reversibility_: the "impact" of getting a decision wrong and the "likelihood" that it must later change _(OWASP, Risk Rating Methodology — informative)_.

**Factor 1 — Blast radius** (how much must change to reverse the decision):

| Score | Blast radius                                                                                                                     |
| ----- | -------------------------------------------------------------------------------------------------------------------------------- |
| 1     | Internal to one module; no public shape changes.                                                                                 |
| 2     | One public seam within a module; one consumer.                                                                                   |
| 3     | A cross-module contract; several consumers in-tree.                                                                              |
| 4     | A public seam embedded in stored workspaces, the IPC manifest, or crate metadata — out-of-tree consumers and existing user data. |

**Factor 2 — Data permanence** (whether reversing touches material already written):

| Score | Data permanence                                                                                                                                                                  |
| ----- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1     | No stored material; purely in-memory or derived (rebuildable).                                                                                                                   |
| 2     | Derived runtime only; rebuildable from canonical material ([ADR-0001](../06-adrs/ADR-0001-workspace-is-canonical-authority.md)).                                                 |
| 3     | Canonical material with a forward-only migration available.                                                                                                                      |
| 4     | Canonical material with no clean migration — operations, persistence IDs, or blob addresses ([ADR-0003](../06-adrs/ADR-0003-content-addressed-object-store.md)) already written. |

**Factor 3 — Coordination cost** (how many parties must agree to reverse):

| Score | Coordination cost                                                                                                                                      |
| ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1     | One author; one PR.                                                                                                                                    |
| 2     | One team; one release.                                                                                                                                 |
| 3     | Multiple consumers must update in lockstep; a deprecation window (§6).                                                                                 |
| 4     | Field upgrades — users' hosts and workspaces of different versions must interoperate ([ADR-0017](../06-adrs/ADR-0017-contract-and-dto-versioning.md)). |

**Combine** the three (take the highest, then raise a tier if two or more factors are ≥ 3) into a reversibility tier:

| Tier         | Factor profile                 | Review effort due                                                                                                                                   |
| ------------ | ------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Easy**     | all factors 1–2                | Normal PR review; record the label (§5).                                                                                                            |
| **Moderate** | any factor = 3                 | Design note with the Governance Framing headings (§8); a named reviewer for the affected seam.                                                      |
| **Hard**     | any factor = 4, or two+ at ≥ 3 | An ADR ([ADR-FORMAT.md](./ADR-FORMAT.md)) with full Governance Framing, considered options, and a migration plan; sign-off from the boundary owner. |

A change scored **Hard** is the kind §4 protects: it touches an invariant, a canonical-material shape, or a field-upgrade contract. The rubric does not forbid such changes — it ensures they are made deliberately, with the cost named and an ADR on the record.

**Worked example.** Adding an optional `recovery` member to the IPC error envelope ([ADR-0016](../06-adrs/ADR-0016-error-envelope-rfc9457.md)): blast radius 3 (a cross-module contract, but additive), data permanence 1 (the envelope is not stored as canonical material), coordination cost 2 (older renderers ignore unknown fields). Highest factor 3, no second factor ≥ 3 → **Moderate**: a design note, not a fresh ADR — which is exactly how that change was handled as a MINOR under [ADR-0017](../06-adrs/ADR-0017-contract-and-dto-versioning.md). By contrast, renaming the stable code `BACKPRESSURE` scores blast radius 4 (stored in logs and the manifest) and coordination cost 4 (field upgrades) → **Hard**: a MAJOR bump and an ADR.

---

## 8. Using this in docs and PRs

When a design doc or ADR changes an important seam, include a **Governance Framing** section with these headings — the same set the [ADR format](./ADR-FORMAT.md) requires:

- `Decision type` — the label(s) from §5.
- `Known future pressure` — the named pressure (rule 5), not "might matter later".
- `What stays stable`
- `What is provisional`
- `What is deferred`
- `Why this is hard or easy to reverse` — backed by the §7 rubric tier where the change is Moderate or Hard.

When a user-facing design doc changes, also show the inheritance path explicitly: link the parent document that governs the change, state which downstream document or module must realise it, and update the traceability section if product behaviour changed.

---

## 9. Traceability to ADRs

Governance is only real if a reader can trace a decision from this document to the ADR that fixed it and the contract or module that realises it. The chain runs **invariant or seam (here) → ADR (the decision) → contract/module (the realisation)**. The table below traces the governed concerns this document names; the full decision list is the [ADR index](../06-adrs/ADRS.md).

| Governed concern                     | Decision                                                                                                                          | Realised in                                                                                                                  |
| ------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| Canonical authority of the workspace | [ADR-0001](../06-adrs/ADR-0001-workspace-is-canonical-authority.md), [ADR-0002](../06-adrs/ADR-0002-portable-workspace-format.md) | [Mneme](../05-modules/mneme/README.md)                                                                                       |
| Content-addressed blobs              | [ADR-0003](../06-adrs/ADR-0003-content-addressed-object-store.md)                                                                 | [Mneme](../05-modules/mneme/README.md), [security/blobs-and-integrity.md](./security/blobs-and-integrity.md)                 |
| Storage-engine abstraction           | [ADR-0004](../06-adrs/ADR-0004-storage-engine-abstraction.md)                                                                     | [Mneme runtime & engine](../05-modules/mneme/RUNTIME-AND-ENGINE.md)                                                          |
| Trust boundary and typed IPC         | [ADR-0006](../06-adrs/ADR-0006-tauri-trust-boundary-and-typed-ipc.md)                                                             | [Host](../05-modules/host/README.md), [security/](./security/README.md)                                                      |
| Temporal model and viewpoint         | [ADR-0009](../06-adrs/ADR-0009-temporal-model-valid-interval-layer-policy-viewpoint.md)                                           | [Chrona](../05-modules/chrona/README.md), [temporal contract](../04-contracts/TEMPORAL-AND-SCENARIO-CONTEXT.md)              |
| Module taxonomy and boundaries       | [ADR-0011](../06-adrs/ADR-0011-module-taxonomy-and-boundaries.md)                                                                 | [Module READMEs](../05-modules/)                                                                                             |
| Error envelope                       | [ADR-0016](../06-adrs/ADR-0016-error-envelope-rfc9457.md)                                                                         | [Coding standards](./CODING-STANDARDS.md), [contracts](../04-contracts/CONTRACTS-AND-SCHEMAS.md)                             |
| Contract & DTO versioning            | [ADR-0017](../06-adrs/ADR-0017-contract-and-dto-versioning.md)                                                                    | This document §6, [contracts](../04-contracts/CONTRACTS-AND-SCHEMAS.md)                                                      |
| Idempotency & deduplication          | [ADR-0018](../06-adrs/ADR-0018-idempotency-and-deduplication.md)                                                                  | [Continuum](../05-modules/continuum/README.md), [accepted-work contract](../04-contracts/accepted-work-and-events/README.md) |
| Observability & trace context        | [ADR-0019](../06-adrs/ADR-0019-observability-and-trace-context.md)                                                                | [Host observability](../05-modules/host/observability.md), [security/audit-and-logging.md](./security/audit-and-logging.md)  |
| Threat model                         | [ADR-0023](../06-adrs/ADR-0023-threat-model-stride-asvs.md)                                                                       | [security/threat-model.md](./security/threat-model.md)                                                                       |
| Accessibility baseline               | [ADR-0024](../06-adrs/ADR-0024-accessibility-baseline-wcag22.md)                                                                  | [frontend](../frontend/DESIGN.md)                                                                                            |

---

## References & standards

_Informative:_

- OWASP — **Risk Rating Methodology** (likelihood × impact on ordinal factors). _(the scoring shape adapted for the §7 reversibility rubric)_
- Nygard — **Architecture Decision Records**; **MADR**. _(the decision-record shape this governance feeds — see [ADR-FORMAT.md](./ADR-FORMAT.md))_

Recorded in the [standards register](./STANDARDS-REGISTER.md).

## Related documents

| Document                                                                       | What it covers                                               |
| ------------------------------------------------------------------------------ | ------------------------------------------------------------ |
| [Documentation Standard](./DOCUMENTATION-STANDARD.md)                          | How these documents are written, structured, and cited.      |
| [ADR format](./ADR-FORMAT.md) and [ADR index](../06-adrs/ADRS.md)              | The required shape of a decision record, and every decision. |
| [Standards Register](./STANDARDS-REGISTER.md)                                  | The shared bibliography these documents cite.                |
| [Architecture and boundary rules](../01-architecture/ARCHITECTURE-BOUNDARY.md) | The canonical layers, adapters, and time-first boundaries.   |
| [Contracts and schemas](../04-contracts/CONTRACTS-AND-SCHEMAS.md)              | The typed shapes the seams expose and version.               |
| [Coding standards](./CODING-STANDARDS.md)                                      | How these rules apply to code at the boundary.               |
| [Testing strategy](./TESTING-STRATEGY.md)                                      | How the seams and invariants are tested.                     |
| [Desktop-first workspace thesis](../03-design/DESKTOP-FIRST-WORKSPACE.md)      | Why the workspace is the canonical authority.                |
