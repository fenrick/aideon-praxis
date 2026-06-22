# QA red-team log — milestone build stages

Scope: milestone decomposition M0–M6 (`build-contracts/` + ROADMAP) **challenged against the full design corpus** (03-design, 01-architecture, all 39 ADRs, every 05-modules/<module>, 04-contracts, 02-standards, frontend) and the live `crates/` + `src-tauri/` + CI. Depth: full red-team, 8 parallel area reviewers. Time-to-act: plenty (M1+ open; M0 in progress).

## Passes

| Pass           | Date       | Scope                                            | Result                                                                                                            |
| -------------- | ---------- | ------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------- |
| 1 (superseded) | 2026-06-22 | build-contracts + ROADMAP only                   | Partial; skewed to UX/host thread. Raised provisional D1–D10. **Two claims later found wrong** (see corrections). |
| 2 (current)    | 2026-06-22 | full design corpus + code + CI, 8 area reviewers | Consolidated **D1–D22** + corrections C1–C2. This is the authoritative register.                                  |

## Corrections made in pass 2 (pass 1 was wrong)

- **C1** — in-window e2e is NOT main-gated; runs every PR but headless Linux WebKit only, macOS skipped → zero in-window validation on any shipped target.
- **C2** — ADR-0033 (M3 dependency) is Accepted, not Proposed; the real Proposed-vs-Accepted conflict is ADR-0039 vs 0037 (D7).

## Red-team checklist (pass 2)

| Check                                              | Result                                                                                                                                                                                               |
| -------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Every system aspect owned by exactly one milestone | **FAIL** — accepted-work spread M0/M3/M4 (D1); HLC M0+M2 (D12); integrity scorer two owners (D9); IPC/event registry mis-placed (host D-set).                                                        |
| No aspect missing from all milestones              | **FAIL** — in-window UX validation (D2); UX/shell M0–M2 (D5); 5/6 artefact forms + Mneme export/supertrait (D8); packaging (D13); retention/GC (D15); observability/threat/erasure invariants (D14). |
| Docs match built state                             | **FAIL** — SQLITE.md describes deleted prototype; M0 contract Open Questions stale post-#314 (D6); code↔design drift (D22).                                                                          |
| "Done" backed by real (non-mock) validation        | **FAIL for host/UX** — engine real; host/UX mock-only; golden journey not executed (D2/D11).                                                                                                         |
| M0 status accurate                                 | **FAIL** — reported ~done; host layer unbuilt + capability file contradicts security design (D3).                                                                                                    |
| Milestone deps acyclic / ordering forced           | **PARTIAL** — engine chain DAG-forced (PASS); Continuum's M4 placement is a product choice the DAG doesn't force, and it's needed at M0 (D1/D16).                                                    |
| Engine exit oracles real & specific                | **PASS** — M0 engine, M1, M2, M3 oracles are fixture-backed.                                                                                                                                         |
| ADR statuses consistent                            | **PASS** — 38 Accepted / 1 Proposed, all match index.                                                                                                                                                |
| Planned M4–M6 modules designed                     | **PASS** — all have design folders + ADRs; refusal seam owned at M0.                                                                                                                                 |

## Severity tally (open)

- **Critical (3):** D1 accepted-work mis-sequenced; D2 no in-window UX gate; D3 M0 host unbuilt + capability contradiction.
- **High (8):** D4 host-not-a-deliverable; D5 UX unowned M0–M2; D6 doc-vs-built drift; D7 ADR-0039↔0037; D8 orphaned artefact forms + Mneme export; D9 integrity owner; D10 task pipeline untested; D11 golden journey not executed.
- **Medium (5):** D12 HLC split; D13 packaging unowned; D14 unowned invariants; D15 retention; D16 Continuum status.
- **Low (6):** D17–D22.

## Status — design review met

This was a **design-based** review. Its criteria — single ledger, one-owner-per-aspect, contradictions resolved, clear sequencing — are **met**:

- The design contradictions are **closed**: D1 (accepted-work sequencing), D5 (UX ownership), D7 (ADR-0039↔0037), D8 (artefact-form scheduling), D9 (integrity owner), D6 (doc-vs-built truth), plus D12/D13/D14/D15/D18 assigned in the ledger.
- D16, D17, D21 were **verified to be non-defects** (not present contradictions; reconciled by D1, consistent with the dependency map, or explicitly future-conditional).
- The single build ledger [MILESTONES.md](./MILESTONES.md) exists with a one-owner-per-aspect matrix and a per-milestone validation policy.

What remains are **implementation aspects** (D2, D3, D4, D10, D11, D19, D20, D22): the design is sound and tells the build what to do; they resolve when the build reaches their milestone, tracked by issue. They are **not** open design debt.

## Next steps

Implementation proceeds milestone-by-milestone against the ledger. The next build is **M0 completion** (D3 host lifecycle + capability + accepted-work core, validated by the D2 in-window e2e gate); the design for it is settled. No further design-review action is outstanding.
