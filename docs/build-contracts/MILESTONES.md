# Milestones — the single build ledger

The one place that says, per milestone: **what it requires**, **which system aspects it owns**, **how it is validated**, and **its implementation status**. It links out to the per-milestone build contracts (the detail) and to the [defect register](./defect-register.md) (the open conflicts). The governing rule:

> **Every system aspect is owned by exactly one milestone — none spread, none missing.** Where the design previously smeared an aspect across milestones, the resolution is recorded here and in the register.

This ledger is the answer to "how is the product built, what is done when, and why". It is the product of the full-corpus challenge-review ([qa-red-team-log](./qa-red-team-log.md)); the milestone _capability gates_ remain in [ROADMAP](../00-index/ROADMAP.md) and the executable detail in each `M*-*.md` contract.

Status legend: ✅ built + validated · ◐ partial / in progress · ☐ not started.

---

## Aspect-ownership matrix

Each row is owned by exactly one milestone. "Validated by" states the **real** gate (not mock-layer). The square-bracket tags link the resolved defect.

| System aspect                                                                                                        | Owner | Validated by                                                                          | Status |
| -------------------------------------------------------------------------------------------------------------------- | ----- | ------------------------------------------------------------------------------------- | ------ |
| Canonical op log + storage format                                                                                    | M0    | `mneme_store` integration tests (real FS)                                             | ✅     |
| Canonical JSON + record identity + digest                                                                            | M0    | `mneme_core` tests + authored fixtures                                                | ✅     |
| HLC asserted-time clock (M2 _consumes_, does not rebuild) [D12]                                                      | M0    | `mneme_core::time` tests                                                              | ✅     |
| Content-addressed blobs                                                                                              | M0    | `mneme_store::blob` tests                                                             | ✅     |
| Derived runtime + rebuild + `foundation_rebuild_hash`                                                                | M0    | `m0_exit` wipe→rebuild equivalence (engine; host-path = accepted-work row)            | ✅     |
| Workspace lifecycle + single-writer lock                                                                             | M0    | Tier-1 host boundary test (lifecycle) + crate tests [ADR-0040]                        | ◐      |
| Minimal accepted-work core (job runner, RunEvent, readiness, backpressure) [D1]                                      | M0    | Tier-1 host boundary test — proof-carrying readiness round-trip [D4·ADR-0040]         | ☐      |
| Typed IPC surface + capability enforcement + **codegen** manifest [D7]                                               | M0    | Tier-1 host boundary test (round-trip, per-window deny, drift) [D4·ADR-0040]          | ☐      |
| Shell chrome + lifecycle/honest-state UX [D5]                                                                        | M0    | Tier-2 in-window: Win/Linux interaction · macOS launch-smoke+screenshot [D2·ADR-0040] | ☐      |
| Observability / trace-context baseline [D14]                                                                         | M0    | correlation-id propagation test                                                       | ☐      |
| Metamodel — authored/structural (materialise `authored/`)                                                            | M0    | `mneme_core` schema fixtures                                                          | ✅     |
| Metamodel — effective compile + validation                                                                           | M1    | effective-schema fixtures + rejection tests                                           | ☐      |
| Change Event / task authoring pipeline [D10]                                                                         | M1    | task-first multi-op atomicity test                                                    | ☐      |
| Authoring + inspector UX [D5]                                                                                        | M1    | in-Tauri-window e2e                                                                   | ☐      |
| Temporal resolution / viewpoint / layer / scenario / diff                                                            | M2    | resolution vector suite                                                               | ☐      |
| Viewpoint / time-control UX [D5]                                                                                     | M2    | in-Tauri-window e2e                                                                   | ☐      |
| Catalogue artefact execution                                                                                         | M3    | catalogue result oracle                                                               | ☐      |
| Bounded analytics (Metis)                                                                                            | M3    | bounds/`approximated`/`truncated` tests                                               | ☐      |
| Integrity scoring (**Praxis**, not Metis) [D9]                                                                       | M3    | integrity gate-outcome test                                                           | ☐      |
| Catalogue view UX [D5]                                                                                               | M3    | in-Tauri-window e2e                                                                   | ☐      |
| Packaging / cross-platform / signing (shippable MVP) [D13]                                                           | M3    | signed bundle on each shipped target                                                  | ☐      |
| Interchange: Pylon import + **Mneme export/package** [D8] + Continuum **full** accepted-work orchestration           | M4    | (build contract pending)                                                              | ☐      |
| Other artefact forms: view / map / matrix [D8]                                                                       | M4    | (build contract pending)                                                              | ☐      |
| Reach: Lexis search · Kerux reporting · Sophia AI; **report / page** artefact forms [D8]                             | M5    | (build contract pending)                                                              | ☐      |
| Scale-out: Koinon sync/CRDT · Themis governance/RBAC · Aegis · Skopos · Kairos; op-log retention/compaction/GC [D15] | M6    | (build contract pending)                                                              | ☐      |

