# ADR-0011: Module Taxonomy, Boundaries, and the Relationship Vocabulary

- Status: Accepted
- Date: 2026-06-11
- Depends-On: ADR-0001, ADR-0006
- Relates-To: ADR-0004, ADR-0009

## Context

Aideon's engines accreted names ad hoc, and the relationship vocabulary drifted between the seed metamodel and the
documentation. Two questions had no recorded answer: what governs whether a concern becomes its own module, and which
relationship set is canonical when the seed and the older [`EDGE-CATALOGUE.md`](../05-modules/praxis/EDGE-CATALOGUE.md)
disagree.

The product is a Tauri v2 host with Rust engines behind a typed IPC seam
([ADR-0006](./ADR-0006-tauri-trust-boundary-and-typed-ipc.md)) and a React renderer. The engines — Praxis (meaning),
Mneme (storage), Metis (analytics), Chrona (time), Continuum (orchestration) — already exist as crates. The host
(`desktop`) and the shared `engine` harness exist too but the `engine` crate was undocumented. Four further concerns —
search, interchange, AI assistance, and reporting — are planned but unnamed. Without a naming rule and a boundary rule,
each new concern would be argued from scratch, and engines would be tempted to call one another directly, producing a
cyclic dependency graph that defeats independent testing and rebuild.

The relationship vocabulary is the second drift. The seed metamodel [`core-v1.json`](../data/meta/core-v1.json) ships
`serves`, `realises`, `accesses`, `hosts`, and `plan_effect` — ArchiMate-aligned names (The Open Group, ArchiMate 3.2
Specification: Serving, Realization, Access, …). The older edge catalogue used a divergent set (`contributes_to`,
`delivers`, `uses_data`, `deployed_on`, `change_affects`, plus `depends_on`/`belongs_to` that the seed never defined),
and its `deployed_on` ran in the _reverse_ direction of the seed's `hosts`. Documentation precedence resolves this by
aligning the documentation to the implemented, standards-aligned seed.

## Governance Framing

- **Decision type:** Invariant (the acyclic engine graph; composition only through the host) + stable seam (module names
  and the relationship vocabulary, which are public cross-link and contract targets).
- **Known future pressure:** new concerns will want their own module; engines will be tempted to call each other for
  convenience; the relationship set will be asked to grow as more ArchiMate layers are modelled.
- **What stays stable:** the conceptual Greek/Latin naming convention; the rule that the host composes engines and
  engines do not depend on each other; the ArchiMate-aligned relationship names and their directions.
- **What is provisional:** the _membership_ of the planned modules (Kairos, Lexis, Pylon, Skopos, Sophia, Kerux, Koinon,
  Themis, Aegis) until their crates exist; the split-out triggers for the folded concerns; any additional relationship
  type introduced as an explicit extension.
- **What is deferred:** splitting any current crate into finer modules; splitting a folded concern (Oikos, Krisis,
  Topos, Logos) into its own module before its trigger fires; promoting a planned module's design to an accepted module
  README.
- **Why hard to reverse:** module names are cross-link targets across the whole corpus and frontend feature packages
  (`src/workspaces/<module>`); relationship identifiers and directions are baked into the seed, stored ops, projections,
  and analytics, so renaming or reversing them is a data migration, not an edit.

## Decision

- **Modules carry short, conceptual names from Greek and Latin roots.** A name evokes the module's role, never the
  technology it currently uses (so "Lexis", not "FTS5 search"). The naming convention is the one recorded in
  [DOCUMENTATION-STANDARD.md §10](../02-standards/DOCUMENTATION-STANDARD.md); this ADR governs it.

- **The engine dependency graph is acyclic, and no engine depends on another engine.** Praxis, Mneme, Metis, Chrona,
  Continuum, and the planned Kairos/Lexis/Pylon/Skopos/Sophia/Kerux/Koinon/Themis/Aegis must not call one another
  directly. Cross-engine work is composed by the **Host** (the `desktop` crate) and the shared **`engine`** harness,
  which wires each domain engine behind its trait for the host. An engine depends only on shared foundation types and
  its own dependencies, never on a sibling engine. This keeps each engine independently testable and each projection
  rebuildable from the canonical workspace ([ADR-0001](./ADR-0001-workspace-is-canonical-authority.md)).

