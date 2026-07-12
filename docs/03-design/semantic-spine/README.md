# The semantic spine

The semantic spine is the normative strategy-to-execution lineage along which Aideon reasons about integrity and
explainability: **Intent → Value → Capability → Execution → Technology → Change**. This folder is the design record for
it.

The spine is a **normative design model**, not a fully realised part of the seed. The seed metamodel
([`core-v1.json`](../../data/meta/core-v1.json)) implements the middle and lower reaches; the **Intent** and most of the
**Value** roles are **PLANNED**. This folder is explicit, role by role, about what exists today and what does not — per
the [Documentation Standard §12](../../02-standards/DOCUMENTATION-STANDARD.md) reconciliation mandate.

The spine is aligned to **ArchiMate 3.2** layers and to the **TOGAF Standard, 10th Edition** ADM phases (The Open Group,
ArchiMate 3.2 Specification; The Open Group, TOGAF Standard, 10th Edition).

---

## Contents

1. [The spine](./the-spine.md) — the lineage, why it exists, and what depends on it.
2. [Spine to ArchiMate mapping](./spine-to-archimate-mapping.md) — each role mapped to an ArchiMate 3.2 layer/element
   and a TOGAF ADM phase.
3. [Spine to seed types](./spine-to-seed-types.md) — implemented vs **PLANNED**, role by role, against `core-v1.json`.
4. [How the spine drives integrity and explainability](./how-the-spine-drives-integrity-and-explainability.md) — the
   link to the [integrity score](../../02-standards/DOCUMENTATION-STANDARD.md) (§8.1) and
   [ADR-0020](../../06-adrs/ADR-0020-integrity-scoring-model.md).

---

## How to read this folder

A reader who wants the concept reads [the spine](./the-spine.md). A reader checking what is actually built reads
[spine-to-seed types](./spine-to-seed-types.md). A reader implementing scoring or explanation reads
[how the spine drives integrity and explainability](./how-the-spine-drives-integrity-and-explainability.md). The
candidate types that would complete the spine are set out, marked **PROPOSED**, in the
[metamodel folder](../metamodel/proposed-spine-extension.md).

---

## References & standards

_Normative:_

- The Open Group — **ArchiMate 3.2 Specification**. The layers the spine roles map to.
- The Open Group — **TOGAF Standard, 10th Edition**. The ADM phases the spine traverses.

## Related documents

| Document                                                             | What it covers                                      |
| -------------------------------------------------------------------- | --------------------------------------------------- |
| [The metamodel](../metamodel/README.md)                              | The types the spine roles are realised by.          |
| [Proposed spine extension](../metamodel/proposed-spine-extension.md) | The PROPOSED package that would complete the spine. |
| [Edge catalogue](../../05-modules/praxis/edge-catalogue/README.md)   | The relationships that form the spine's links.      |
| [DESIGN.md](../DESIGN.md)                                            | The product framing of the spine.                   |
