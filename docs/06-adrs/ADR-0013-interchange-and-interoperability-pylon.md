# ADR-0013: Interchange and Interoperability — Pylon

- Status: Accepted
- Date: 2026-06-11
- Depends-On: ADR-0001, ADR-0011
- Relates-To: ADR-0007, ADR-0015

## Context

A digital twin is rarely greenfield. Organisations arrive with models in other enterprise-architecture tools,
spreadsheets of applications and dependencies, and exports in standard formats. The product needs a disciplined way to
import that material without contaminating canonical truth, and to export without leaking what should not leave. Two
failure modes matter: a non-deterministic import that produces different results on re-run (so the import cannot be
reviewed or trusted), and an export that ships sensitive content because redaction was opt-in.

This ADR introduces **Pylon**, the planned interchange module
([ADR-0011](./ADR-0011-module-taxonomy-and-boundaries.md)). It is design intent until a crate exists. Pylon is distinct
from the deterministic `.aideonpkg` package export ([ADR-0007](./ADR-0007-deterministic-package-export.md)): packages
move a workspace between Aideon installs; Pylon moves models between Aideon and the wider EA ecosystem.

## Governance Framing

- **Decision type:** Stable seam (the interchange format contract and the import-review contract) + invariant (imports
  are deterministic and reviewable; export redaction is deny-by-default).
- **Known future pressure:** more EA-tool connectors; format version drift in ArchiMate exchange; large imports; mapping
  ambiguity as the metamodel grows.
- **What stays stable:** ArchiMate Model Exchange File Format is the lingua franca; imports compile to reviewable
  operations and are deterministic; export redaction is deny-by-default.
- **What is provisional:** the specific connectors, the CSV/Excel column conventions, and the mapping tables from
  external schemas to the seed metamodel.
- **What is deferred:** bidirectional live sync with external tools; round-trip fidelity guarantees beyond the exchange
  format's own.
- **Why hard to reverse:** the exchange format choice and the import-review contract are interoperability commitments
  partners build against; the connector implementations are replaceable.

## Decision

- **The ArchiMate Model Exchange File Format is the interchange lingua franca** (The Open Group, ArchiMate Model
  Exchange File Format). It is the primary import and export format, chosen because it is a published, vendor-neutral
  standard aligned with the seed metamodel's ArchiMate vocabulary
  ([ADR-0011](./ADR-0011-module-taxonomy-and-boundaries.md)). CSV/Excel and direct EA-tool connectors are secondary
  on-ramps that map onto the same internal representation.

- **Imports are deterministic.** Given the same source file, metamodel, and mapping configuration, an import produces
  the same set of operations every time. Determinism is what makes an import reviewable: the same input yields the same
  diff, so a steward can inspect what will change before it is accepted.

- **Imports compile to reviewable operations, not direct writes.** A Pylon import produces a proposed batch of
  operations and a mapping report — what mapped cleanly, what was ambiguous, and what was rejected. Ambiguous or
  unmapped material is surfaced as `Awaiting review` per
  [DOCUMENTATION-STANDARD.md §9](../02-standards/DOCUMENTATION-STANDARD.md), not silently dropped or guessed. Acceptance
  writes the operations through the normal canonical path; imported content is Asserted with import lineage as its
  corroboration.

- **Export redaction is deny-by-default.** An export emits only what a redaction policy explicitly permits. Sensitive
  slots (for example `DataEntity` `sensitivity`) and any content the policy excludes are removed before the file is
  written, not after. This mirrors the filtered-export posture of
  [ADR-0006](./ADR-0006-tauri-trust-boundary-and-typed-ipc.md): sharing safety is enforced at export, not left to the
  recipient.

- **Exports preserve the executing viewpoint.** An export is taken at a stated `Viewpoint` and records it, so a
  recipient knows the as-of valid time, layer policy, and scenario the export represents. An export is a snapshot
  through a viewpoint, never an undated dump.

- **Pylon is an engine and depends on no other engine** ([ADR-0011](./ADR-0011-module-taxonomy-and-boundaries.md)). The
  host composes Pylon with Mneme (canonical reads/writes) and Chrona (viewpoint resolution for export).

## Considered Options

- **A proprietary interchange format (rejected):** simpler to control, but defeats the point of interoperability; the
  published ArchiMate exchange format is the lower-friction commitment.
- **Direct-write imports (rejected):** faster, but unreviewable and unable to surface ambiguity; compiling to a
  reviewable operation batch is the auditable path consistent with the op-log model.
- **Opt-in redaction (rejected):** one forgotten flag leaks data; deny-by-default fails safe.

## Consequences

- A worked example: importing an ArchiMate exchange file maps its Application elements to seed `Application` entities
  and its Serving relationships to `serves`/`realises` per the canonical vocabulary
  ([ADR-0011](./ADR-0011-module-taxonomy-and-boundaries.md)); unmapped elements appear in the mapping report
  `Awaiting review`.
- Re-running an import over an unchanged source produces an empty diff, which is the determinism guarantee made
  observable.
- Round-trip fidelity is bounded by the exchange format and by what the redaction policy permitted to leave; this is
  stated, not implied.
- Pylon and Kerux ([ADR-0015](./ADR-0015-reporting-and-publishing-kerux.md)) share the deny-by-default redaction
  discipline.

## Follow-ups / Open Questions

- The mapping tables from common EA-tool schemas to the seed metamodel.
- How the redaction policy is expressed and versioned, and its relationship to Kerux's policy.
- Handling of ArchiMate concepts with no seed equivalent (extension vs rejection).

## References & standards

- The Open Group — **ArchiMate Model Exchange File Format** _(normative: interchange)_.
- The Open Group — **ArchiMate 3.2 Specification** _(informative: element and relationship mapping)_.

## Related documents

| Document                                                 | What it covers                                                  |
| -------------------------------------------------------- | --------------------------------------------------------------- |
| [ADR-0007](./ADR-0007-deterministic-package-export.md)   | The Aideon-to-Aideon package format, distinct from interchange. |
| [ADR-0011](./ADR-0011-module-taxonomy-and-boundaries.md) | The module taxonomy and canonical relationship vocabulary.      |
| [ADR-0015](./ADR-0015-reporting-and-publishing-kerux.md) | Kerux, which shares the deny-by-default redaction discipline.   |
