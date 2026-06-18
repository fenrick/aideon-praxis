# ADR-0007: Deterministic `.aideonpkg` Export and Import

- Status: Accepted
- Date: 2026-06-10
- Depends-On: ADR-0002, ADR-0003

## Context

A loose workspace folder is right for day-to-day work; exchange and archival want a single deterministic artefact. A package format must be self-contained, verifiable, and byte-reproducible: reproducible-archive practice shows embedded mtimes and unstable archive metadata are the common causes of hash instability between successive exports of the same content.

The package is a transport detail, not a second source of truth. Import always goes through the normal open path.

## Governance Framing

- **Decision type:** Stable seam (package layout + determinism rules).
- **Known future pressure:** signing/verification of packages; optional encryption; partial exports.
- **What stays stable:** packages contain canonical content by default; projections are optional and rebuildable; archives are byte-reproducible where possible.
- **What is provisional:** inclusion of projection snapshots for faster first-open.
- **What is deferred:** filtered/redacted exports, encryption envelopes, and signing/verification for packages.
- **Why easy to reverse:** import always goes through the normal open path, so the package is a transport detail, not a second source of truth.

## Decision

- Export produces a deterministic ZIP-style `*.aideonpkg`:

  ```text
  project-YYYY-MM-DD.aideonpkg
    manifest.json
    model/ops/   model/schema/
    objects/sha256/
    checksums/sha256.txt
    optional/projection-snapshots/   # optional, ignorable, rebuildable
  ```

- **Seal the loose op segment before export** so the archive is self-consistent.
- **Determinism:** normalise mtimes, sort paths, set stable permissions, strip incidental ZIP extra attributes. Exporting the same sealed workspace twice yields identical package metadata.
- **By default include only canonical content.** Projection snapshots are optional and the importer must be able to ignore or rebuild them.
- **Import unpacks, validates, and first-opens through the normal kernel path** — no special import-only state.

## Consequences

- Exports are auditable and diffable; checksums let a recipient verify integrity.
- `.aideon/runtime/` is never part of a package.
- Filtered exports (sharing a subset) and encryption are deferred but the format leaves room.
