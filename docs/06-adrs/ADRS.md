# Architecture Decision Records (ADRs)

ADRs capture significant, lasting decisions about architecture, contracts, persistence identity, the workspace format, and operational posture. Write them using [`../02-standards/ADR-FORMAT.md`](../02-standards/ADR-FORMAT.md) and review them against [`../02-standards/DESIGN-GOVERNANCE.md`](../02-standards/DESIGN-GOVERNANCE.md).

> **Status changes are PR-reviewed, never edited ad hoc on `main`.**

## The desktop-first thesis

These ADRs establish a single cross-runtime authority: **the portable workspace is canonical; the runtime database is derived.** Operations and temporal facts are the durable truth; indexes, projections, and search sidecars are rebuildable from them. Hosted PostgreSQL, where it appears at all, is an optional adapter behind the persistence interface — never the definition of truth.

## ADR set

| ADR                                                                           | Title                                                                      | Status   | Decision type             |
| ----------------------------------------------------------------------------- | -------------------------------------------------------------------------- | -------- | ------------------------- |
| [0001](./ADR-0001-workspace-is-canonical-authority.md)                        | Portable workspace is the canonical authority                              | Accepted | Invariant                 |
| [0002](./ADR-0002-portable-workspace-format.md)                               | Portable workspace folder format                                           | Accepted | Invariant + stable seam   |
| [0003](./ADR-0003-content-addressed-object-store.md)                          | Content-addressed object store for binaries                                | Accepted | Invariant + stable seam   |
| [0004](./ADR-0004-storage-engine-abstraction.md)                              | Storage-engine abstraction + single-writer queue                           | Accepted | Stable seam + provisional |
| [0005](./ADR-0005-sync-and-conflict-model.md)                                 | Sync and conflict model                                                    | Accepted | Stable seam + deferred    |
| [0006](./ADR-0006-tauri-trust-boundary-and-typed-ipc.md)                      | Tauri trust boundary and typed IPC                                         | Accepted | Invariant + stable seam   |
| [0007](./ADR-0007-deterministic-package-export.md)                            | Deterministic `.aideonpkg` export/import                                   | Accepted | Stable seam               |
| [0008](./ADR-0008-diff-compares-two-viewpoints.md)                            | Diffs compare two viewpoints; delta kind derived                           | Accepted | Stable seam               |
| [0009](./ADR-0009-temporal-model-valid-interval-layer-policy-viewpoint.md)    | Temporal model: valid-interval, layer-as-policy, viewpoint                 | Accepted | Invariant + stable seam   |
| [0010](./ADR-0010-design-system-shadcn-foundation-behind-proxy-boundary.md)   | Design system: shadcn/Tailwind foundation behind a proxy boundary          | Accepted | Lock-in + invariant       |
| [0011](./ADR-0011-module-taxonomy-and-boundaries.md)                          | Module taxonomy, boundaries, and the relationship vocabulary               | Accepted | Invariant + stable seam   |
| [0012](./ADR-0012-search-and-discovery-lexis.md)                              | Search and discovery — Lexis                                               | Accepted | Invariant + stable seam   |
| [0013](./ADR-0013-interchange-and-interoperability-pylon.md)                  | Interchange and interoperability — Pylon                                   | Accepted | Stable seam + invariant   |
| [0014](./ADR-0014-ai-assistance-and-generated-provenance-sophia.md)           | AI assistance and generated provenance — Sophia                            | Accepted | Invariant + stable seam   |
| [0015](./ADR-0015-reporting-and-publishing-kerux.md)                          | Reporting and publishing — Kerux                                           | Accepted | Invariant + stable seam   |
| [0016](./ADR-0016-error-envelope-rfc9457.md)                                  | IPC error envelope — RFC 9457 Problem Details                              | Accepted | Stable seam + invariant   |
| [0017](./ADR-0017-contract-and-dto-versioning.md)                             | Contract and DTO versioning — SemVer 2.0.0                                 | Accepted | Stable seam + invariant   |
| [0018](./ADR-0018-idempotency-and-deduplication.md)                           | Idempotency and deduplication                                              | Accepted | Invariant + stable seam   |
| [0019](./ADR-0019-observability-and-trace-context.md)                         | Observability and trace context — OpenTelemetry + W3C                      | Accepted | Stable seam + invariant   |
| [0020](./ADR-0020-integrity-scoring-model.md)                                 | Integrity scoring model                                                    | Accepted | Invariant + stable seam   |
| [0021](./ADR-0021-confidence-and-trust-scale.md)                              | Confidence and trust scale                                                 | Accepted | Invariant + stable seam   |
| [0022](./ADR-0022-hlc-clock-model.md)                                         | Asserted-time clock — Hybrid Logical Clock                                 | Accepted | Invariant + stable seam   |
| [0023](./ADR-0023-threat-model-stride-asvs.md)                                | Threat model — STRIDE + OWASP ASVS 5.0                                     | Accepted | Stable seam + invariant   |
| [0024](./ADR-0024-accessibility-baseline-wcag22.md)                           | Accessibility baseline — WCAG 2.2 AA                                       | Accepted | Invariant + stable seam   |
| [0025](./ADR-0025-design-token-architecture.md)                               | Design token architecture — W3C DTCG, tiered tokens                        | Accepted | Stable seam + invariant   |
| [0026](./ADR-0026-frontend-state-architecture.md)                             | Frontend state architecture                                                | Accepted | Stable seam + invariant   |
| [0027](./ADR-0027-projection-consistency-model.md)                            | Projection consistency model                                               | Accepted | Stable seam + invariant   |
| [0028](./ADR-0028-investment-and-portfolio-planning-kairos.md)                | Investment and portfolio planning — Kairos                                 | Accepted | Stable seam + deferred    |
| [0029](./ADR-0029-collaboration-and-sync-koinon.md)                           | Collaboration and sync — Koinon                                            | Accepted | Stable seam + deferred    |
| [0030](./ADR-0030-governance-themis.md)                                       | Governance — Themis                                                        | Accepted | Stable seam + deferred    |
| [0031](./ADR-0031-risk-controls-compliance-aegis.md)                          | Risk, controls, and compliance — Aegis                                     | Accepted | Stable seam + provisional |
| [0032](./ADR-0032-automated-discovery-reality-sync-skopos.md)                 | Automated discovery and reality-sync — Skopos                              | Accepted | Stable seam + deferred    |
| [0033](./ADR-0033-artefact-execution-model.md)                                | Artefact execution model                                                   | Accepted | Stable seam + invariant   |
| [0034](./ADR-0034-merge-correctness-and-convergence.md)                       | Merge correctness and convergence                                          | Accepted | Invariant + deferred      |
| [0035](./ADR-0035-schema-migration-and-evolution.md)                          | Schema migration and evolution — forward-only                              | Accepted | Invariant + stable seam   |
| [0036](./ADR-0036-right-to-erasure-vs-append-only.md)                         | Right to erasure vs append-only storage                                    | Accepted | Invariant + deferred      |
| [0037](./ADR-0037-contract-precedence-and-source-of-truth.md)                 | Contract precedence and source of truth                                    | Accepted | Invariant + stable seam   |
| [0038](./ADR-0038-canonical-operation-record-identity-and-commit-protocol.md) | Canonical operation record, identity, and commit protocol                  | Accepted | Invariant + stable seam   |
| [0039](./ADR-0039-typed-ipc-codegen-over-hand-maintained-manifests.md)        | Typed IPC bindings by codegen, retiring the hand-maintained manifest layer | Proposed | Stable seam               |