- **A concern earns its own module when, and only when, it owns all three of: a distinct invariant, a distinct failure
  mode, and a distinct seam.** This is the test. A concern that owns a distinct invariant but no distinct seam, or that
  merely groups helpers, stays inside an existing module as a documented capability. Worked against the set: search owns
  "derived, rebuildable, never canonical" (Lexis); interchange owns "deterministic, reviewable import and redacted
  export" (Pylon); AI assistance owns "all output is Generated until accepted" (Sophia); reporting owns "deterministic,
  redaction-by-default publishing" (Kerux); investment planning owns "every investment attaches to a modelled change"
  (Kairos); reality-sync owns "continuous, automated, Asserted `actual` facts by reconciliation" (Skopos); collaboration
  owns "peers converge without silent overwrite" (Koinon); governance owns "authority is decided by policy, never
  assumed" (Themis); risk owns "a risk/control/obligation never floats free of the twin" (Aegis). Each is a separate
  invariant with its own failure mode and seam, so each is a separate module.

- **The `engine` crate is documented as the shared engine harness.** It wires the domain engines behind their traits for
  the host. It is not a domain engine and holds no domain invariant of its own; it is the composition seam the
  acyclicity rule depends on.

- **The planned modules are recorded as design intent, labelled _planned_ until a crate exists:** **Kairos** (investment
  and portfolio planning — [ADR-0028](./ADR-0028-investment-and-portfolio-planning-kairos.md)), **Lexis** (search and
  discovery — [ADR-0012](./ADR-0012-search-and-discovery-lexis.md)), **Pylon** (interchange —
  [ADR-0013](./ADR-0013-interchange-and-interoperability-pylon.md)), **Skopos** (automated discovery and reality-sync —
  [ADR-0032](./ADR-0032-automated-discovery-reality-sync-skopos.md)), **Sophia** (AI assistance —
  [ADR-0014](./ADR-0014-ai-assistance-and-generated-provenance-sophia.md)), **Kerux** (reporting and publishing —
  [ADR-0015](./ADR-0015-reporting-and-publishing-kerux.md)), **Koinon** (collaboration and sync —
  [ADR-0029](./ADR-0029-collaboration-and-sync-koinon.md)), **Themis** (governance —
  [ADR-0030](./ADR-0030-governance-themis.md)), **Aegis** (risk, controls, and compliance —
  [ADR-0031](./ADR-0031-risk-controls-compliance-aegis.md)). With these the engine pantheon is complete: Kairos, Koinon,
  Themis, Aegis, and Skopos are the engine modules added since the original four planned (Lexis, Pylon, Sophia, Kerux).

- **Some real concerns do not yet earn a module; they are _folded_ into an existing module as a documented capability,
  each with the explicit trigger that would split it out later.** Folding a concern is the default; splitting is the
  exception that must be earned by the three-part test above. The folded set:

  | Folded concern                                         | Lives in                                                                                                                                       | What it owns                                         | Split-out trigger                                                                                                                       |
  | ------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
  | **Oikos** (run-cost / FinOps)                          | [Metis](../05-modules/metis/README.md) (cost computation) + [Kairos](./ADR-0028-investment-and-portfolio-planning-kairos.md) (investment cost) | Ongoing opex / TCO of running the estate             | Split when opex/actuals cost modelling grows its own model and method beyond what Metis computation and Kairos investment cost carry    |
  | **Krisis** (validation, rules, data-quality)           | [Praxis](../05-modules/praxis/README.md) integrity scoring ([ADR-0020](./ADR-0020-integrity-scoring-model.md))                                 | Validation rules and data-quality judgement          | Split when rule _authoring_ grows into a first-class concern (a rule library with its own lifecycle) beyond Praxis integrity dimensions |
  | **Topos** (cartography, auto-layout / ELK)             | the renderer + [Praxis](../05-modules/praxis/README.md)                                                                                        | Automatic graph layout and cartographic presentation | Likely **never** an engine — layout is a rendering concern with no canonical truth; recorded so the question is settled                 |
  | **Logos** (narrative, decision rationale, annotations) | [Kerux](./ADR-0015-reporting-and-publishing-kerux.md) (narrative) + [Mneme](../05-modules/mneme/README.md) (annotations as facts)              | Decision rationale and narrative over the twin       | Split when narrative/rationale needs its own authored model and method beyond reporting prose and annotation facts                      |

