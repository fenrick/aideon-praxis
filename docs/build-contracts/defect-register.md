# Defect register — FULL-CORPUS challenge-review of the milestone build stages

Supersedes the earlier build-contracts-only pass. Evidence read: `docs/03-design/` (DESIGN, axioms, module-map, delivery-order, metamodel, artefacts, UX-DESIGN, design-system), `docs/01-architecture/` (ARCHITECTURE-BOUNDARY, dependency-map, boundary/), all 39 ADRs, every `docs/05-modules/<module>/`, `docs/04-contracts/`, `docs/02-standards/`, `docs/frontend/`, ROADMAP, build-contracts, and the live `crates/`, `src-tauri/`, `.github/workflows/pipeline.yml`. Australian English. Claims labelled FACT / INFERENCE / ASSUMPTION.

## Resolution status (living)

This was a **design-based** challenge-review: its job was to make the milestone _design_ coherent — single ledger, one-owner-per-aspect, no contradictions, clear sequencing. Each defect is therefore classified:

- **Design defect** — the design/docs are themselves wrong, contradictory, ambiguous, or incomplete. These are closed **now**, in docs/ADRs, regardless of build progress.
- **Implementation aspect** — the design is sound; the thing is simply **not built yet**. These are **not design debt**; they resolve when the implementation reaches that milestone, tracked by issue. Listing them as "open defects" would wrongly imply the design is incomplete.

### Design defects — closed (the design-review criteria)