**Cross-cutting gates (apply to every milestone, owned by none):** the security boundary (no renderer HTTP, no open ports, CSP); accessibility WCAG 2.2 AA on every UX surface [D14]; the **golden journey runs as an executable gate**, not a document [D11]; **mock-layer tests never satisfy a UX gate** — the benchmark is the components running in the real Tauri window [D2]. In-window validation follows the **two-tier gate** ([ADR-0040](../06-adrs/ADR-0040-m0-host-validation-gate-and-proof-carrying-readiness.md)): a portable real-host boundary test (actual Tauri handlers, no jsdom/mock) is the hard merge gate on all three shipped targets; WebDriver interaction is Windows + Linux; macOS is launch-smoke + screenshot artefacts (**never a silent skip**). The `in-Tauri-window e2e` rows above (M1 authoring, M2 time, M3 catalogue) follow this same two-tier pattern.

---

## Per-milestone

### M0 — Foundation · **in progress** ◐

[contract](./M0-foundation.md) · capability gate: a portable workspace opens, round-trips, and rebuilds losslessly; typed IPC + capabilities enforced; no open ports.

- **Owns:** canonical storage/JSON/HLC/blobs/rebuild · workspace lifecycle + lock · minimal accepted-work core [D1] · typed IPC + capability + codegen manifest [D7] · shell + lifecycle UX [D5] · observability baseline · authored metamodel.
- **Done (✅):** the three engine crates (`mneme_core`, `mneme_store`, `engine`) with real, non-mock oracle tests (#314).
- **Outstanding (☐/◐):** host `workspace_*` lifecycle IPC + capability enforcement (#290/#318) · accepted-work core (#316) · codegen migration (#322) · shell renders as a set + lifecycle UX proven **in the Tauri window** (#317/#320) · host-boundary e2e (#319).
- **Exit gate:** crate oracles **plus** the golden-journey lifecycle steps (1, 8, 9, 10) executed in the real window. Not met yet.

### M1 — Meaning · ☐

[contract](./M1-meaning.md) · gate: authoring validates against the metamodel; invalid writes rejected at the boundary; metamodel compiles deterministically as data.

- **Owns:** effective-schema compile + validation · Change Event/task pipeline [D10] · authoring + inspector UX [D5].
- **Exit gate:** effective-schema fixtures + rejection tests **plus** authoring/inspector proven in the Tauri window.

### M2 — Time · ☐

[contract](./M2-time.md) · gate: every read viewpoint-qualified; `state-at` and `diff` resolve across valid/asserted time, layers, scenarios.

- **Owns:** temporal resolution/diff (consumes the M0 HLC) · viewpoint/time-control UX [D5].
- **Exit gate:** resolution vector suite **plus** the time control proven in the Tauri window.

### M3 — Artefacts + analytics · ☐ · **end of MVP**

[contract](./M3-artefacts.md) · gate: one catalogue artefact renders deterministically; bounded analytics report bounds honestly.

- **Owns:** catalogue execution · bounded analytics · integrity scoring (**Praxis** [D9]) · catalogue view UX [D5] · packaging/signing as the shippable-MVP gate [D13].
- **Exit gate:** catalogue oracle + analytics-bounds tests + integrity gate **plus** the catalogue view proven in the Tauri window **plus** a signed bundle on each shipped target.

### M4 — Interchange · ☐ (no build contract yet)

Pylon import + **Mneme op-log export/deterministic package** [D8] + **Continuum full accepted-work orchestration** (durable run-ledger, retries, scheduling, queue classes, connectors — supersedes the M0 core [D1]) + artefact forms **view/map/matrix** [D8].

### M5 — Reach · ☐ (no build contract yet)

Lexis viewpoint-aware search · Kerux reporting/publishing with redaction · Sophia AI behind guardrails (all output `Generated`) · artefact forms **report/page** (depend on Sophia) [D8].

### M6 — Scale-out · ☐ (no build contract yet)

Koinon multi-user sync + CRDT convergence · Themis identity/RBAC/approvals/audit · Aegis · Skopos · Kairos · governed op-log retention/compaction/GC [D15].

---

## Validation policy (per milestone)

1. **Engine aspects** are validated by **real** integration oracles (true filesystem + SQLite + fixtures) — no mocks. These exist and pass for M0's engine.
2. **Host + UX aspects** are validated by **in-Tauri-window e2e** (tauri-driver), asserting the assembled shell composes and at least one interaction works, on the **shipped** webview targets. A jsdom/Storybook/static-export/IPC-boundary test is a unit test with a mock layer and **does not** satisfy a host or UX gate [D2].
3. **The golden journey** for the milestone's segment must be **executed** in CI, not merely documented [D11].
4. A milestone is complete only when all three hold on the seed dataset. M0 currently meets (1) only.

---

## Related documents

| Document                                                                                        | What it covers                                          |
| ----------------------------------------------------------------------------------------------- | ------------------------------------------------------- |
| [ROADMAP](../00-index/ROADMAP.md)                                                               | The capability gates and build order.                   |
| [defect-register](./defect-register.md)                                                         | Open conflicts/contradictions/gaps + resolution status. |
| [qa-red-team-log](./qa-red-team-log.md)                                                         | The challenge-review that produced this ledger.         |
| [golden-journey](./golden-journey.md)                                                           | The end-to-end path the gates execute.                  |
| [M0](./M0-foundation.md) · [M1](./M1-meaning.md) · [M2](./M2-time.md) · [M3](./M3-artefacts.md) | Per-milestone executable detail.                        |