- **The canonical relationship vocabulary is the seed's ArchiMate-aligned set:** `serves`, `realises`, `accesses`,
  `hosts`, `plan_effect`. The older `contributes_to`/`delivers`/`uses_data`/`deployed_on`/`change_affects` names are
  **superseded**. The reconciliation is:

  | Canonical (seed, ArchiMate) | Direction                                                                                           | Supersedes (old)         | ArchiMate concept               |
  | --------------------------- | --------------------------------------------------------------------------------------------------- | ------------------------ | ------------------------------- |
  | `serves`                    | `Capability → ValueStreamStage`                                                                     | `contributes_to`         | Serving                         |
  | `realises`                  | `Application`/`TechnologyComponent → Capability`/`BusinessProcess`                                  | `delivers`               | Realization                     |
  | `accesses`                  | `BusinessProcess`/`Application → DataEntity` (`mode` attribute)                                     | `uses_data`              | Access                          |
  | `hosts`                     | `TechnologyComponent → Application`                                                                 | `deployed_on` (reversed) | Serving/Assignment (technology) |
  | `plan_effect`               | `PlanEvent → Capability`/`BusinessProcess`/`Application`/`TechnologyComponent` (`op`, `target_ref`) | `change_affects`         | (Aideon planning extension)     |

- **`hosts` direction is canonical: `TechnologyComponent → Application`.** The old `deployed_on`
  (`Application → TechnologyComponent`) ran the reverse direction. Direction is load-bearing — it drives infrastructure
  impact and topology traversal — so the seed direction governs and `deployed_on` must not be reintroduced.

- **Generic relationships (`depends_on`, `belongs_to`) are not in the canonical set.** The seed does not define them.
  Any additional relationship type is introduced explicitly as an extension, with in-module rationale, kept out of seed
  assets and default contract examples, per the catalogue's own extension rule.

## Considered Options

- **Technology-named modules (rejected):** names like "search" or "sqlite-fts" tie the module to its current
  implementation and rot when the implementation changes; conceptual names survive re-implementation.
- **Direct engine-to-engine calls (rejected):** convenient, but produces a cyclic dependency graph, couples release
  cycles, and defeats independent rebuild and testing. Composition through the host costs one indirection and buys
  acyclicity.
- **Keeping the older edge names (rejected):** they diverge from ArchiMate, omit the `accesses` mode and `plan_effect`
  attributes the seed carries, invent `depends_on`/`belongs_to` the seed never defined, and reverse `hosts`; aligning to
  the implemented seed is the lower-risk direction under documentation precedence.

## Consequences

- The module set after this revision is the table in
  [DOCUMENTATION-STANDARD.md §10](../02-standards/DOCUMENTATION-STANDARD.md): the existing Praxis, Mneme, Metis, Chrona,
  Continuum, Host, Engine; and the planned Kairos, Lexis, Pylon, Skopos, Sophia, Kerux, Koinon, Themis, Aegis. The
  folded concerns (Oikos, Krisis, Topos, Logos) are documented capabilities within those modules, each with a recorded
  split-out trigger, not separate rows.
- Planned-module READMEs state the boundary they will occupy and cite the ADR that introduces them; they describe design
  intent, not implemented behaviour, until a crate exists.
- [`EDGE-CATALOGUE.md`](../05-modules/praxis/EDGE-CATALOGUE.md) is rewritten to the canonical set; worked examples
  across the corpus use `serves`/`realises`/`accesses`/`hosts`/`plan_effect`, per
  [DOCUMENTATION-STANDARD.md §6](../02-standards/DOCUMENTATION-STANDARD.md).
- Frontend feature packages continue to mirror their facing module (`src/workspaces/<module>`).
- The acyclicity rule is enforceable in the build (a crate graph check) and is a review criterion for every new
  cross-engine call.

## Follow-ups / Open Questions

- A lint or `cargo` check that fails the build on an engine→engine dependency edge.
- Whether a generic containment relationship is ever warranted as an extension, and under what rationale.
- The precise ArchiMate concept for `hosts` (Serving vs Assignment at the technology layer) to record in the rewritten
  edge catalogue.

## References & standards

- The Open Group — **ArchiMate 3.2 Specification** _(normative: relationship and type vocabulary)_.
- [DOCUMENTATION-STANDARD.md](../02-standards/DOCUMENTATION-STANDARD.md) §10 (module naming), §12 (known
  reconciliations).

## Related documents

| Document                                                     | What it covers                                                        |
| ------------------------------------------------------------ | --------------------------------------------------------------------- |
| [`core-v1.json`](../data/meta/core-v1.json)                  | The seed metamodel — the implemented relationship set and directions. |
| [EDGE-CATALOGUE.md](../05-modules/praxis/EDGE-CATALOGUE.md)  | The canonical relationship catalogue (rewritten to this decision).    |
| [ADR-0006](./ADR-0006-tauri-trust-boundary-and-typed-ipc.md) | The host trust boundary that composes the engines.                    |