| Defect                                                                                     | Status             | Resolution                                                                                                                                     |
| ------------------------------------------------------------------------------------------ | ------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| D1 accepted-work mis-sequenced                                                             | **Resolved**       | [#316] Minimal accepted-work core → **M0**; Continuum (M4) = full orchestration. M0 contract + ROADMAP updated.                                |
| D5 UX unowned M0–M2                                                                        | **Resolved**       | [#320] UX assigned per milestone (shell→M0, authoring→M1, time→M2, catalogue→M3); single ledger [MILESTONES.md](./MILESTONES.md) created.      |
| D6 doc-vs-built drift                                                                      | **Resolved (doc)** | [#321] M0 Open Questions reconciled; `SQLITE.md` flagged as target-not-built. (Full SQLITE rewrite tracks with the M1–M3 tables it describes.) |
| D7 ADR-0039 ↔ 0037                                                                         | **Resolved**       | [#322] ADR-0039 ratified (codegen); 0037 Amended-By; index updated.                                                                            |
| D8 orphaned artefact forms + Mneme export                                                  | **Resolved**       | [#323] Scheduled in the ledger: view/map/matrix→M4, report/page→M5, export→M4.                                                                 |
| D9 integrity scorer two owners                                                             | **Resolved**       | [#324] Owner = **Praxis** (ADR-0020 + import ban); M3 table corrected.                                                                         |
| D12 HLC split · D13 packaging · D14 invariant gates · D15 retention · D18 metamodel naming | **Resolved**       | Assigned to a single owner in the ledger matrix (HLC→M0, packaging→M3, invariants=cross-cutting gates, retention→M6).                          |
| D16 Continuum status                                                                       | **Not a defect**   | Verified: module-map says "has a crate today" (true); M4 is its capability milestone (reconciled by D1).                                       |
| D17 Sophia ↔ Lexis ordering                                                                | **Not a defect**   | Verified against the dependency map: Sophia → Mneme only; "no other engine" holds. RAG detail is M5 module design.                             |
| D21 `aideon_contracts` phantom                                                             | **Not a defect**   | Verified: cited as "a crate **when** contracts span engines" — conditional/future design-intent, not a present claim.                          |

### Implementation aspects — resolve when the build reaches the milestone (not design debt)

The design now tells the build what to do and how it is validated; these land as that milestone is implemented.

| Defect                                                   | Resolves at                     | Tracked       |
| -------------------------------------------------------- | ------------------------------- | ------------- |
| D3 host lifecycle IPC + capability + accepted-work core  | M0                              | [#318]/[#290] |
| D2 in-Tauri-window e2e gate (harness)                    | M0, then each UX milestone      | [#317]        |
| D4 host-boundary e2e (the gate executed)                 | M0                              | [#319]        |
| D10 task-pipeline first-class + tested                   | M1                              | [#325]        |
| D11 golden journey run as a CI gate                      | per milestone as built          | [#326]        |
| D19 relationship multiplicity enforced                   | M1                              | register      |
| D20 M1 design specifics (Stage / UUIDv5 / rule defaults) | M1 (M1 contract open questions) | register      |
| D22 `praxis_artefact_execute_chart` drift                | M3 (host artefact commands)     | register      |

**Net:** the design-review criteria are **met** — single ledger, one-owner-per-aspect, the design contradictions resolved or verified non-issues. What remains is implementation, tracked to its milestone.

[#316]: https://github.com/aideon-ai/aideon-desktop/issues/316
[#317]: https://github.com/aideon-ai/aideon-desktop/issues/317
[#318]: https://github.com/aideon-ai/aideon-desktop/issues/318
[#319]: https://github.com/aideon-ai/aideon-desktop/issues/319
[#320]: https://github.com/aideon-ai/aideon-desktop/issues/320
[#321]: https://github.com/aideon-ai/aideon-desktop/issues/321
[#322]: https://github.com/aideon-ai/aideon-desktop/issues/322
[#323]: https://github.com/aideon-ai/aideon-desktop/issues/323
[#324]: https://github.com/aideon-ai/aideon-desktop/issues/324
[#325]: https://github.com/aideon-ai/aideon-desktop/issues/325
[#326]: https://github.com/aideon-ai/aideon-desktop/issues/326

---

## Corrections to my earlier (partial) review — recorded for honesty

- **C1.** I said the WebDriver e2e is "gated to main pushes." **Wrong** (two reviewers, R1). The `e2e` job has no `if:` — it runs on **every PR and push**, but headless **Linux WebKit only**, and macOS e2e is **explicitly skipped** (`tests/e2e/run.mjs:21-24`). The product ships macOS WebKit / Windows WebView2 → **zero in-window validation on any shipped target.** This is worse than I framed, not better. (The push-only gate is on the 3-OS `build` packaging job.)
- **C2.** I implied M3 risks building on an unratified ADR-0033. **Wrong** — ADR-0033 is **Accepted**. The real Proposed-vs-Accepted conflict is **ADR-0039** (see D7).

---

## Critical

### D1 — Accepted-work / Continuum is mis-sequenced: an M4 capability is load-bearing at M0 and M3

- FACT (R1). Axiom 7, `module-map.md`, and the whole `docs/04-contracts/accepted-work-and-events/` suite say **Continuum owns** the AcceptedJob envelope, run-ledger, backpressure, retries. ROADMAP places Continuum in **M4**. But M0 requires "rebuild as accepted work," M3 requires `AcceptedJob`/`AnalyticsRefresh` and single-op writes returning `BACKPRESSURE`, and `module-map.md:42` even lists Continuum as already-implemented. So accepted-work is spread **M0/M3/M4**, the design contradicts the ROADMAP, and the build contracts paper over it with "host runs rebuild synchronously (pending)."
- Why it matters: violates one-aspect-one-milestone at the foundation; the M0 rebuild path is specified as accepted-work but has nothing to build against; `delivery-order.md` claims the order is "forced, not chosen" yet Continuum's M4 placement is a product choice the DAG doesn't force.
- Action: define an **M0-owned accepted-work core** (host-local job + RunEvent + backpressure subset) distinct from Continuum's M4 orchestration; or pull Continuum's core forward. Name the split explicitly.

### D2 — No in-Tauri-window composition/interaction gate exists in any milestone

- FACT (R1). The only in-window test (`tests/webdriver/specs/launch.spec.js`) waits for one `[data-testid="aideon-shell-content"]` node to exist and opens aux windows — it never asserts the four shell regions compose, a surface renders, or any interaction. Headless Linux WebKit; macOS skipped (C1). All `mvp-ui-state-machines` exit tests pass in jsdom; `docs/frontend/testing.md` mandates mocked IPC "so tests never reach a real host."
- Why it matters: there is **no contracted requirement that the assembled shell renders as a coherent set in the running app.** CI-green is fully consistent with the broken shell you observed. This is the central defect.
- Action: make in-window e2e (real composition + ≥1 interaction per surface, on shipped webview targets) the UX exit gate per milestone; mock-layer tests explicitly do not satisfy it.

### D3 — M0 is not finished: the host layer is unbuilt and partly contradicted

- FACT (R1). `src-tauri/src/app.rs:112-142` registers **no** `workspace_*` lifecycle command (only projects/templates) — the lifecycle IPC the M0 contract and `workspace-lifecycle.md` mandate is unbuilt (#290). No `jobs.rs`, no `AcceptedJob`/`RunEvent`/`BACKPRESSURE`/`workspace.lifecycle.changed` symbol → rebuild-as-accepted-work + readiness events unbuilt. The shipped `src-tauri/capabilities/default.json` is a **single** capability granting the whole `appcommands` bundle to all six windows (splash can invoke `praxis_task_apply_operations`), directly contradicting `capabilities-and-csp.md` per-window scoping. `appcommands.toml` allows `system_factory_reset`, not registered in `generate_handler!`.
- Why it matters: M0's headline ("a workspace opens and round-trips") is provable only at the crate level, bypassing the trust boundary M0 also requires; the canonical engine is unreachable from the UI. M0 is in progress, not done.
- Action: M0 stays **in progress**; remaining = lifecycle IPC + capability enforcement (#290), accepted-work core + readiness events, per-window capability split, bundle↔handler drift fix.

## High

### D4 — "Host assembled and tested" is never a contracted, validated deliverable

- FACT (R1). Every M0–M3 exit test maps to a Mneme-crate or engine-command oracle. No milestone asserts the IPC envelope round-trips in-app, the error envelope redacts Rust internals, registration↔bundle parity holds, per-window scoping denies, splash gating works, or `correlation_id` propagates. This is how #290 slipped to "M0 done" while the headline boundary capability stayed unbuilt.

### D5 — UX/shell + design system owned by no M0–M2 build plan; validated only by mocks

- FACT (R1). M0 ownership = Mneme/Host/Engine, zero renderer rows; M1/M2 give the renderer "typed IPC only"; only M3 names the Renderer (catalogue render). The shell (`src/aideon/shell/`, `src/platform/`) + design system were built off-plan (#225/#283), against the repo's own `ready-for-agent` bar. UX-DESIGN §2 assigns shell→M0, modelling studio→M1–M3, scenario studio→M2 — the build contracts deliver none of it (design↔milestone contradiction); UX-DESIGN concedes its map is "not a separately-ratified UX roadmap." 7 of 8 surfaces have no contract/exit test/in-window check.

### D6 — Claimed-vs-built doc drift across Mneme + the M0 contract

- FACT (R1). `SQLITE.md` describes **SeaORM** migrations, `payload BLOB`+`op_type`, and `*_json` fact tables — i.e. the **deleted prototype** — contradicting the built M0 (rusqlite, typed per-kind payload, 8 foundation tables, `json` forbidden; same doc line 28 self-contradicts on JSON). The M0 build contract marks ~16 rows "✅ built+tested" while its own **Open Questions** still say "the canonical persistence layer is unbuilt" and "`FoundationProjectionSnapshot` is a test-only DTO not yet implemented" — stale post-#314 and never reconciled (a defect I left when adding the #315 table). Mneme module docs describe the end-state engine as if current, with no per-section milestone tags.

### D7 — ADR-0039 (Proposed) contradicts ADR-0037 (Accepted) over the M0 foundation

- FACT (R1). ADR-0039 proposes deleting the hand-maintained IPC-manifest layer and amends the Accepted precedence ADR-0037; but 0037, the M0 contract, `tests/contracts/*.contract.test.ts`, and the golden journey all treat `ipc-manifest.json` as source of truth, and 0037 carries **no amended-by note**. A Proposed ADR sits in live conflict with an Accepted invariant the foundation rests on. No governance rule requires an ADR to be Accepted before a milestone depends on it.

### D8 — Five of six artefact forms, and Mneme export/package, are orphaned Accepted capabilities

- FACT (R1). `view/map/matrix/report/page` have frozen wire contracts (`04-contracts/artefact-results/*`) and are in the controlled form set, but M3 scopes only the **catalogue** and no M4–M6 row owns the other five. Likewise ADR-0007 deterministic package export/import + `MnemeExportApi` + snapshot-plus-tail + the 17-API `MnemeStore` supertrait are designed but owned by no milestone (M4 = Pylon foreign-format import, not Mneme's own op-log export). report/page also structurally need Sophia (M5) but no gate says so.

### D9 — Integrity scorer has two owners

- FACT (R1). Praxis docs say integrity is computed by Praxis from its effective schema/spine; M3's ownership table assigns the scorer to **Metis**; `boundaries.md` forbids Praxis↔Metis imports. A load-bearing M3 deliverable with contradictory ownership.

### D10 — The Change Event / task pipeline is contractually unanchored

- FACT (R1). `tasks-and-change-events.md` makes the task→Change Event→op pipeline (multi-op atomicity, Plan Event subtype, approval/lifecycle, delete-with-live-relationships rejection) the mandatory authoring entry point, but every M1/M2 oracle uses the raw `mneme_store_create_node`/`create_edge` path and `praxis_task_apply_operations` only ever appears as "_or_". The task-first invariant DESIGN.md requires is tested by no milestone.

### D11 — The golden journey is a document, not an executed gate

- FACT (R1). `grep golden` across `.github/`, `scripts/`, `package.json` → nothing; no CI job runs steps 1–10 in the assembled app, and M1–M3 oracle fixtures are mostly "(oracle: planned)". The contract-coverage matrix is unenforced — the real `ipc-manifest.contract.test.ts` only checks renderer command strings ⊆ manifest (one direction, no envelopes/DTO parity), while `boundary-and-contract-tests.md` claims a full bidirectional drift check exists.

## Medium

### D12 — HLC spread across M0 and M2 with no in-file marker

- FACT (R1). Built/tested at M0 (`mneme_core/src/time.rs`); `M2-time.md` step 1 says "Encode the HLC". `bitemporal-and-hlc.md` mixes the M0 mechanism and the M2 resolution chain untagged → a builder could attempt the resolver at M0. The time-first axiom split (write-stamp M0 / resolve M2) is correct but undocumented as a deliberate division.

### D13 — Packaging / cross-platform / signing / notarisation owned by no milestone

- FACT (R1). Lives only in the push-only `build` CI job + a DoD line that is in CLAUDE.md's template but **not** in CONTRIBUTING.md's actual checklist. macOS ships unsigned; no signing test. `cross-platform-matrix.md` overstates ("CI runs the full suite on all three platforms" — false; checks are ubuntu-only, the 3-OS job only compiles/bundles).

### D14 — Unowned cross-cutting Accepted invariants

- FACT (R1). Observability/trace-context (ADR-0019), threat-model conformance (0023), schema-migration op-types (0035), right-to-erasure (0036), and the design-system/tokens/a11y trio (0010/0025/0024) are referenced by no ROADMAP exit gate — even though 0016/0018 depend on the correlation IDs 0019 defines, and M3 renders UI without an a11y gate. "AA is the floor" is never a gating assertion. "Visually inspect before UI done" (CLAUDE.md) is enforced nowhere.

### D15 — Retention / op-log compaction / historical blob reclamation unscheduled

- FACT (R1). Explicitly deferred until governed retention exists (ADR-0036) but no M0–M6 row schedules it; reaching `999999.ops.jsonl` also depends on this. `MnemeProcessingApi` advertises `retention`/`compaction` triggers whose backing feature is un-milestoned.

### D16 — Continuum milestone vs module-map status inconsistency

- FACT (R1). ROADMAP M4 introduces Continuum; `module-map.md:42` lists it as already-implemented and M0 depends on it for deferred lifecycle/job scoping. Roadmap-vs-module-map contradiction (related to D1).

## Low

- **D17** — Sophia↔Lexis: `delivery-order.md` says the M5 trio "depend on no other engine," but Sophia's `grounding-and-retrieval.md` makes generation ride on Lexis RAG → M5-internal ordering constraint unstated. (FACT, R1)
- **D18** — Metamodel split M0 (authored/structural) / M1 (effective/semantic) is acceptable but must be named as two aspects, not one smeared across two milestones. (INFERENCE)
- **D19** — Relationship `multiplicity` declared in the seed but never enforced in `validation-rules.md` and asserted by no milestone — dead metadata or unbuilt obligation. (FACT, R1)
- **D20** — M1 Open Questions (Stage supertype gap, UUIDv5 namespace absent, structural-rule defaults for 3/5 relationships, attribute cardinality) are real gaps M2/M3 inherit; honestly disclosed but unowned. (FACT, R1)
- **D21** — `aideon_contracts` neutral crate cited as the acyclic-invariant enforcement mechanism appears in no crate inventory and no milestone. (FACT, R1)
- **D22** — `src-tauri` registers `praxis_artefact_execute_chart`; `chart` is not one of the six sanctioned artefact forms — code↔design drift. (FACT, R1)

## Positive findings (steelman held)

- **M4–M6 planning is unusually complete:** every named planned module has a real multi-file design folder + an introducing ADR; no stubs, none absent.
- **The `required_features` refusal seam is correctly owned at M0**, and every refused capability (access policy→Themis, scenarios→Chrona, CRDT→Koinon) maps to a scheduled later owner — no "refused-but-never-scheduled" defect.
- **Engine sequencing (Host→Mneme→Praxis→Chrona→Metis) is genuinely DAG-forced** and the engine exit oracles (M0 engine, M1, M2, M3) are real, fixture-backed, non-mock.
- **All 39 ADR statuses match the index** (38 Accepted, 1 Proposed).

## Residual risk for decision-makers

- **R-A (High):** Until D2/D5 close, no evidence the assembled app works on any shipped target; CI-green ≠ working app.
- **R-B (High):** D1 — the M0 rebuild path is specified against an accepted-work engine (Continuum) the roadmap schedules at M4; the foundation has a sequencing hole, currently hidden by a synchronous shortcut that violates `workspace-lifecycle.md`.
- **R-C (High):** D3 — M0 host layer unbuilt + capability file contradicts the security design; the canonical engine is unreachable from the UI.
- **R-D (Medium):** D6/D11 — docs assert built/validated states that the code/CI do not back; "done" is not defined as real-vs-mock per milestone.
- **R-E (Medium):** D8 — the product's headline deliverable (artefacts) ships 1/6 forms at end-of-MVP with no plan for the rest.
