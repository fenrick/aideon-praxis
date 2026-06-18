# Documentation Standard

How every design document in this repository is written, structured, and held to standard. This document is normative for all authors — human and agent. It exists so that a reader moving between the architecture, design, contract, and module layers meets one voice, one vocabulary, and one set of scales, and never has to reconcile drift between documents by hand.

It governs form and consistency. It does not make architecture decisions; those live in [ADRs](../06-adrs/ADRS.md) and are framed by [DESIGN-GOVERNANCE.md](./DESIGN-GOVERNANCE.md).

---

## Contents

1. [Audience and posture](#1-audience-and-posture)
2. [Voice and register](#2-voice-and-register)
3. [Canonical vocabulary](#3-canonical-vocabulary)
4. [Document structure](#4-document-structure)
5. [Evidence and citation](#5-evidence-and-citation)
6. [Worked examples](#6-worked-examples)
7. [Diagrams](#7-diagrams)
8. [The unified scales](#8-the-unified-scales)
9. [Honest-state vocabulary](#9-honest-state-vocabulary)
10. [Module and crate naming](#10-module-and-crate-naming)
11. [Cross-linking](#11-cross-linking)
12. [Known reconciliations](#12-known-reconciliations)
13. [Review checklist](#13-review-checklist)

---

## 1. Audience and posture

These documents are written for a practitioner who is expert in their own field — enterprise architecture, service design, solution architecture, strategy, consulting — but new to this system. They are not marketing. They are not tutorials. They are the durable design record a competent engineer or architect would need to rebuild, extend, or audit the product without access to its authors.

Three obligations follow:

- **Fast to read.** A reader finds the answer to a specific question without reading the whole document. Structure, headings, and tables carry the load; prose connects them.
- **Accurate.** Every claim is either traceable to canonical material in this repository (code, schema, contract, prior decision) or to a named external standard. Nothing is asserted on authority alone.
- **Transparent.** Where a design is provisional, aspirational, or not yet realised in code, the document says so in place. A confident sentence about something that does not exist is the most expensive kind of error.

These three — fast, accurate, transparent — are the same obligations the product itself carries to its users. The documentation holds itself to the standard it describes.

---

## 2. Voice and register

- **British English.** `behaviour`, `realise`, `catalogue`, `organisation`, `analyse`, `prioritise`. This matches the existing corpus and the [glossary](../../CONTEXT.md).
- **Present tense, indicative mood.** "The host owns all side effects," not "The host will own" or "The host should own." Design documents describe the system as designed, in force now.
- **Normative verbs are deliberate.** Use **must** for an invariant or contract obligation, **should** for a strong default that may be overridden with rationale, **may** for a genuine option. Do not use "must" for preferences or "should" for invariants. These words are load-bearing; reviewers check them.
- **Declarative, not promotional.** State what is true and why it is true. Cut "powerful", "seamless", "simply", "just", "robust", "world-class", and every other word that asserts quality instead of demonstrating it.
- **One idea per paragraph.** Lead with the claim; follow with the reason. A reader who stops after the first sentence of each paragraph still has the argument.
- **Name the trade-off.** A design that has no cost has not been understood. When a choice closes a door, say which door.

---

## 3. Canonical vocabulary

The single source of truth for domain terms is the root glossary, [`CONTEXT.md`](../../CONTEXT.md). Every document uses those terms exactly as defined and avoids the terms the glossary marks `_Avoid_`. The most consequential distinctions, restated here so authors do not have to leave the page:

| Use this                                                            | Not this                                     | Because                                                                                                                                                                              |
| ------------------------------------------------------------------- | -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **twin**                                                            | current state, the database                  | The twin is the whole resolvable organisation across all time, layers, and scenarios; a snapshot is the twin seen through one viewpoint.                                             |
| **workspace**                                                       | project file, repo, database                 | The portable container; canonical truth is its op log plus schema, everything else is derived.                                                                                       |
| **entity** / **relationship**                                       | node / edge (in domain prose)                | Entity and relationship are the domain terms. **Node** and **edge** are reserved for the graph projection — storage, validation, traversal, layout, canvas.                          |
| **slot**                                                            | field, attribute, cell                       | A slot is the addressable claim target; an attribute, relationship, membership, classification, or metric is a _kind_ of slot.                                                       |
| **fact**                                                            | record, row, op-log entry                    | A fact is the derived temporal claim; the **operation** is the canonical mutation it derives from.                                                                                   |
| **operation**                                                       | change, edit, transaction                    | The append-only mutation in the op log. Authoring intent is a **Change Event**.                                                                                                      |
| **Change Event** / **Plan Event**                                   | change, command                              | The user-facing authoring object that compiles into operations. Plan Event is the subtype that authors a non-actual layer.                                                           |
| **viewpoint**                                                       | as-of context, temporal context, perspective | The complete query frame: as-of valid time, as-of asserted time, layer (or policy), scenario, scope.                                                                                 |
| **snapshot**                                                        | copy, dump, export                           | The twin resolved at one viewpoint — a view, not a stored copy.                                                                                                                      |
| **effective graph**                                                 | current graph                                | The entity-and-relationship graph form of a snapshot. Distinct from **effective interval** (a resolved time span).                                                                   |
| **layer**                                                           | baseline, track                              | The "what kind of claim" coordinate (plan, actual, forecast…). Combination on read is a _policy_, never fixed precedence.                                                            |
| **scenario**                                                        | branch, variant, what-if, version            | An alternate world; an additive overlay on the base case. Orthogonal to layer.                                                                                                       |
| **scope**                                                           | filter, query, selection                     | The composable "which part" coordinate of a viewpoint.                                                                                                                               |
| **metamodel**                                                       | schema, ontology, data model                 | The authored, portable modelling language. The compiled per-type form is the **effective schema**.                                                                                   |
| **type** (entity type / relationship type)                          | class, category                              | Category is one facet of a type, not the type.                                                                                                                                       |
| **Artefact** / **Artefact result** / **Artefact family** / **Form** | report, diagram, viewpoint, lens             | An Artefact is a reusable definition; a result is one execution; a family is a question-shaped grouping; a form is the presentation shape. `Artefact + Viewpoint → Artefact result`. |
| **content classification** — Asserted / Inferred / Generated        | provenance, confidence                       | The "what kind of claim" axis. Distinct from provenance (origin) and confidence (quality).                                                                                           |

**Reserved name collision.** In this project **Viewpoint** means the bitemporal query frame, _not_ the ISO/IEC/IEEE 42010 architecture viewpoint. When citing 42010, write "architecture viewpoint (42010)" to disambiguate, and never use "viewpoint" alone for the 42010 sense. The product-layer grouping is an **Artefact family**.

---

## 4. Document structure

### Granularity — prefer small, single-topic files

One document answers one question. When a topic grows past roughly four screens, or starts to carry two distinct concerns, it is split into separate files in a folder with an `index.md` (or `README.md`) that orients the reader and links the parts. A reader should be able to open the one file that answers their question without scrolling past three others.

This means a layer is a **folder of focused files**, not one long document. For example, the artefact design is a folder — `what-is-an-artefact.md`, `the-contract.md`, `families.md`, `explanation-surfaces.md`, `intelligence-and-automation.md` — indexed by a short README, rather than a single `ARTEFACTS-AND-FAMILIES.md`. Splitting is preferred over length. The index README is the entry point and the only place that carries the cross-cutting narrative.

When splitting an existing large document, preserve its anchors by leaving its incoming cross-links pointing at the new index, and update them to the specific sub-file where a more precise target exists.

Every document opens with a one-or-two-sentence **purpose statement** (no heading) that says what the document is and who needs it. Multi-part folders carry a numbered **Contents** list in the index; individual files stay short enough not to need one.

### Repository structure

The top-level layout follows established practice and is kept stable so cross-links endure:

| Folder             | Convention it follows                                 | Holds                                                      |
| ------------------ | ----------------------------------------------------- | ---------------------------------------------------------- |
| `00-index/`        | A documentation map / landing page                    | Entry points and the reading order.                        |
| `01-architecture/` | arc42 (building-block & runtime views) + the C4 model | System shape, boundaries, module graph, C4 DSL.            |
| `02-standards/`    | Engineering handbook                                  | How decisions are made and code/docs are held to standard. |
| `03-design/`       | Diátaxis _explanation_                                | What the product is and how it behaves.                    |
| `04-contracts/`    | Interface reference                                   | The typed shapes binding renderer ↔ host ↔ engines.        |
| `05-modules/`      | Per-component design                                  | One folder per module.                                     |
| `06-adrs/`         | MADR / Nygard ADRs                                    | The decisions that fix the invariants.                     |

Within a layer, decompose into small single-topic files (above). The numbered top-level folders do not change without an ADR, because their paths are public cross-link targets across the corpus.

**All documentation lives under `docs/`.** Design, architecture, contract, and module documentation belongs in the tree above and nowhere else — never in `crates/`, `src/`, or `src-tauri/`. A module's design record is its `05-modules/<module>/` folder, not a `README.md` or `DESIGN.md` beside its code. The only Markdown that lives outside `docs/` is the small set of repository-root files that tooling and hosting conventions require at the root: `README.md`, `CONTEXT.md`, `CONTRIBUTING.md`, `SECURITY.md`, `CODE-OF-CONDUCT.md`, and the agent guide (`CLAUDE.md`/`AGENTS.md`). This keeps one discoverable doc tree, lets the corpus generator ([`tools/docs-corpus.mjs`](../../tools/docs-corpus.mjs)) source only root entry points plus `docs/`, and removes the drift that two homes for the same design invites.

Recommended skeletons by document kind:

**Module README** (`05-modules/<module>/README.md`)

1. Purpose and one-line responsibility
2. Invariants (the non-negotiable rules this module upholds)
3. What it owns / what it explicitly does not own
4. Domain model (the data and types it works in)
5. Public contract (the trait/interface seam other layers depend on)
6. Algorithms and bounds (with complexity where it matters)
7. Failure modes and recovery
8. Performance budget
9. Crate structure
10. References & standards
11. Related documents

**Design document** (`03-design/*`)

1. Purpose
2. The principle (what is true and why)
3. The contract or rules it imposes
4. Worked example(s)
5. Edge cases and honest-state behaviour
6. References & standards
7. Related documents

**Contract document** (`04-contracts/*`)

1. Purpose
2. The shape (JSON/Rust with field tables)
3. Semantics and resolution rules
4. Versioning and compatibility
5. Error taxonomy
6. Worked request/response examples
7. References & standards

**ADR** — exactly the sections in [ADR-FORMAT.md](./ADR-FORMAT.md): Context, Governance Framing, Decision, Consequences, Follow-ups / Open Questions. No deviation.

Every non-trivial document ends with two sections: **References & standards** (external) and **Related documents** (internal, as a table with a "what it covers" column).

---

## 5. Evidence and citation

"Deep researched, evidence based" is a structural requirement, not a tone. Two kinds of claim, two kinds of evidence:

- **System claims** — assertions about how Aideon is built or behaves. These are backed by a link to the canonical artefact: a contract document, a schema file, an ADR, or a source path (`crates/mneme_core/...`). If no such artefact exists, the claim is design intent and is marked as such (§12 / honest-state).
- **Best-practice claims** — assertions that a design follows or departs from an established practice. These cite a named external standard or primary source, inline, in the form _(Author/Body, Title, year)_ or _(Standard ID)_. Examples: _(Snodgrass, Developing Time-Oriented Database Applications in SQL, 1999)_, _(ISO/IEC/IEEE 42010:2022)_, _(RFC 9457)_, _(OWASP ASVS 5.0)_, _(WCAG 2.2)_, _(The Open Group, ArchiMate 3.2)_.

Rules:

- **Cite the primary source, not a blog.** Standards bodies, the original paper, the canonical book.
- **Do not invent URLs.** Cite by author/standard/title/year — these are verifiable and stable. A bare unsourced "best practice" is not acceptable; either name the source or drop the claim.
- **Distinguish normative from informative references.** A normative reference defines an obligation the design adopts (e.g. "errors follow RFC 9457"). An informative reference explains or justifies (e.g. "this mirrors event sourcing, see Fowler"). Mark which is which in the References section.
- **Cite to strengthen, not to decorate.** A citation earns its place by changing what a reader should do or believe.

A canonical **standards register** — the external sources this corpus leans on, with the modules that use each — lives in [`02-standards/STANDARDS-REGISTER.md`](./STANDARDS-REGISTER.md). New citations are added there so the corpus shares one bibliography.

---

## 6. Worked examples

Every design or contract document that defines a non-obvious behaviour carries at least one worked example: concrete entities, a concrete viewpoint, concrete values, walked end to end. Examples use the seed metamodel ([`docs/data/meta/core-v1.json`](../data/meta/core-v1.json)) and seed dataset ([`docs/data/base/baseline.yaml`](../data/base/baseline.yaml)) so they stay consistent across documents and runnable against the real product.

Worked examples must use **real type and relationship identifiers** from the seed metamodel — `Capability`, `Application`, `serves`, `realises`, `accesses` — not invented ones. An example built on a type that does not exist teaches the reader something false.

A good worked example states: the starting facts, the viewpoint, the resolution or computation step by step, and the result including its honest-state flags. Resolution examples follow the form used in the glossary's _effective interval_ definition.

---

## 7. Diagrams

- **Mermaid** for flowcharts, sequence, state, and class/ER diagrams embedded in Markdown. It renders in the repository host and stays diffable.
- **Structurizr DSL** (`01-architecture/c4/`) for C4 model views _(Brown, The C4 Model for Visualising Software Architecture)_. Architecture documents reference the C4 views rather than redrawing them.
- Every diagram has a one-line caption stating what it shows and is referenced from the prose. A diagram that the text never mentions is removed.
- ASCII layout sketches are acceptable for shell/region layout where pixel intent matters and Mermaid would over-formalise.

---

## 8. The unified scales

Several documents independently referred to "confidence", "integrity", and "strength" without a shared definition. There is now one definition of each, set by ADR and used everywhere. Documents reference these; they do not redefine them.

### 8.1 Integrity score

An **integrity score** is a number in `[0.0, 1.0]` that Praxis computes for an entity, relationship, artefact result, or subgraph, expressing how well-founded the modelled content is. It is **Inferred** content (it is derived, traceable, and recomputed when inputs change), never Asserted. It is defined by **[ADR-0020](../06-adrs/ADR-0020-integrity-scoring-model.md)** across five dimensions:

| Dimension         | Question it scores                                                                                 |
| ----------------- | -------------------------------------------------------------------------------------------------- |
| **Completeness**  | Are the slots and relationships the metamodel and semantic spine expect actually present?          |
| **Connectivity**  | Is the content reachable along the expected spine, with no orphan where the spine requires a link? |
| **Recency**       | How fresh are the supporting facts against the freshness policy for their type?                    |
| **Consistency**   | Does the content violate any effective-schema validation rule or cardinality constraint?           |
| **Corroboration** | Is there evidence — a source, an import lineage, an accepted Change Event — behind the claims?     |

The composite is a weighted mean with documented default weights and a default **gate threshold** below which dependent analytics declare themselves bounded. A score is never shown without the ability to drill into its five dimensions; an opaque number is not explainable.

### 8.2 Confidence

**Confidence** is a quality signal attached to a result, signal, or generated suggestion, expressing how much it should be relied upon. It is presented as an ordinal label with a defined score band, optionally accompanied by the underlying number, and is defined by **[ADR-0021](../06-adrs/ADR-0021-confidence-and-trust-scale.md)**:

| Label          | Band        | Meaning                                                |
| -------------- | ----------- | ------------------------------------------------------ |
| **High**       | `≥ 0.85`    | Well-corroborated; safe to act on within stated scope. |
| **Medium**     | `0.60–0.85` | Usable with awareness of its caveats.                  |
| **Low**        | `0.30–0.60` | Indicative only; verify before acting.                 |
| **Indicative** | `< 0.30`    | A prompt to look, not a basis to decide.               |

Confidence and integrity are distinct: integrity scores _the model content_; confidence qualifies _a result derived from it_. A high-integrity subgraph can still yield a low-confidence analytical result if the analysis was bounded or approximated.

### 8.3 Criticality and other domain enums

Domain-level ordinal attributes (Capability `tier`, BusinessProcess `criticality`, Application `disposition` and `lifecycle`, DataEntity `sensitivity`) are defined by the metamodel, not by this standard. Documents use the seed enum values verbatim and never invent new bands.

---

## 9. Honest-state vocabulary

The product's honesty obligations rest on a fixed set of states. Earlier drafts used overlapping, slightly different lists across documents; this is the single set. Two orthogonal axes:

**Axis A — Content classification** (what _kind_ of claim a fact is; from the glossary):

| State         | Meaning                                                                                       |
| ------------- | --------------------------------------------------------------------------------------------- |
| **Asserted**  | Explicitly stated or accepted by a human or trusted source; controlled truth.                 |
| **Inferred**  | Derived by declared rule, structure, or analytics; traceable; recomputed on input change.     |
| **Generated** | Produced by an LLM/ML process; a suggestion until acceptance writes a new Asserted operation. |

**Axis B — Result state** (the condition of a result or projection at the moment it is shown):

| State                 | Meaning                                                                                   |
| --------------------- | ----------------------------------------------------------------------------------------- |
| **Fresh**             | Computed against current canonical material; no known staleness.                          |
| **Stale**             | A canonical input changed since this was computed; re-evaluation is due.                  |
| **Rebuilding**        | A derived structure is being recomputed; the shown result is a prior snapshot.            |
| **Partial / Bounded** | A fanout, depth, size, or time limit capped the result; coverage is incomplete by design. |
| **In progress**       | Accepted work is still executing; the result is a prior or interim state.                 |
| **Awaiting review**   | Content is queued for human confirmation (e.g. an import exception or steward task).      |
| **Failed**            | Execution errored; partial results, if any, are shown with explicit coverage.             |

A surface may carry one content classification per element and any number of result states. The two axes never collapse into one badge: "Generated" (a claim kind) is not the same as "Stale" (a freshness condition), and a result can be both.

---

## 10. Module and crate naming

Modules carry short, conceptual names from Greek and Latin roots; the name evokes the module's role and never the technology it currently uses. The full set after this revision:

| Module        | Crate(s)                             | Role                                                                                                                                                                                                            |
| ------------- | ------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Praxis**    | `praxis`                             | Meaning: metamodel, types, edge catalogue, tasks, artefact execution, integrity scoring, explainability.                                                                                                        |
| **Mneme**     | `mneme`, `mneme_core`, `mneme_store` | Storage: op log, bitemporal facts, schema-as-data, blob store, derived runtime, engine trait.                                                                                                                   |
| **Metis**     | `metis`                              | Analytics: deterministic, bounded graph computation — centrality, impact, paths, cost.                                                                                                                          |
| **Chrona**    | `chrona`                             | Time and scenario interpretation: viewpoint resolution, layer policy, diff, scenario composition.                                                                                                               |
| **Continuum** | `continuum`                          | Local durable orchestration: jobs, retries, schedules, workflow composition, run ledger.                                                                                                                        |
| **Host**      | `desktop` (src-tauri)                | The Tauri trust boundary: typed IPC, capabilities, workspace lifecycle, OS integration, event bus.                                                                                                              |
| **Engine**    | `engine`                             | The shared engine harness wiring the domain engines behind their traits for the host. _(Newly documented; see its README.)_                                                                                     |
| **Kairos**    | _(planned)_                          | Opportune time: investment and portfolio/programme/project planning, driven by the two forces of change (entropy and action). Pairs with Chrona — _chronos_ (sequential time) and _kairos_ (the moment to act). |
| **Lexis**     | _(planned)_                          | Search and discovery: full-text and semantic/vector retrieval over the twin, bounded and viewpoint-aware.                                                                                                       |
| **Pylon**     | _(planned)_                          | Interchange: file/manual import/export and connectors — ArchiMate Open Exchange, CSV/Excel, EA-tool connectors.                                                                                                 |
| **Skopos**    | _(planned)_                          | Automated discovery / reality-sync: continuous ingestion from cloud, CMDB, and monitoring to keep the `actual` layer fresh; the entropy feeder for Kairos. Distinct from Pylon (manual/file).                   |
| **Sophia**    | _(planned)_                          | AI assistance: LLM-assisted authoring and enrichment behind centralised guardrails; all output Generated.                                                                                                       |
| **Kerux**     | _(planned)_                          | Reporting and publishing: deterministic briefings, roadmaps, and packaged outputs with redaction by default.                                                                                                    |
| **Koinon**    | _(planned)_                          | Collaboration: sync, presence, shared workspace, and merge/conflict UX. Owns the sync-and-conflict model of [ADR-0005](../06-adrs/ADR-0005-sync-and-conflict-model.md).                                         |
| **Themis**    | _(planned)_                          | Governance: identity, RBAC, approvals, retention, audit, and capability policy. Underpins hosted mode and the Steward participation mode.                                                                       |
| **Aegis**     | _(planned)_                          | Risk, controls, and compliance: a risk register and control library mapped onto the twin; regulatory obligations over capabilities and data.                                                                    |

Planned modules are documented as design intent and labelled _planned_ until a crate exists. Their READMEs state the boundary they will occupy and the ADR that introduces them. The governing decision for the taxonomy, boundary rules, the acyclic engine graph, and the "earns its own module" test is **[ADR-0011](../06-adrs/ADR-0011-module-taxonomy-and-boundaries.md)**.

**Folded concerns.** Some concerns are real but do not yet earn a module; they are documented as capabilities _within_ an existing module, each with the explicit trigger that would split it out later: **Oikos** (run-cost / FinOps — ongoing opex/TCO, in [Metis](../05-modules/metis/README.md) + Kairos), **Krisis** (validation, rules, and data-quality — in [Praxis](../05-modules/praxis/README.md) integrity scoring), **Topos** (cartography and auto-layout/ELK — in the renderer + Praxis), **Logos** (narrative and decision rationale — in [Kerux](#10-module-and-crate-naming) + [Mneme](../05-modules/mneme/README.md)). ADR-0011 records each split-out trigger.

Frontend feature packages mirror the modules they face (`src/engines/<module>`), per [frontend/DESIGN.md](../frontend/DESIGN.md).

---

## 11. Cross-linking

- Link the **first** mention of another module, contract, or decision in a document; do not re-link every mention.
- Use **relative paths** that resolve on the repository host. Verify they resolve — a broken cross-link is a correctness defect.
- Reference **ADRs by number and title** on first mention (e.g. "[ADR-0009](../06-adrs/ADR-0009-temporal-model-valid-interval-layer-policy-viewpoint.md)").
- Each layer's `README` is the entry point for that layer; deep documents link up to it, and the top-level [`00-index/README.md`](../00-index/README.md) links down to each layer.
- Prefer linking the canonical definition over restating it. If a concept needs restating for flow, restate the conclusion and link the definition — do not fork the definition.

---

## 12. Known reconciliations

Surfacing inconsistencies is part of being transparent. The following are known divergences between documents and the implemented seed at the time of this revision. The glossary ([`CONTEXT.md`](../../CONTEXT.md)) and the seed metamodel ([`core-v1.json`](../data/meta/core-v1.json)) are **extended as part of this work** to remove these divergences at the source — documentation is authoritative and code is brought to match it ([ARCHITECTURE-BOUNDARY.md](../01-architecture/ARCHITECTURE-BOUNDARY.md), _Documentation Precedence_). Where a reconciliation has not yet landed, documents describe the **code-backed** reality and flag the intended direction; they never describe an aspiration as if it were already implemented.

1. **Relationship vocabulary.** `core-v1.json` ships the relationship set `serves`, `realises`, `accesses`, `hosts`, `plan_effect` — these are ArchiMate-aligned (Serving, Realization, Access, …) and are the implemented truth. The prior `EDGE-CATALOGUE.md` used a divergent set (`contributes_to`, `delivers`, `uses_data`, `deployed_on`, `change_affects`, plus `depends_on`/`belongs_to` which the seed does not define), and `deployed_on` was the _reverse_ direction of the seed's `hosts`. **Reconciliation:** the canonical catalogue adopts the seed's ArchiMate-aligned names and directions; any additional generic relationships (a fallback dependency, a containment) are introduced explicitly as extensions with rationale, per the catalogue's own extension rule. See [ADR-0011](../06-adrs/ADR-0011-module-taxonomy-and-boundaries.md) and the rewritten [EDGE-CATALOGUE.md](../05-modules/praxis/EDGE-CATALOGUE.md).

2. **Master types and the semantic spine.** `DESIGN.md` describes a semantic spine of _master types_ (Actor → Intent → Value → Capability → Execution → Technology → Change). The seed metamodel implements concrete _entity types_ (`ValueStreamStage`, `Capability`, `BusinessProcess`, `Application`, `DataEntity`, `TechnologyComponent`, `PlanEvent`, `MetaModelEntry`) and does not yet define Actor/Intent/Value as types. **Reconciliation:** the semantic spine is documented as a _normative design model_ — the lineage along which integrity and explainability reason — and its mapping to implemented types is made explicit. Spine roles not yet present as types are labelled _planned_, not described as if they exist.

3. **Glossary authority.** The root [`CONTEXT.md`](../../CONTEXT.md) is the canonical glossary and is more precise than several older documents (entity/relationship vs node/edge; Change Event vs Operation; Artefact vs Artefact result). All documents conform to it; where an older document used an `_Avoid_` term, the rewrite corrects it.

---

## 13. Review checklist

A document is not finished until every box holds:

- [ ] Opens with a purpose statement; long documents carry a Contents list.
- [ ] Uses [`CONTEXT.md`](../../CONTEXT.md) vocabulary exactly; no `_Avoid_` terms.
- [ ] British English; present tense; deliberate must/should/may.
- [ ] Every system claim links to canonical material or is marked design intent.
- [ ] Every best-practice claim cites a named primary source, recorded in the [standards register](./STANDARDS-REGISTER.md).
- [ ] At least one worked example using real seed identifiers, where behaviour is non-obvious.
- [ ] Uses the unified integrity/confidence scales (§8) and honest-state vocabulary (§9) without redefining them.
- [ ] Diagrams captioned and referenced; cross-links resolve.
- [ ] Names the trade-off where a choice closes a door.
- [ ] Ends with References & standards and Related documents.
- [ ] Markdown is Prettier-formatted.

---

## References & standards

_Normative for documentation form:_

- The C4 Model for Visualising Software Architecture — Simon Brown. _(diagram convention for architecture views)_
- RFC 9457, Problem Details for HTTP APIs (and predecessor RFC 7807). _(error-envelope citation form)_
- Markdown Architecture Decision Records (MADR) and Nygard's original ADR pattern. _(ADR shape — see [ADR-FORMAT.md](./ADR-FORMAT.md))_

_Informative — house references reused across the corpus (full list in the [standards register](./STANDARDS-REGISTER.md)):_

- ISO/IEC/IEEE 42010:2022, Architecture description.
- The Open Group, ArchiMate 3.2 Specification, and TOGAF Standard 10th Edition.
- Snodgrass, Developing Time-Oriented Database Applications in SQL, 1999; SQL:2011 temporal features.
- WCAG 2.2; W3C Design Tokens Community Group format.

## Related documents

| Document                                         | What it covers                                                               |
| ------------------------------------------------ | ---------------------------------------------------------------------------- |
| [`CONTEXT.md`](../../CONTEXT.md)                 | The canonical domain glossary — the source of truth for vocabulary.          |
| [DESIGN-GOVERNANCE.md](./DESIGN-GOVERNANCE.md)   | How durable decisions are classified and reviewed.                           |
| [ADR-FORMAT.md](./ADR-FORMAT.md)                 | The required shape of an ADR.                                                |
| [STANDARDS-REGISTER.md](./STANDARDS-REGISTER.md) | The shared bibliography of external standards and the modules that use each. |
| [00-index/README.md](../00-index/README.md)      | The documentation map and entry points.                                      |
