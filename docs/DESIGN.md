# Aideon Praxis

<!-- markdownlint-disable MD013 -->

The intelligent companion that turns design intent into action over time.

Author: Jolyon Suthers

## Architecture Overview

The platform is a **graph-native Enterprise Architecture (EA) intelligence system** designed to
model the whole “language of the business” in line with a robust meta-model. Applications can serve
multiple processes, and data entities link to many applications—all these many-to-many relationships
are first-class in the graph.

At a high level, the architecture consists of a **graph database (property-graph by default)**, a
local Electron application layer, and a modular integration layer. **Semantic validation/reasoning
is optional and runs out-of-process in the Python worker.** **Versioning is snapshot‑based:** the
product creates immutable snapshots that capture the complete state of the graph at a point in time.
You can time‑travel (play forward/backward) by replaying snapshots and change sets, compare any two
snapshots, and branch into scenarios. This design borrows from distributed VCSs (e.g., Git’s
“snapshots, not diffs” model) while remaining database‑agnostic and safe for local‑first use and
future multi‑user/server mode.

This platform is designed for **many-to-many relationships and graph queries** from the ground up.
Unlike traditional EA tools built on rigid hierarchies, this graph-native approach allows, for
instance, an application to link to multiple business services, supported by multiple capabilities
and vendors, without data duplication. The rich connectivity enables advanced analytics like impact
analysis and pathfinding (more in the **Analytics** section). Despite its advanced capabilities, the
solution remains **practical and lightweight** – the initial deployment runs locally as a desktop
app, ensuring data stays on the user’s device and performs well without requiring a costly server
setup. This local-first design addresses privacy and cost concerns, while the architecture remains
cloud-ready for future scaling or team collaboration needs.

**Modules:**

- **Aideon Praxis** — core digital twin platform
- **Aideon Chrona** — time-based visualisation layer
- **Aideon Metis** — analytical reasoning module (as a nod to wisdom, not the standalone brand)
- **Aideon Continuum** — orchestration/automation engine

## Strategy-to-Execution Map (normative)

**Purpose:** Provide an explicit, testable "line of sight" from strategy to running solutions. This
is the backbone for traceability, analytics, and governance.

- **BMM Motivation → Strategy**: Drivers & Assessments shape **Goals** and **Objectives**;
  **Principles** and **Requirements** constrain design.
- **Strategy → Value**: **Value Streams** express how value is created; **Capabilities serve Value
  Stream stages** and are the unit of capability-based planning.
- **Value → Services & Products**: **Business Services** and **Products** realise value; define
  **Touchpoints** (Business Interfaces) for customer interactions.
- **Operating Model guardrails**: Declare integration/standardisation levels per domain; these guide
  platform/process patterns.
- **Process & Information**: **Processes/Functions** deliver services and **access** **Data
  Entities**.
- **Applications & Data**: **Application Services** realise processes and encapsulate **Data
  Entities**; **APIs/Interfaces** expose them.
- **Technology & Cloud**: **Technology Services/Components** serve application layer; **Landing
  Zones** provide guardrails; **Environments** group deployments.
- **Portfolios & Lifecycle**: Applications/Technologies carry **disposition (TIME)** and lifecycle;
  risks & costs tracked as Measures.
- **Roadmaps & Programmes**: **Work Packages/Initiatives** realise capability deltas towards target
  **Plateaus**; **Gaps** derive from Plateaus.
- **Solution/Integration Architectures**: Interfaces & patterns (EIP) implement integration; designs
  trace back to Goals/Requirements.

**Derivation rules (authoritative shortcuts):**

- Capability _serves_ Value Stream Stage; Business/Application/Technology Service _serves_ its
  upstream layer.
- Process _realised by_ Application Service; Process _accesses_ Data Entity (`mode: read|write`).
- Work Package _realises_ change to {Capability\|Process\|Application\|Technology Component} and
  _delivers_ Deliverables that _realise_ a **Plateau**.
- **Gap** is computed between two Plateaus; do not model Gap links manually.
- Landing Zone _governs_ Environments; Policies are Technology Services assigned to Landing Zone.
- Application **disposition** informs **Roadmap**: (Invest→create/change Work Package;
  Migrate→create replacement; Eliminate→decommission plan; Tolerate→monitor until review_date).

## Core Meta-Model v0.4 (authoritative, ArchiMate-aligned)

**Purpose:** Define a pragmatic, ArchiMate-aligned core that the whole product (UI, APIs, analytics)
treats as the single source of truth. Names stay business-friendly while mapping 1:1 to ArchiMate®
3.2. **Time is first-class** via bitemporal attributes and plan events.

### 1) Element types & definitions (grouped)

#### Motivation & Strategy

- **Stakeholder** – role or group with an interest in architectural outcomes.
- **Driver** – condition that motivates goals/changes.
- **Assessment** – analysis of a driver/situation (e.g., SWOT, risk or audit finding).
- **Goal** – desired state/outcome at a high level (Ends).
- **Objective** – time-bound target that supports a Goal.
- **Principle** – normative statement guiding design.
- **Requirement** – verifiable need or property to be met (functional/non-functional).
- **Constraint** – limitation on design or implementation.
- **Capability** – ability the organisation/system possesses.
- **Value Stream** – sequence of value-creating **stages**.
- **Course of Action / Strategy** – plan to configure capabilities/resources to achieve goals.

#### Business

- **Organisation Unit** – actor/role/team with accountability.
- **Business Process** – sequence of behaviours achieving a result.
- **Business Function** – grouping by competency.
- **Business Service** – externally exposed behaviour of a business role/actor/collaboration.
- **Business Interface (Touchpoint)** – access point used by customers/personas to consume a
  Business Service.
- **Business Object / Product** – information or offering.

#### Application

- **Application** (component) – deployable encapsulation of app functionality.
- **Application Service** – externally exposed behaviour of an application.
- **Application Interface / API** – access point to an application service.
- **Data Entity** (data object) – data structured for automated processing.

#### Technology & Cloud

- **Technology Component** (node/platform) – runtime, platform or infra component.
- **Technology Service** – exposed technology behaviour.
- **Technology Interface** – access point to a technology service.
- **Artifact / Deployment Unit** – packaged deployable artefact.
- **Environment** – logical deployment context (dev/test/prod/region).
- **Landing Zone** – opinionated set of platform guardrails and policies governing Environments.

#### Implementation & Migration

- **Work Package / Initiative** – unit of work to realise change.
- **Deliverable** – result produced by a work package.
- **Plateau** – relatively stable architectural state (e.g., Baseline-2025, Target-2027).
- **Gap** – computed difference between two Plateaus.
- **Implementation Event / Milestone** – state change in implementation.
- **Plan Event** – **scheduled effect** (projection) that changes the state of one or more
  elements/relations at a future `effective_at` (see attributes).

#### Measurement, Finance & Governance

- **Measure / KPI** – quantitative indicator bound to an element.
- **Risk** – uncertainty with effect on objectives.
- **Decision / ADR** – recorded architectural decision with rationale and links to impacted
  elements.
- **Policy** – parameter set for cost/inflation/FX/discounting or guardrails (type:
  `{inflation|fx|discount|platform}`) with validity.
- **Cost Curve** – time-series of costs by element (acquire/run/change/exit/residual) with currency
  and policy references.

> Mapping: Touchpoint → ArchiMate Business Interface; Data Entity → Data Object; Application →
> Application Component; Landing Zone → Technology Node + Policy Services; **Plan Event**
> specialises ArchiMate Implementation Event.

### 2) Relationship set (ArchiMate-style)

#### Structural

- **Composition/Aggregation**: Capability↦Capability (decomposition, acyclic); Value Stream↦Value
  Stream (stages); Process↦Process (sub-process); Application↦Application (module); Organisation
  Unit↦Organisation Unit (hierarchy); Work Package↦Deliverable; Landing Zone↦Technology Service
  (policies); Policy↦Technology Service (guardrail set).
- **Realization**: Application↦Application Service; Technology Component↦Technology Service; Course
  of Action↦Capability; Deliverable↦Plateau; Work Package↦Deliverable; Product↦Business Service;
  Cost Curve↦{Application\|Technology Component\|Service} (_costed_by_).
- **Assignment**: Organisation Unit↦{Capability\|Process\|Business Service\|Data Entity (steward)};
  Application↦{Application Service\|Data Entity (owner)}; Technology Component↦Technology Service;
  Touchpoint↦Business Service (exposed via).
- **Specialization**: Any element↦subtype (taxonomies/patterns).

#### Dependency

- **Serving**: Capability _serves_ Value Stream stage; Business Service _serves_ Actors/Roles;
  Application Service _serves_ {Business Process\|Business Service}; Technology Service _serves_
  Application layer.
- **Access**: {Process\|Application Service} _accesses_ Data Entity (`mode: read|write|read/write`).
- **Influence**: {Driver\|Assessment\|Principle\|Goal\|Outcome} _influences_
  {Goal\|Requirement\|Capability\|Course of Action} with `polarity` and `strength`.
- **Governed-by**: Environment _governed_by_ Landing Zone; Environments/Components/Services
  _governed_by_ Policy where applicable.
- **Applies-to (projection)**: **Plan Event applies_to** {any element or relation}; effects realised
  by `state_at()` materialisation.
- **Association**: when a more specific relation does not apply (minimise use).

#### Dynamic

- **Triggering**: Event or Process _triggers_ Process/Function/Action.
- **Flow**: Value Stream stage _flows to_ next stage (value flow); Data _flows_ between Application
  Services/Interfaces.

#### Implementation/Migration

- Work Package _realises changes to_ {Capability\|Process\|Application\|Technology Component}; Work
  Package _serves_ Objectives by delivering Outcomes; Plateau _realises_ a set of
  Capabilities/Elements; **Gap** is derived between Plateaus.

### 3) Attribute model (normative)

#### Common element attributes

- `id: UUID`, `type`, `name`, `description`, `aliases: [string]`
- `owner: OrganisationUnit?`, `lifecycle_state: enum{draft, active, deprecated, retired}`
- `state: enum{current, target, scenario-*}`
- **Bitemporal**: `valid_from: datetime?`, `valid_to: datetime?`, `recorded_from: datetime`,
  `recorded_to: datetime?`
- `criticality: enum{low, medium, high, critical}`, `risk_rating: enum{low, medium, high}`
- `cia: {confidentiality, integrity, availability} -> enum{low, medium, high}`
- `cost: currency?`, `sla: string?`, `tags: [string]`, `external_ids: map<string,string>`
- `source_of_truth: string?`, `evidence: url?`, `created_at`, `updated_at`, `created_by`,
  `updated_by`

#### Application-specific

- `disposition: enum{Tolerate, Invest, Migrate, Eliminate}`
- `review_date: date?`, `rationale: string?`

#### Data-specific (Data Entity)

- `classification: enum{public, internal, confidential, restricted}`
- `pii: boolean`, `retention_policy: string?`

#### Plan Event (projection)

- `id: UUID`, `name`, `description?`, `effective_at: datetime`, `confidence: 0..1`
- `effects: [ { op: enum{create|update|delete|link|unlink}, target_ref, payload? } ]`
- `source: {work_package?:ref, policy?:ref, adr?:ref}`

#### Cost Curve

- `element_ref`, `currency`,
  `series: [ { type: enum{acquire|run|change|exit|residual}, amount:number, unit: enum{one_off|per_month|per_year}, effective_at: datetime } ]`
- `inflation_policy_ref?`, `fx_policy_ref?`, `discount_policy_ref?`

#### Relationship attributes

- `id`, `type`, `source`, `target`, `role: string?`, `cardinality: string`
- `mode: enum{read, write, read/write}` (Access)
- `polarity: enum{+, −}`, `strength: 0..1` (Influence)
- `weight: number?`, `since: datetime?`, `until: datetime?`, `confidence: 0..1`
- `evidence: url?`, `source_of_truth`

### 4) Constraints & integrity rules

- **Uniqueness:** `(type, name, state)` unique in scope.
- **Ownership:** Every **Application** and **Process** must have an **Organisation Unit** owner;
  every **Data Entity** with `Access(write)` must declare a steward.
- **Realisation:** Business Service realised by ≥1 Process/Function; Application Service by ≥1
  Application; Technology Service by ≥1 Technology Component.
- **Decomposition:** Capability/Process decomposition acyclic.
- **Temporal:** `valid_to` excludes elements from _current_ views; `AS OF` queries use `valid_*`
  first, then snapshot/recorded fallbacks.
- **Plan Events:** Effects must validate against meta-model; conflicting effects at same
  `effective_at` require resolution (policy: last-writer or priority by source).
- **Cloud guardrails:** Any Environment must be `governed_by` a Landing Zone in server/cloud mode.

### 5) Enumerations & vocabularies (starter sets)

- **Lifecycle state:** `draft | active | deprecated | retired`
- **Risk rating:** `low | medium | high`
- **Criticality:** `low | medium | high | critical`
- **Data classification:** `public | internal | confidential | restricted`
- **Capability maturity:** `1..5` (stored as Measure bound to Capability)
- **Operating model metrics (per domain):** `integration_level: 0..3`, `standardisation_level: 0..3`

### 6) Viewpoint bindings (selected)

- **Capability Map:** nodes=Capability (grouped by decomposition), overlays=Measure (maturity/health
  over time).
- **Value Stream View:** nodes=Value Stream (stages), edges=Flow; overlays show **Serving**
  Capabilities and Services at **AS-OF**.
- **Service Blueprint:** lanes for **Customer actions**, **Touchpoints**, **Frontstage/Backstage
  Processes**, **Support**, **Evidence**; each step binds to Process/Service/Data; planned changes
  render dashed with confidence shading.
- **Portfolio (Application/Technology):** cards with lifecycle, **disposition**, owner, costs,
  risks; **EoL** and **review_date** drive diverging colour scale.
- **Roadmap:** Plateaus, Work Packages, Deliverables, Milestones; **Gap** auto-derived between any
  two Plateaus.
- **Cloud/Deployment:** Environments, Landing Zones, Technology Components/Services; policy
  conformance at **AS-OF**.

### 7) Extensions & mapping

- **ArchiMate mapping:** preserve `type_mapping` for export/import. Where names differ, store the
  canonical ArchiMate 3.2 type.
- **Local extensions:** New types must declare base category, underlying relation types,
  constraints, and UI bindings.

## Viewpoint Library (ISO 42010‑aligned)

Each viewpoint states stakeholders, concerns, primary elements/relations, mandatory overlays, and
export formats.

### 1. **Strategy & Motivation View**

- _Stakeholders_: Executives, Strategy, Enterprise Architects.
- _Concerns_: Why change? Goals, drivers, principles, constraints, assessments.
- _Elements/Relations_: {Driver, Assessment, Goal, Objective, Principle, Requirement, Constraint,
  Course of Action} with **Influence** links.
- _Exports_: SVG/PNG/PDF; CSV of goals/objectives with lineage.

### 2. **Capability Map View**

- _Stakeholders_: Execs, Business Owners, EAs.
- _Concerns_: What we can do; maturity/health; ownership.
- _Elements_: Capability (+ decomposition), Organisation Unit (owner), Measures; **Serving** links
  to Value Stream stages.

### 3. **Value Stream View**

- _Stakeholders_: Product, Service Design, Ops.
- _Concerns_: How value is created; stage performance.
- _Elements_: Value Stream (stages) + **Flow**; overlays of Serving Capabilities and
  Business/Application Services.

### 4. **Service Blueprint View**

- _Stakeholders_: CX/UX, Service Design, Ops.
- _Concerns_: Touchpoints, frontstage/backstage alignment, evidence, bottlenecks.
- _Elements_: Touchpoints (Business Interfaces), Processes/Functions (frontstage/backstage), Support
  Processes, Evidence (Artifacts), Data Entities accessed.
- _Rules_: Every step maps to at least one Process and (where relevant) a Service/Data Entity.

### 5. **Information View**

- _Stakeholders_: Data, Compliance, Architects.
- _Concerns_: Ownership, classification, lineage, PII.
- _Elements_: Data Entities with `classification`, `pii`, steward owner; **Access** relations from
  Processes and Application Services.

### 6. **Application Portfolio View**

- _Stakeholders_: CIO, App Owners, Finance.
- _Concerns_: Cost/risk, lifecycle, **disposition (TIME)**, capability fit.
- _Elements_: Applications with Measures (cost/risk), `disposition`, lifecycle, owners; links to
  Capabilities/Services.

### 7. **Integration View**

- _Stakeholders_: Integration/Solution Architects, Security.
- _Concerns_: Interface contracts, patterns, data flows.
- _Elements_: Application/Technology Services, Interfaces/APIs; **Flow** edges; catalogued **EIP
  patterns** (Message Broker, Pub/Sub, Canonical Data Model, Routing Slip, Saga, Circuit Breaker).
- _Rules_: Each interface declares auth, protocol, pattern(s), data contracts; security
  classification aligns with Data Entity classification.

### 8. **Cloud/Deployment View**

- _Stakeholders_: Platform, SecOps, FinOps, SRE.
- _Concerns_: Guardrails, environments, policy conformance.
- _Elements_: Landing Zone (policies as Technology Services), Environments, Technology Components;
  assignments and conformance checks.

### 9. **Roadmap View**

- _Stakeholders_: PMO, Portfolio, Execs.
- _Concerns_: Sequencing, risk, value.
- _Elements_: Plateaus, Work Packages, Deliverables, Milestones; **Gap** auto‑derived; overlays for
  value/risk.

### 10. **Solution Architecture View**

- _Stakeholders_: Solution/Domain Architects, Delivery.
- _Concerns_: Realisable design, NFRs, traceability to goals.
- _Elements_: Selected subset across layers, interface specs, NFRs, ADRs; trace back to
  Requirements/Goals.

## Functional Requirements to Support Strategy‑to‑Execution (authoritative)

### Traceability & Lineage

- One‑click lineage panel showing "Goal → Value Stream stage → Capability → Service/Process →
  App/API → Tech → Environment" with jump links.
- Show generated **derivation** edges (read‑only) where rules infer relationships (e.g., Gap between
  Plateaus).

### Validation & Data Quality

- Rule engine enforcing meta‑model constraints (ownership, acyclicity, realisation, PII stewardship,
  Landing Zone governance).
- Data quality dashboards: orphan capabilities, processes without services, apps without owners,
  blueprint steps without process links, etc.

### Service Blueprint Editor

- Canvas with lanes: Customer actions, Touchpoints, Frontstage, Backstage, Support, Evidence.
- Bind steps to underlying Processes/Services/Data; export **SVG/PNG/PDF** and **Mermaid/PlantUML**
  snippets.

### Portfolio Management

- Application cards with **TIME disposition**, lifecycle, owner, risk/cost; bulk edit and review
  cycles; export to CSV.

### Roadmapping

- Multi‑row roadmap (Tracks: Market/Customer, Value Streams, Capabilities, Services/Products,
  Applications, Technology, Work Packages, Milestones).
- Diff views: Current vs Target (Plateaus); auto compute **Gap**; export to SVG/PNG/PDF.

### Integration Catalogue

- Registry of Interfaces/APIs with pattern selection (EIP), auth, protocols, contracts; impact
  analysis across flows.

### Cloud Guardrails

- Landing Zone catalogue with policy checks; Environment conformance; evidence links to control
  tests.

### APIs & Exports

- GraphQL/REST (read‑only desktop; R/W server) for lineage queries and report feeds.
- Data exports: JSON/CSV/GraphML; large sets via **Arrow**. Diagram exports: **SVG/PNG/PDF**.

### Governance Cadence

- Schedulers for quarterly OKR/OGSM refresh, capability maturity scoring, and TIME reviews; monthly
  data‑quality sweep; ADR capture workflow.

## Time & Colour Encoding (Date-Driven Narrative)

### Palettes (accessible by default)

- **Sequential (freshness/staleness):** Blues-5 (or YlOrRd-5).
- **Diverging (schedule risk):** Blue↔Orange-7 centred on _today_.
- **Categorical:** Okabe-Ito set for status chips/legends.

### Binning & rules (defaults)

- **Freshness (updated_at):** 0–30d, 31–90d, 91–180d, 181–365d, \>365d.
- **Due-date risk (**`due_date − today`**):** ≥+60d well ahead; +59…+15d ahead; +14…0d tight;
  −1…−30d overdue; \<−30d severely overdue.
- **Validity:** inactives (outside valid window at AS-OF) greyed; starting within 30d get **dashed
  borders** (shape, not colour alone).
- **Scenario compare:** Added = blue outline; Removed = orange cross-hatch; Changed = purple halo.

### Story modes (presets)

- **Freshness Spotlight**, **Delivery Risk**, **EoL Radar**, **Scenario Trade-off**, **Validity
  Time-Travel**.

#### Config (example)

```json
{
  "palettes": { "sequential": "Blues-5", "diverging": "BlueOrange-7", "categorical": "OkabeIto" },
  "thresholds": { "freshness_days": [30, 90, 180, 365], "due_days": [60, 15, 0, -30] },
  "encodings": {
    "freshness": { "field": "updated_at", "type": "temporal", "scheme": "sequential" },
    "risk": { "field": "due_date", "type": "temporal", "scheme": "diverging", "center": "today" },
    "validity": { "fields": ["valid_from", "valid_to"], "inactive": "desaturate" }
  },
  "c11y": { "minTextContrast": "4.5:1", "colorblindSwitch": true, "usePatterns": true }
}
```

## Analytics and Reporting

### Temporal & Scenario Analytics

- **Plateau/Gaps:** compute structural/property deltas and roll-ups by Capability, Value Stream
  stage, Portfolio.
- **Topology deltas:** recompute centrality, articulation points and shortest-path changes between
  any two Plateaus (risk hotspots that move).
- **Trajectory analytics:** maturity curves and service coverage over time; trend and drift
  detection against targets.
- **Confidence analysis:** filter results by Plan Event `confidence` to compare optimistic vs
  conservative projections.

### Technology Stack Recommendation

**Backend-Agnostic Graph Layer:** The product talks to the database through a `GraphAdapter` and
`QueryAdapter`. The default deployment uses a property-graph implementation for traversal speed;
semantic validation and reasoning run out-of-process in the Python worker as an optional pass.
Backends with native RDF/OWL/branching map cleanly via adapters; others emulate via schema rules and
temporal tags. This prevents a rebuild when moving to cluster/server mode.

### Adapter Contracts (normative)

- `GraphAdapter`: CRUD, traversal, pattern query, snapshot/filter by `state`.
- `QueryAdapter`: compile NL2Q/SPARQL/Cypher templates to the active backend; the renderer must not
  embed DB-specific queries.
- `StorageAdapter`: workspace open/close, encryption-at-rest, backup/restore.

### Desktop Application Layer

The UI runs in Electron (Chromium renderer) with a hardened preload boundary; the host process is
Node.js. Heavy analytics and ML execute in a long‑lived **Python worker** started and supervised by
the host. Communication uses a local named pipe/domain socket (no open TCP ports) with a per‑launch
token. The host exposes local **REST and GraphQL** endpoints (bound to localhost) for automation/BI;
the renderer uses a private IPC API, not HTTP. Security hardening: **disable the remote module**,
**enable process sandboxing**, define a restrictive **Content‑Security‑Policy**, set
`contextIsolation: true`, and keep **NodeIntegration off** in all renderers.

### Data Storage and Formats

Workspaces persist on the local filesystem. The schema is versioned and validated at write-time.
Versioning semantics are product-level (snapshots and scenarios via `state`/temporal properties);
adapters for engines with native branching map 1:1. Data export/import supports JSON/CSV and an
optional line-delimited Arrow stream for large extracts. **Versioned schema** with **forward-only
migrations**; ship migration scripts; record schemaVersion in workspace.

## C4 Architecture Views (normative)

This section defines the canonical C4 views for the platform. We manage these as
**diagrams-as-code** so they stay versioned alongside the product and can be auto‑generated in CI.

### C4‑1 System Context (who/what interacts with the product)

- **Primary system:** EA Desktop (Electron) + Python Worker + Graph DB (local) OR EA Server
  (remote) + Desktop/Web client.
- **Primary actors:** Architects/Designers, Exec Viewers, Data Engineers/Integrators.
- **External systems:** CMDB (e.g., ServiceNow), Cloud Provider APIs, BI tools, SSO/IdP (OIDC),
  Email/Chat (notifications).

### C4‑2 Containers (major runtime containers)

- **Desktop Host (Electron Main/Preload)** — IPC, security, local APIs.
- **Renderer (React UI)** — Modelling UI, viewpoints, editor canvas.
- **Python Worker (Sidecar)** — Graph analytics/ML via RPC (pipes/UDS).
- **Graph Database** — Property‑graph store (adapter behind `GraphAdapter`).
- **Connectors/Scheduler** — Import jobs, sync, notifications.
- **Server Mode (optional)** — Remote Graph + Remote Worker + Auth gateway.

### C4‑3 Components (inside each container)

- **Host Components:** IPC layer; `WorkerClient`; `GraphAdapter`; `StorageAdapter`; **Temporal
  Engine** (`state_at`, `diff`, `topology_delta`); **Plan Scheduler**; Local REST/GraphQL (read-only
  in desktop mode).
- **Renderer Components:** Viewpoints; Modelling Editor; Import Wizard; Reports; Auth UI (server
  mode only).
- **Worker Components:** RPC server; Algorithm modules (centrality, path/impact, clustering); Data
  frames (JSON/Arrow); Health & metrics.
- **Server Components (optional):** Auth (OIDC); RBAC; Audit; Background job runner.

> We recommend **Structurizr DSL** for source‑of‑truth and **Structurizr Lite** (local) or **CI
> export** to SVG/PNG/PDF. Teams who prefer PlantUML can use **C4‑PlantUML**; for GitHub‑native
> rendering, provide a simplified **Mermaid** equivalent.

### Structurizr DSL (excerpt)

```dsl
workspace "Aideon Praxis" {
  model {
    user = person "Architect" "Designs and analyses EA models"
    desktop = softwareSystem "EA Desktop" "Electron app + Python worker" {
      container main    "Electron Host" "Node.js" "IPC, adapters, local APIs"
      container ui      "Renderer" "React" "Modelling UI & viewpoints"
      container worker  "Python Worker" "Python" "Analytics/ML over RPC"
      container db      "Graph DB" "Property‑graph" "Nodes/edges + snapshots"
    }
    system cmdb "CMDB" "External"
    system bi   "BI Tool" "External"

    user -> desktop "Uses"
    desktop -> cmdb "Sync via connector"
    desktop -> bi   "Local read APIs"
    worker -> db    "Reads/writes via adapter"
    main -> worker  "RPC (pipes/UDS)"
  }
  views { systemContext desktop; container desktop; }
}
```

### PlantUML (C4‑PlantUML) alternative (excerpt)

```plantuml
!include C4_Context.puml
!include C4_Container.puml
Person(User, "Architect")
System(Desktop, "EA Desktop", "Electron + Python worker")
System_Ext(CMDB, "CMDB")
System_Ext(BI, "BI Tool")
Rel(User, Desktop, "Uses")
Rel(Desktop, CMDB, "Sync")
Rel(Desktop, BI, "Local read APIs")
```

### Mermaid (simplified container view)

```mermaid
graph TD
  A[Electron Host] --> B[Renderer]
  A --> C[Python Worker]
  C --> D[Graph DB]
  A --> E[Local REST/GraphQL (read)]
  E --> F[BI Tool]
  A --> G[Connectors/Scheduler]
```

### Export targets in CI

- Generate **SVG** (preferred), **PNG**, and **PDF** for all C4 views.
- Store in `docs/c4/` with a manifest so the app can show them contextually.

## Versioning, Snapshots & Collaboration (normative)

- **Snapshots (immutable):** Every save creates an immutable snapshot of the entire graph state.
  Snapshots form a DAG and are addressable by ID and timestamp.
- **Scenarios/Branches:** Users can branch from any snapshot to explore alternatives (e.g.,
  `scenario/*`). Merging produces a new snapshot with a full diff report.
- **Change sets & replay:** The system stores change sets between snapshots to support
  forward/backward “replay” for time‑travel debugging and audits.
- **Temporal queries:** `AS OF <time|snapshot>` queries reconstruct the graph at any point; optional
  **bitemporal** fields (`valid_from/valid_to` **and** `recorded_from/recorded_to`)
- **Conflict handling:** Optimistic locking with human‑readable conflict reports; per‑entity merge
  strategies for concurrent edits.
- **Backend mapping:** Backends with native history/branching map 1:1; others emulate via `state`
  tags and temporal properties—**product semantics are independent of the DB**.
- **Distributed collaboration:** In server mode, multiple editors work on branches and merge like a
  DVCS; in desktop mode, export/import of snapshots supports offline collaboration.

## Integration Layer

The platform exposes **standard integration options** to import and export data:

- **REST/GraphQL APIs:** The built‑in service endpoints allow external systems to **read data** in
  desktop mode (localhost‑bound). **Read/write** is available **only in server mode** with
  authentication (OAuth/OIDC). For example, in desktop mode a BI tool can query the GraphQL API to
  display architecture insights; in server mode a CI/CD hook could create or update entities via
  REST.
- **CSV/XLSX Upload:** There will be an import utility to map spreadsheet data into the graph. Users
  (especially data engineers or analysts) can load existing asset inventories or catalogues by
  uploading CSV/Excel files. The tool will include a simple mapping interface, e.g., allowing the
  user to specify that a column “Application Name” maps to nodes of type Application, and another
  column “Supports Process” creates a relationship with a Process node. On upload, the system will
  create or update nodes and edges, performing de-duplication based on keys where possible. This
  lowers the barrier for the initial population of the model, as many organisations have EA-related
  data in spreadsheets.
- **Catalogue Connectors:** The platform can include connectors to common enterprise sources for
  more automated sync. For example, a **ServiceNow CMDB connector** could retrieve configuration
  items (applications, servers) and load them into the graph, linking them to the corresponding
  Business Capabilities and Services. Connectors for **cloud providers** can use AWS/Azure APIs to
  fetch resources (like a list of business services deployed, or data stores) and incorporate those
  as Technology Components in the model. These connectors could be implemented as optional Node.js
  modules or scripts that can be run on demand or scheduled (see **Automation**). Simpler connectors
  involve direct database queries or API calls to sources like ERP or portfolio management tools to
  fetch data about projects, etc. The aim is to minimise manual data entry by **harvesting existing
  data** wherever possible.

### Keys & merge policy

- Natural keys by type (e.g., Application=`{name,owner}`; Data Entity=`{name,domain}`) with override
  via `external_ids`.
- Upsert order: nodes → edges; edges validated post-upsert.
- Conflicts raise DQ items (severity by type); auto-merge only when incoming = current except for
  whitelisted fields.

### Application Logic

The host enforces meta-model constraints at write-time and exposes them to the UI as typed forms and
guarded actions. Heavy analytics (centrality, impact, clustering) run in the Python worker and
return results via the RPC contract. The worker has no externally accessible ports in desktop mode.
PII guardrails and redaction are applied at the host boundary before any background task or model
inference.

## Temporal Graph & Digital Twin (normative)

**Goal:** Treat time as a first-class dimension and build a **graph-based digital twin** of the
enterprise. The repository is **bitemporal** (valid time and record/transaction time), supports
**scenario branches**, and materialises **planned effects** so any date can be rendered as a
truthful state or a projected future.

### Plan Event semantics (authoritative)

**Precedence:** If multiple Plan Events affect the same `{element, property}` at the same
`effective_at`:

1. Higher `source.priority` wins (ADR > Work Package > Policy default), else
1. Higher `confidence` wins, else
1. Latest `recorded_from` (last writer) wins.

**Idempotency:** Effects are applied using `{target_ref, op, property, value}` as a de-dup key.
Replays are safe.

**Retractions:** A `delete` effect at `effective_at` removes the element/relationship from
materialisation (it remains in history).

**Past events:** Allowed for backfill—take effect for `state_at(date ≥ effective_at)` only.

### Worked example

```json
{
  "id": "pe-123",
  "name": "CRM Phase 2 cutover",
  "effective_at": "2026-03-31",
  "confidence": 0.8,
  "source": { "work_package": "wp-crm-phase2", "priority": 50 },
  "effects": [
    { "op": "update", "target_ref": "app:CRM", "payload": { "disposition": "Invest" } },
    {
      "op": "link",
      "target_ref": "app:CRM",
      "payload": { "rel": "serves", "to": "svc:CustomerOnboarding" }
    },
    {
      "op": "unlink",
      "target_ref": "app:LegacyCRM",
      "payload": { "rel": "serves", "to": "svc:CustomerOnboarding" }
    },
    { "op": "update", "target_ref": "cap:CustomerManagement", "payload": { "maturity": 3 } }
  ]
}
```

### Plateau governance

- **Frozen** plateau: pins `snapshot_id` **and** policy versions (inflation/FX/discount). `Gap` vs
  another plateau is fully reproducible.
- **Dynamic** plateau: named `state_at(date, scenario?)` that re-materialises using the **current**
  policy set. Use for “living” roadmaps.
- Plateaus must declare `frozen: true|false` in metadata and, if frozen, store
  `{snapshot_id, policy_set_ids[]}`.

### Temporal model

- **Valid time** (`valid_from`, `valid_to`): when a fact is true in the real world.
- **Record time** (`recorded_from`, `recorded_to`): when the repository knew the fact (audit/undo).
- **Scenario axis**: parallel branches (`scenario/*`) for alternatives and what-if work.
- **Planned effects**: **Plan Events** carry `effects[]` applied at `effective_at` with
  `confidence`.

### Materialisation

- `state_at(date, scenario?) = snapshot≤date  ⊕  (all Plan Events where effective_at ≤ date and confidence ≥ threshold)  ⊕  scenario overlay`.
- **Plateau** = named `state_at()` reference; **Gap** = computed `diff(plateau_A, plateau_B)`.
- Derived edges (e.g., Gap) are **read-only** and never persisted.

### Provenance & governance

- Link Plan Events, snapshots and imports to **Decisions/ADRs** and **Policies**; record
  **agent/activity/entity** per **W3C PROV** so the story of change is queryable and exportable.

### Storage & indexing

- Index by `(valid_from, valid_to)`, `recorded_from`, `scenario`, `type` for fast slicing; compress
  Plan Events by target grouping.

### UI controls

- **AS-OF slider**, **Scenario picker**, **Confidence filter** (e.g., ≥0.7). Animated playback and
  small multiples are supported. Legends show bin thresholds and the current date.

### Performance budgets (v1)

- `state_at()` materialisation ≤ 250ms for 50k nodes / 200k edges (warm cache).
- `diff()` core (set & property) ≤ 1s for 50k/200k; `topology_delta()` (centrality delta) ≤ 90s as
  batch.

### Trust & security

- In server/cloud mode, evaluate **Plan Events** and `state_at()` in a sandboxed service; enforce
  policy on exports (classification masking) and log all materialisations for audit.

## Worker RPC Contract (normative)

- **Transport (local):** Named pipe (Windows) / Unix domain socket (macOS/Linux) or stdio.
- **Auth:** Random per-launch capability token; deadlines; backpressure.
- **Messages:** `Job{id,type,schemaVersion,payloadRef,deadline}`,
  `Result{id,status,payloadRef,metrics}`, `Health`.
- **Payloads:** JSON for small data; **Apache Arrow** for large/columnar.
- **Idempotency:** `Job.id` is a de-dup key; retries must be safe.
- **Remote mode:** Same schema over mTLS HTTP/2 (gRPC). Switching between local/remote is a config
  change; code is unchanged.
- **Windows:** set a restrictive **security descriptor/ACL** on the named pipe (avoid defaults that
  may grant Everyone read).
- **macOS/Linux:** create the Unix domain socket in a directory with restrictive **fs-permissions**;
  consider **gRPC over UDS** for remote-ready parity.

## Time-Slicing & Scenario APIs (authoritative)

### Query

- `GET /graph?as_of=YYYY-MM-DD&scenario={name}&confidence={0..1}` → materialised subgraph.
- `GET /diff?from={plateau_id|date}&to={plateau_id|date}&scope={all|type:Capability|domain:*}` →
  structural and property deltas + roll-ups.
- `GET /topology_delta?from={A}&to={B}` → centrality/bridges/shortest-path deltas.
- `GET /tco?scope={element|capability|portfolio}&as_of=&scenario=` → cost runway and PV breakdown.

### Commands

- `POST /plateaus { name, at: date|snapshot_id, scenario? }`
- `POST /plan-events { name, effective_at, confidence, effects:[...] }`
- `POST /policies { type: inflation|fx|discount|platform, params, valid_from, valid_to }`

All endpoints are localhost-bound and read-only in desktop mode; read/write is server-only with
auth.

### Schemas (concise)

#### /graph

```json
{ "as_of":"2027-06-30","scenario":"target-A","nodes":[{ "id":"app:CRM","type":"Application", "attrs":{...}}], "edges":[{ "id":"e1","type":"serves","from":"app:CRM","to":"svc:Onboarding","attrs":{...}}] }
```

#### /diff

```json
{ "from":"plateau:baseline-2025","to":"plateau:target-2027",
  "added":   { "nodes":[...], "edges":[...] },
  "removed": { "nodes":[...], "edges":[...] },
  "changed": { "nodes":[{"id":"app:CRM","props":{"disposition":{"from":"Tolerate","to":"Invest"}}}], "edges":[...] },
  "rollups": { "by_capability":[{"cap":"CustomerMgmt","added":3,"removed":1,"changed":4}] }
}
```

#### /topology_delta

```json
{
  "from": "A",
  "to": "B",
  "centrality": { "app:CRM": { "delta": +0.12 } },
  "bridges": ["app:ETL"],
  "shortest_path_changes": [{ "from": "svc:A", "to": "svc:B", "old_len": 5, "new_len": 3 }]
}
```

#### /tco

```json
{ "scope":"portfolio:Apps","as_of":"2027-06-30","pv_total": 12_340_000,
  "breakdown":[{"element":"app:CRM","pv":4_200_000,"series":[{"type":"run","pv":...},{"type":"change","pv":...}]}],
  "policies":{"inflation":"pol:CPI-v3","fx":"pol:FX-2027H1","discount":"pol:WACC-8pc"}
}
```

## Interfaces and User Types

The platform will offer tailored interfaces for different **user personas**, recognising that an
Enterprise Architect has different needs from a C-level executive or a data engineer. All interfaces
are accessible through the Electron desktop app (and in the future via web UI for a cloud
deployment). Still, the experience will adapt based on the user's role or selected mode.

### Business Architects & Service Designers

These users must **navigate, create, and refine architecture models** visually and intuitively. For
them, the platform provides a **graphical modelling workspace**. This includes interactive diagrams
and maps of the enterprise, such as capability maps, value stream diagrams, service blueprints, and
process models. A business architect can click on a Business Capability and see its relationships
(the processes it enables, the products it contributes to, the applications supporting it, etc.) in
a network or hierarchical view. The UI allows dragging and dropping connections between elements –
e.g. connecting a Capability to a Value Stream or moving an application under a different Capability
– with the underlying graph updating accordingly. We will support **visual notations and layouts**
aligned to common viewpoints. For instance, a _Business Motivation Model_ view can show Mission -\>
Drivers -\> Strategies -\> Capabilities, or a _Service Blueprint_ view can map customer touchpoints
to internal processes. These are different slices of the graph data, presented in a user-friendly
way. A _causal mapping_ tool will let users map cause-and-effect relationships (e.g. how a strategic
goal influences a capability, or how a technology constraint inhibits a business outcome). Since the
meta-model includes relationship types (like _Driver influences Goal, Capability enables Process,_
etc.), users can create causal links and visualise impact chains. Business architects can also use a
**powerful search** function to find any element by name or attribute and then jump into its
context. The interface emphasises clarity and simplicity: for example, when a user selects a
“Process” node, the side panel shows its details (description, owner, performance measures) and all
its connections (which capability it realises, which data assets it uses, which role performs it,
etc.). This provides **360° navigation** of the model without writing queries. In edit mode, forms
and dialogues guide the architect in entering needed information (ensuring it aligns with the
meta-model slots). The platform acts as a design tool, so it will also allow scenario planning –
business architects can create a **roadmap** of changes (via Transition Architecture elements like
Work Packages and Projects) and use the tool to visualise **current vs future state** differences
(e.g. highlight which applications will be added, changed, or removed in the target state).

### C-Level Executives

The platform offers **readable, high-level outputs** for executive stakeholders rather than
modelling detail. Executives can use the platform’s **reporting dashboard** to get key insights: for
example, a strategic heatmap of capabilities (showing which ones are strong, which need investment),
or a timeline view of planned initiatives (roadmap of projects coloured by business priority). The
interface for C-level is a set of curated **views and exportable reports**. The system can generate
**simple one-page reports** such as _business capability scorecards_, _technology health reports_,
and _value stream performance summaries_. These might show metrics that are stored in the model
(e.g., each capability could have a “maturity” or “satisfaction” score, and each application might
have a risk level or cost – the platform can aggregate and present these). Executives will access
this via a lightweight app mode or exported files (PDF/PowerPoint or web portal). We will include a
feature to compile **roadmap presentations**: for example, automatically lay out a Gantt chart of
Work Packages by quarter to show the transformation plan. Because not all execs will log into a
tool, the platform supports exporting charts and data to common formats (Excel, PDF, image) for easy
presentation inclusion. The **scorecard view**, e.g. showing how current KPIs (Measures) stack
against Goals and Objectives, providing an executive summary of strategy execution. The C-level
interface strips away technical jargon and focuses on progress, alignment, and value – generated
from the rich underlying graph but presented in a business narrative.

### Data Engineers & Integrators

These users interface with the platform behind the scenes via UI tools and programmatic access. For
them, the platform provides **administrative and data management interfaces**. A data engineer can
use the **ETL/Import module** to set up data feeds (e.g. schedule a CSV import or connect an API).
They have access to a **schema manager,** which allows extension or configuration of the meta-model
– for instance, if the organisation wants to add a custom field “Risk Level” to the Application node
type, the data engineer can add that property through a schema editing UI or config file. The schema
manager might present the meta-model as a class diagram or list of types with their allowed
relationships, based on the core meta-model, but allowing certain extensions (while preserving core
integrity). Data engineers will also appreciate **data quality tools**: the platform can run
validations and produce reports on missing or inconsistent data (e.g., a list of Application
components with no linked Business Capability, which might indicate gaps in mapping). They might get
a dashboard of data completeness or an automated report of anomalies detected by the system (see
**ML** section for anomaly detection). Integrators and developers can also use the **REST/GraphQL
API** directly. For instance, if integrating with a CI/CD pipeline, a developer might call the API
to update the inventory of deployed services each time a deployment happens. The platform’s **API
documentation** will be provided to facilitate this. A _command-line interface (CLI)_ tool could
also be offered for batch operations (e.g., a CLI command to import data, export the model, or run a
validation).

### Common UX

All user interfaces share a common data core, so changes one persona makes (e.g., a business
architect linking a new capability) are immediately reflected in the other views (an executive’s
report or a data quality metric). The UI will allow switching modes or roles – for example, an
enterprise architect might use both the modelling and data management views. The separation is
primarily in presentation and available actions, ensuring users see what is most relevant to their
role without being overwhelmed by unnecessary detail.

To make the platform accessible to _non-technical contributors_ (like business subject matter
experts who are not trained in EA tools), we introduce a **Smart Survey/Form interface**. This is a
guided input mechanism (part of the business user experience) where the system presents a
questionnaire-like form linked to the meta-model. For example, instead of expecting a business user
to add a “Process” node and relate it to a “Capability”, the platform might send them a survey form
asking: _“What is the name of your process? Which business capability does it contribute to? Which
data entities does it use?”_ The user fills out this simple form, and in the backend, the platform
creates the appropriate nodes and links in the graph. Modern tools increasingly emphasise
survey-based stakeholder input; the platform follows this pattern while keeping contributions
governed by review/approval. These surveys can be distributed via a web link or email (even outside
the core tool), allowing broad input without training everyone on the modelling interface. The
results feed directly into the EA knowledge base if needed, subject to architect review/approval.
This significantly lowers the barrier for data collection across the organisation, as people can
contribute context about their systems or processes in plain language, guided by the structured
questions.

Finally, the interface will support **collaboration and commentary**. Users (especially architects
and designers) can converse about model elements – e.g. a comment thread attached to a Capability or
a proposed change. The platform might include a conversation concept to log discussions or
assumptions around elements. This helps capture tacit knowledge and rationale in the model itself.
Collaboration features will be lightweight in the initial local version (note fields or the ability
to export a change request form). Still, the architecture anticipates multi-user editing and
discussion in a future cloud version.

## Visualisation & Modelling Editor (normative)

**Graph viewer:** Use a high‑performance graph library (e.g., **Cytoscape.js** or **Sigma.js**
alternative) for large, interactive graphs (panning, zooming, selection, styling, filtering).
Supports incremental rendering for 10k+ nodes.

**Diagrammatic editor (canvas):** Use a React node‑edge editor (e.g., **React Flow**) for
viewpoint‑specific canvases (Capability Map, Service Portfolio, Motivation). Provide snapping,
grouping, inline edit, and keyboard nav. Layout via **elkjs** (hierarchical) and **dagre** fallback.

**Model binding:** All editor changes write to the underlying graph via guarded actions that enforce
the meta‑model. Viewpoints are projections; no duplicate truth.

**Export & interchange:**

- **Visuals:** Export diagrams and graph views to **SVG** (vector, accessible), **PNG** (bitmap),
  and **PDF** (via Electron’s print pipeline). Batch export from CLI for docs.
- **Graph data:** Export/import **GraphML**, **CSV edge/node lists**, and **JSON**
  (schema‑versioned). Large extracts use **Apache Arrow** for columnar streams.
- **Text diagrams (optional):** Generate **Mermaid**/PlantUML snippets for docs.

**Accessibility & theming:** High‑contrast theme, keyboard ops, ARIA on controls. Style tokens for
brand theming.

**Performance notes:** Virtualised lists, view‑based subgraph queries, viewport culling, and
server‑side precomputes for heavy analytics.

## Analytics and Reporting (extended)

### BI Integration and Flattening

Many organisations use tools like Power BI or Tableau for reporting. The platform will provide an
**export layer** that can flatten the rich graph into tables or views suitable for those tools. For
example, it can generate a table of Applications with their attributes and related Business Unit and
Capability, or an edge list of relationships (like a CSV of “Application – supports – Capability”).
Users could export these on demand, or the platform could expose an ODBC/JDBC connection (where a
backend provides a relational driver/gateway) or a live GraphQL endpoint that BI tools can query. If
using GraphQL, Tableau/Power BI can consume the data via web data connectors or custom connectors. A
simple approach is to allow scheduled exports: e.g., nightly dump key datasets as CSV files that
Power BI can ingest. Another approach is to utilise the graph database’s support for _virtual
tables_ or use a plugin that makes the graph appear relational. The export/flattening logic can also
join and de-normalise data for convenience. For instance, to analyse an application portfolio in a
spreadsheet, the platform could export a single table where each row is an application and columns
include aggregated info (like number of users, linked capabilities, system owner, etc.). This
**flattening does not lose the master data** (which remains in graph form) but provides a snapshot
for external analysis. Using this, analysts can do further slicing/dicing in their familiar BI
tools, combining EA data with other metrics (like financial data or incident data) to produce rich
dashboards.

### Native Graph Analytics

The true value comes from **graph algorithms and queries** applied directly to the model. The
platform will include a library of graph analytics functions to answer questions like:

- **Impact Analysis (Pathfinding):** Find all paths from a given node to others, e.g. “What business
  services and capabilities would be impacted if Application X fails?” The system can traverse the
  graph from Application X through its dependencies (processes, data, interfaces) to highlight
  affected elements. This could use breadth-first search or depth-limited traversal. The result can
  be visual (highlighting impacted nodes in red on a graph view) and textual (a report listing
  impacted processes, roles, etc.).
- **Centrality Measures:** Calculate the graph's centrality metrics (degree, betweenness, etc.) to
  identify key nodes. For example, **betweenness centrality** could find applications that form
  critical hubs (single points whose failure would disconnect many parts of the architecture).
  Similarly, _degree centrality_ might highlight which capabilities are supported by the most
  systems (potentially risk areas or key focus points). Graph algorithms are well-suited to find
  such important nodes or failure points.
- **Clustering and Communities:** The platform can detect modules or groups in the architecture
  using clustering algorithms. For instance, a cluster might indicate a set of applications and data
  that tightly interconnect (a functional domain). This could inform domain architecture or
  highlight redundancy (if two clusters serve the same capability).
- **Path and Distance Queries:** The user can query the shortest paths (e.g., “find the shortest
  dependency chain between System A and System B”), useful in complex integration landscapes to
  understand how data flows or where to intervene for changes.
- **Pattern Matching:** The platform’s query language (GraphQL, Cypher, or SPARQL) can be exposed
  for advanced users to find patterns like “all capabilities that have no supporting applications”
  or “all processes that involve a particular data entity”. These queries traverse certain
  relationships; we will also provide a UI for common patterns (like a search template for orphaned
  elements or a rule to show if any capability lacks a value stream link).
- **Time-based analytics:** The platform can show trends over time if version/history data is
  present. For example, it can track the growth or simplification of the application portfolio
  across versions or see how a particular capability’s supporting systems change from current to
  future state (helpful for showing progress in a transformation).

To perform these analytics, we leverage either built-in capabilities of the graph DB or an
integrated analytics engine. Many graph engines include built-in algorithm libraries; when
unavailable, the Python worker provides these via open-source graph analytics libraries. We would
choose a DB or extensions that allow running these in-process for performance. We can export the
graph data to an external library like **NetworkX** or **igraph** via the API for extremely advanced
analysis. Still, the aim is to support key analyses natively so that architects can get answers
instantly in the app. For viewpoint conformance, include checkers for Service Blueprints (all steps
bound), Integration (pattern and contract present), Cloud (Environment governed_by Landing Zone),
and Portfolio (disposition set with next review).

Importantly, the platform will support **impact and change analytics** specifically for EA use
cases. A built-in _change impact simulator_ allows architects to select an element (like an
application or technology component) and run an analysis to see what would be affected by its
removal or alteration. This uses the graph relations (e.g., remove node -\> see what gets
disconnected or what dependencies break). The result can be presented as a list of affected
capabilities, processes, etc., and an **impact assessment report** to guide decision-making.

All analytics results can be visualised or exported. For example, the outcome of a centrality
analysis might be shown as a highlighted graph or a sorted list of “most central applications”. The
platform might also integrate with Jupyter or similar for those who want to do data science on the
model, but that is optional and more of a future extensibility idea.

Finally, **reporting** in the platform will allow users to configure custom reports combining text,
visuals, and data from the model. A report designer could let an architect create a template (e.g. a
Strategy-to-Capability alignment report) that pulls live data from the graph. This report could be
generated periodically or on demand, ensuring stakeholders have up-to-date information. The reports
can incorporate simple charts (pie, bar) for distributions (like number of apps per capability) and
use traffic-light indicators for health/risk if such attributes are maintained in the model.

In summary, the platform’s analytics capabilities serve both **exploratory needs** (interactive
queries, graph traversals in-app) and **structured reporting** (regular summaries and extracts).
Using the graph’s inherent strengths—the ability to link disparate data and run complex relational
algorithms—the tool can uncover insights like hidden dependencies, potential risks, and optimisation
opportunities that would be hard to see in siloed spreadsheets or static diagrams. This empowers
architects and leaders to make data-informed decisions on enterprise changes.

## LLM, ML, and Automation Opportunities

Including **AI (LLMs and ML)** in the platform opens powerful, user-friendly features on top of the
graph. We identify several key areas where Large Language Models and Machine Learning enhance the
platform:

### LLM-Assisted Querying and Explanation

To make the rich graph data more accessible, we integrate an **LLM-based natural language query
interface**. Users (especially business users or execs) can ask questions in plain English and get
answers generated from the graph. For example, a user might ask, _“What services depend on
Application X?”_ or _“Show me all capabilities supported by our CRM system”_. The platform’s LLM
module will translate that natural language into an underlying graph query (Cypher, SPARQL, etc.),
execute it, and then **formulate a response**. This follows a natural-language-to-query (NL2Q)
pattern that converts plain English to graph queries and then explains the results in context. Show
the generated query for **user confirmation**, apply **deny-by-default PII redaction**, and **log
prompts/outputs** locally.

Additionally, the LLM can provide **explanations and summaries**. Rather than just retrieving raw
data, it can contextualise it. For instance, after finding which services depend on Application X,
the LLM could generate a short narrative: “Application X supports three business services (Service
A, B, C) and is used by two processes, mostly in the Marketing value stream.” This harnesses the
LLM’s natural language generation to turn complex graph data into human-friendly insights.
Executives might ask something like _“Explain how it enables our customer onboarding process”_ – the
LLM could trace the graph (find the process node “Customer Onboarding”, see it’s enabled by
Capability Y, which Application Z and Data ABC deliver) and produce an explanation: “The Customer
Onboarding process is enabled by the Customer Management capability, which relies on the CRM
application and the Customer Data Hub (data entity) to function. These, in turn, are supported by
the cloud platform infrastructure”. This autogenerated explanation bridges the gap between technical
EA data and business understanding.

Another use of LLMs is in **model generation assistance**. Given textual input (like strategy
documents or requirements descriptions), the LLM could suggest new model elements or relationships.
For example, suppose an architect pastes a paragraph from a strategy paper. In that case, the LLM
might identify mentions of a goal or a capability and propose creating those in the model with
appropriate links. This accelerates the modelling process by leveraging unstructured information.

We will also leverage LLMs for **automated classification and mapping**. When ingesting raw data
(like a spreadsheet of system names or a list of roles), the LLM can help map those to our
meta-model categories. For instance, an entry “Salesforce” might be automatically recognised as an
application (or specifically a CRM application) by the LLM, whereas “Order-to-Cash” might be
identified as a Process or Value Stream based on context. The LLM, armed with knowledge of typical
enterprise terms and fine-tuned on our meta-model glossary, can thus assist in cleaning and
classifying data into the right buckets. This reduces manual sorting work for integrators, ensuring
new data is tagged correctly (e.g., it can flag something if something looks like a duplicate of an
existing element under a different name).

Importantly, when possible, the LLM integration will be **on-device or private** to avoid sending
sensitive EA data to external services. We could use a local model (if small) or an API with proper
anonymisation. An open-source LLM tuned for enterprise knowledge graphs can be bundled for offline
use.

#### Machine Learning for Anomalies, Trends, and Patterns

Beyond LLMS's on-demand query power, we incorporate **traditional ML algorithms** to continuously
analyse the graph for patterns or issues humans might miss. The platform will have an “Insights” or
“Advisor” component that uses ML/graph analytics to highlight anomalies, drift, or optimisation
opportunities.

- **Anomaly Detection:** By treating the EA model as a knowledge graph, we can use graph anomaly
  detection techniques to find outliers. For example, an ML algorithm might detect that one
  application is connected in a very unusual way compared to others (say, an application not linked
  to any capability – indicating a data anomaly or a rogue system). It could also spot if a
  relationship count is outside the normal range (e.g. one process has ten applications supporting
  it, whereas most have 1-3, which might warrant investigation). Graph algorithms can identify
  anomalies such as nodes that violate expected patterns or structurally different subgraphs. The
  platform can alert the user: “Notice: 5 applications have no assigned owner” or “Capability X is
  linked to no value streams, which is unusual for a capability of its tier”. Such rules might start
  simple (rule-based) but can be enhanced with ML by learning what a “normal” EA graph looks like in
  the organisation and flagging deviations.
- **Trend Detection and Drift:** Over time, as the architecture changes (either through version
  snapshots or temporal data like project timelines), the platform can use ML to identify **drift**
  – meaning unintended changes or deviations from norms. For instance, if a standard was that each
  business capability should be supported by at most three applications (to minimise redundancy),
  but gradually some capabilities accumulate 6-7 apps, the system notices this drift from the
  intended target state. Similarly, if the data indicates that a certain technology stack is growing
  in use while an approved standard is not being followed, that is a drift. In transformation
  scenarios, “drift” could also mean the implemented architecture diverges from the planned model.
  ML could compare planned vs actual usage and flag differences if integrated with runtime data.
- **Lifecycle and Outdated Components:** The platform can maintain metadata like each component's
  creation date, last update, or technical lifecycle info. ML (or even simple logic) can flag
  **outdated applications or technologies** – for example, if a technology component is past its
  end-of-life date, or if an application has not been updated in 5 years (indicating it might be
  legacy). It can learn from patterns (e.g., typical application upgrade cycles) to predict outdated
  systems. Also, by analysing attributes and usage, ML might classify certain apps as legacy (using
  a trained classifier on attributes like “uses mainframe” or “written in COBOL”, etc.). This helps
  architects focus on candidates for modernisation.
- **Missing Links Prediction:** Using link prediction algorithms, the platform could suggest
  connections that have not yet been recorded. For example, if Capability A and Capability B are
  both served by similar processes and data, but we haven’t linked them under a higher-level Value
  Stream, the system might recommend “Capability A and B appear related; consider grouping under a
  Value Stream or checking if a Value Stream is missing.” Similarly, if multiple processes use the
  same data entity but one method is not documented as doing so, it might predict that missing
  relationship. This is more speculative, but as data grows, such ML can infer potential
  relationships by analogy or common patterns.
- **Clustering for Optimisation:** ML clustering might find groups of systems that could be
  streamlined. For instance, it might identify that three applications serve extremely similar
  functions for the same customer segment, suggesting redundancy (and an opportunity to
  consolidate). This is not a direct anomaly but a pattern that an architect might want to know for
  cost optimisation. The platform’s “Insights” could surface: “Applications X, Y, Z form a cluster
  of similar connections (all serve the same capability and region) – consider rationalising these”.

The results of ML analyses will be presented as **recommendations or alerts**, not enforced changes.
The platform might have a dashboard of “Insights” that lists these findings by severity or category
(e.g., Data Quality issues, Optimisation ideas, Risk alerts). The architect can review and decide if
action is needed, effectively augmenting their expertise with AI-driven observations.

#### Automation and Workflow Integration

The platform supports automation via rules, agents, and external workflow tools to keep the EA model
coordinated with reality and integrate with enterprise processes.

- **Embedded Rules/Agents:** The platform can host simple automation scripts or rules that trigger
  on certain conditions in the graph. For example, an embedded rule might be: “When a new
  Application node is added without an owner, notify the EA team” or “If any Capability has no
  associated Process, create a placeholder task to investigate”. Administrators can configure these
  (using a rules engine or even a natural language rule description that the system understands). An
  _automation agent_ could run periodically to evaluate conditions. We might incorporate a
  lightweight rule engine (like Nools or a custom JS rule evaluator) for if-this-then-that logic on
  the graph. This implements _governance checks_ and _alerting_ within the app. Another example: if
  a data import from a CMDB shows a change (like a new server added for an application), an agent
  could automatically update the graph and mark that application’s status as “Updated” or trigger a
  review workflow.
- **Integration with Workflow Engines:** The platform will integrate with external workflow or IT
  service management tools for more complex processes. For instance, if a certain architecture
  change is approved, you should automatically create tasks in Jira or Azure DevOps for
  implementation. We can use the platform’s API with tools like Zapier, Power Automate, or custom
  scripts to achieve this. For example, an architect finalises a Transition Architecture in the tool
  – the platform (via an agent or a user action) sends the list of Work Packages to a project
  management system to generate project charters. Conversely, a webhook could notify our platform's
  API to update the model if a change happens externally (like a CI/CD pipeline reports a
  deployment). We make such integrations straightforward by designing with standard APIs and a
  plugin architecture.
- **Scheduled Syncs and Data Refresh:** Automation will handle regular data synchronisation. If
  connectors are set up (e.g. daily import from ServiceNow), an embedded scheduler (could use Node’s
  cron or an Electron background process) will run these jobs. It might fetch new data, reconcile
  with the graph (add/update/remove nodes as needed), and log the sync results. The user can
  configure frequency and scope. For cloud readiness, we ensure these tasks can also run as
  cloud-scheduled jobs.
- **Notifications and Alerts:** The app can integrate with email or chat systems to send alerts from
  rules/insights. If the ML/analytics engine flags a serious anomaly (like a single point of failure
  application with no backup), the platform could send an email to the enterprise architect or a
  message to a Slack/MS Teams channel. Similarly, automated reminders can be emailed to data owners
  when input is needed (like broadcasting surveys as mentioned earlier – e.g., _“Please update the
  information for Application X this quarter”_). This closes the loop by actively engaging
  stakeholders to keep data fresh.
- **User-defined Automation Scripts:** Advanced users might write Python or JavaScript scripts to
  manipulate the graph (for bulk operations or complex logic). The platform could allow such scripts
  to be executed in a safe sandbox or encourage using the external API with those languages. Either
  way, automation is not limited to built-in rules – it is an extensible capability that tech-savvy
  users can leverage to customise behaviour. For instance, a script could automatically assign a
  risk score to applications based on certain criteria and run weekly.

The key is that **manual work is minimised**: tedious tasks like chasing people for data, manually
updating spreadsheets, or monitoring for changes are taken over by automated processes. The
platform’s intelligent agents ensure the data stays up-to-date and consistent with minimal human
intervention, freeing architects to focus on design and analysis rather than data maintenance.

Importantly, all these AI/automation features are implemented with **cost and openness in mind**.
Where possible, we use open-source libraries and models (for LLM and ML) and run them locally to
avoid recurring fees. The added intelligence is modular—organisations can turn certain features off
if they are not comfortable with them initially. Still, the architecture is in place to support
progressively more automation and AI assistance as trust in the system grows.

## Finance & TCO Modelling (normative)

**Purpose:** Provide consistent future-aware TCO across scenarios.

**Inputs**: **Cost Curves** on elements; **Policies** for inflation (CPI), FX, and discounting;
optional treasury curves.

**Computation**:

- Expand Cost Curves to the AS-OF date and scenario; apply **inflation** (nominal↔real), **FX**
  (spot/forward by policy), then **discount** to present value (PV).
- Roll up by Capability, Portfolio, Programme, or Roadmap lane; expose variance between scenarios.

**Outputs**: cost runway charts, PV tables (by category: acquire/run/change/exit/residual), and
audit trails with policy versions.

## Security and Data Governance

Even as a local tool, the platform treats **security and data governance** as paramount, especially
since EA models can include sensitive information (e.g. personal data in Org Units, confidential
strategy documents, etc.). In the initial on-device deployment, the data is stored locally under the
user’s control, which reduces cloud security risks. Still, we implement measures to protect that
data and lay the groundwork for a secure cloud deployment. No localhost HTTP from the renderer;
**renderer ↔ host over IPC only**.

**Data Security (Local):** All data stored in the embedded database can be encrypted at rest. We
will offer an option to encrypt the database with a user-provided passphrase, using standard
encryption (for instance, AES-256 for the file storage). This ensures that if the device is lost or
an unauthorised user accesses the files, they cannot read the contents without the key. The
application will handle credentials securely (not storing passphrases in plain text). In transit,
local endpoints for automation/BI are bound to localhost and can be secured; the desktop renderer
never uses HTTP and communicates with the host only via IPC.

**LLM modes and PII controls:**

- Modes: `off` (default), `local`, `remote` (with redaction). Remote mode requires explicit
  enablement and redaction rules.
- PII flags at the schema level drive a **deny-by-default** policy for exports and prompts;
  overrides require explicit allow-listing and are audited.
- Prompt/response logs are stored locally for review.

**User Authentication and Authorisation:** In the local single-user scenario, the operating system
login is the gatekeeper. However, as we become cloud-ready or multi-user, we will integrate
authentication (supporting SSO/OAuth for enterprise logins in a cloud scenario) and **role-based
access control** within the application. The meta-model might contain data that not everyone should
see – for instance, detailed technology risk might be for IT eyes only. The platform would implement
an **access control model** where certain data elements or views are restricted by user role. For
example, a “Viewer – Business” role might only see business-focused data (Capabilities, Processes,
etc.) and not detailed tech costs or personal info of system owners, whereas an “IT Architect” role
sees everything. This can be achieved by tagging nodes/relationships with classification levels
(public, confidential, etc.) and filtering results based on permissions. For now, in a single-user
desktop app, the user is typically an architect who sees all. Still, we design the data model with
the potential to mark sensitive attributes (like a person’s name or an IP address) to be hidden or
anonymised in certain contexts.

**View‑level access (server mode):** Viewpoints can be role‑scoped (e.g., Strategy and Capability
Map to execs; Integration and Cloud to engineers). Sensitive attributes (PII, secrets) are masked by
policy. Export filters respect classification and role.

**PII and Sensitive Data Handling:** If the EA repository contains PII (personally identifiable
information) such as employee names, customer journeys with personal data, etc., we ensure
compliance with privacy principles. That means giving the ability to anonymise or pseudonymise data
when exporting or integrating. For example, if an analytical dataset is generated widely, the
platform could replace actual names with IDs. If using LLMs via cloud APIs, we would avoid sending
raw PII in prompts. The platform will audit where any PII is stored and for what purpose, aiding
GDPR compliance if needed (e.g., answering “show me all personal data in the model” by querying for
nodes of type Customer or fields marked as personal).

**Data Governance and Quality:** The platform itself is a tool for governance of enterprise
knowledge. It will maintain **audit logs** of changes – who made an edit (for multi-user) or at
least timestamps of edits in a single-user environment. Version history (via the versioning system)
also provides a form of audit trail. We also enforce governance through the meta-model: by having a
controlled schema, we prevent the entry of ill-defined data. Data quality rules can be set (e.g.
every Application must have an owner and classification), and the system will enforce or report
violations.

On the governance front, one can consider the **lineage and accountability** of data: each data
element might have an associated steward or source. The platform can store metadata about the source
of truth (e.g. this data entity came from system X on date Y). This is useful for trust and
automated sync (not inadvertently overwriting manual inputs).

When scaled to a server deployment, we will implement full **user authentication** (likely via
integration with corporate SSO like Azure AD) and possibly multi-tenancy if offered as SaaS
(ensuring one client’s data is isolated from another’s in separate DB instances or partitions).
Communication in a cloud setup would be over HTTPS with strict API security (OAuth tokens or similar
for API calls).

**Governance of AI actions** is also considered – any ML or LLM suggestion will be non-destructive
unless approved by a user. We do not let an AI auto-create or delete data without human oversight,
preventing a rogue ML from messing up the model. All suggestions are logged and traceable.

Finally, we consider **compliance**: The platform can be deployed in environments requiring
compliance with frameworks like ISO 27001, SOC2, etc., which means we must ensure basic security
hygiene (regular library updates, vulnerability management, etc.). Since we rely on open-source
components, we will update them and promptly patch any known vulnerabilities. For the cloud, data
encryption in transit and at rest, regular backups, and options for geo-location of data (if needed
by certain regulations) will be provided.

In summary, while the initial scope is a local tool (where the user inherently trusts themselves
with the data), we build a solid security model to inspire confidence as it grows. The user remains
in control of their data, with strong safeguards to prevent unauthorised access, and the
architecture has hooks for full enterprise-grade security when deployed in a shared or cloud
environment.

## SLOs & Benchmarks (v1 targets)

- Cold start ≤ 3s on a mid-spec laptop.
- Open workspace (≈50k nodes / 200k edges) ≤ 2s.
- Shortest path (≤6 hops) at 50k nodes: p95 ≤ 300ms in the Python worker.
- Betweenness centrality at 50k nodes: ≤ 90s as a batch job with progressive results.
- CSV import 50k rows with validation ≤ 120s.
- UI interactions after data arrival: p95 render ≤ 100ms.
- Render lineage panel (full path) ≤ 200ms at 50k nodes (cached).
- Export roadmap (SVG) ≤ 2s for 500 items.
- `state_at()` materialisation p95 ≤ 250ms at 50k/200k (warm).
- `diff(plateauA, plateauB)` (structural) ≤ 1s at 50k/200k; export SVG compare ≤ 2s for 500 items.

## Milestones & Deliverables (M0 → M6)

### M0 Foundations (Weeks 1–2)

- Repo scaffolding; CI; Electron security baseline; ADRs for RPC & adapters.
- Deliverables: `docs/c4/` initial System Context + Container (DSL + SVG/PNG/PDF).
- Acceptance: app shell launches; CI builds diagrams on push.

### M1 Local App MVP (Weeks 3–6)

- Renderer shell, preload API, in‑memory graph + file store, CSV import v1.
- Viewpoints: Capability Map, Service Portfolio, Motivation (React Flow); Graph viewer
  (Cytoscape.js).
- Service Blueprint lanes (Touchpoints/Frontstage/Backstage/Support/Evidence).
- Exports: SVG/PNG/PDF for views; Graph export JSON/CSV.
- Acceptance: create/edit, save/reopen; import sample data; export all views.

### M2 Python Worker MVP (Weeks 7–10)

- Packaged worker; RPC over pipes/UDS; algorithms (shortest path, centrality, impact).
- Arrow pipeline for large payloads; contract tests.
- state_at() projection engine (host) + AS-OF slider (renderer).
- Acceptance: 50k‑node centrality within SLO; health/restart; no open TCP ports.

### M3 Data Onboarding & APIs (Weeks 11–14)

- CSV wizard v2 with validation/rollback; snapshots/scenarios; local read APIs.
- BI integration smoke test; GraphML import/export.
- Plan Events model + APIs; plateau/diff endpoints; first scenario compare export.
- Portfolio (TIME) fields and views; Application.disposition + review_date validations.
- Acceptance: idempotent imports; `AS OF` queries; BI reads via localhost.

### M4 Automation & Connector \#1 (Weeks 15–18)

- Scheduler; first connector (e.g., CMDB) with delta syncs; staleness metrics.
- Governance cadence jobs (DQ sweep, disposition reminders).
- Acceptance: scheduled syncs update only changed nodes; audit logs.

### M5 Cloud/Server Mode (Weeks 19–24)

- Remote Graph/Worker endpoints (mTLS); RBAC; optimistic locking; conflict UX.
- Renderer read/write via server only; local endpoints remain read‑only.
- Finance/TCO policies service; tco API; scenario PV compare report.
- Landing Zone catalogue and Environment governance checks.
- Acceptance: switch local↔remote by config; concurrent edits resolved.

### M6 Docs & Extensibility (Weeks 25–28)

- Full C4 suite (add **Component** and selected **Code** diagrams); plugin hooks; CLI exporters
  (SVG/PNG/PDF/GraphML/CSV/JSON/Arrow).
- Acceptance: one‑command doc site build; extension examples pass lint/tests.

## Deployment Options

The solution is designed to be **flexible in deployment**, starting with a standalone desktop
application and evolving towards cloud or enterprise deployments as needed.

**On-Device (Local) Deployment:** The primary deployment is an Electron-based **desktop app**
available for Windows, Mac, and Linux. This app bundles everything needed: the UI, application
logic, and the graph database. Installation is via a simple installer or even a portable package –
ensuring a low-friction setup for users. The local deployment means users can run the EA platform
offline, ensuring confidentiality (no external data flow) and quick responsiveness. Performance is
optimised for local resources; modern graph databases can easily handle tens of thousands of
nodes/edges on a personal computer with modest CPU/RAM. We will include options for the user to
configure resource usage (like memory allocated to the DB) in case of larger models.

All data in this mode resides on the user’s machine. We provide features for **backup and sync**:
for example, the user can export the entire repository to a file (e.g. an **JSON/CSV/GraphML**) for
backup or to share with colleagues. They can also import such a file, allowing a semi-manual
collaboration where one architect can send their model to another. We can also integrate with
version control systems for the files if needed; backends that support branching/history map 1:1,
and others use export/import with merge tooling.

**Cloud-Ready Architecture:** Although local-first, the architecture is a client-server model
enclosed in one package. To go to the cloud, we can deploy the server part (graph database + Node
API) on a cloud server or container, and have multiple clients connect via the internet. The
technology stack is chosen to be cloud-friendly: e.g., the graph DB could run as a Docker container,
and the Node.js layer could be used as another container behind an API gateway. Depending on need,
we would support deployment on popular cloud platforms (Azure, AWS, GCP) using virtual machines or
Kubernetes. For instance, an organisation could run the EA platform on an internal server so that
multiple architects collaborate in real-time on the same graph (introducing multi-user editing with
concurrency control). In this scenario, the Electron app can act as a client (pointing to the remote
server), or we could provide a pure web client (hosted via a web server).

**Scalability:** In cloud mode, we ensure the graph database can be scaled or clustered to scale to
larger enterprises. EA data sizes and user counts are not enormous (compared to consumer apps), so a
single moderate server could serve an enterprise’s architects and stakeholders.

**Containerization and DevOps:** The app will also be in container form (especially for server
mode). We can provide a Docker Compose file to spin up the graph DB and the application API
together. This makes deploying in various environments or running a quick trial instance easy.
Upgrades to the platform can be delivered by updating the Electron app (for desktop) or deploying
new containers (for server). Data migration between versions will be handled via either
backward-compatible schema evolution (the graph model can be versioned or migrated with scripts as
needed).

**Multi-Tenancy (SaaS)**: For a future SaaS offering or multi-tenant cloud, the design would isolate
data per tenant with separate databases or use a tenant identifier on all data. Given the complexity
of EA data, separate DB instances per client are the safest (which containerization makes
straightforward). The application front-end could be the same, with users logging in and then being
routed to their organisation’s dataset.

**Integration with Developer Tools:** We could also offer the platform as a library or SDK for those
who want to embed or extend it. For example, the core could be packaged as a Node module that others
can include in scripts or extend functionality. This is less about deployment and more about
flexibility. Still, it means a power user could embed our engine in an existing Electron app or run
the logic headless on a server for automation tasks.

**Starting Small, Growing Big:** Initially, the expectation is a **single-user desktop scenario** –
ideal for consultants or architects doing focused design work (with everything self-contained). Over
time, as teams adopt it, we anticipate the need for a **collaborative team environment**. The
transition path is smooth: the local database can be uploaded to a server instance. We might build
an “export to cloud” feature where users can share their local graph to a remote service with
colleagues. Conversely, a user could pull a cloud model down for offline work, then synchronise
back. The architecture thus supports offline and online collaborative modes, which is valuable for
distributed teams or consulting scenarios with periods of offline work.

**Platform Extensibility and Future Patterns:** The deployment approach is future-proofed by keeping
things modular. If new components like real-time collaboration (e.g. multiple users editing
simultaneously) are added, we might deploy a collaboration service (like Operational Transform or
CRDT-based sync server) alongside. If heavy analytics are needed, we could integrate with cloud data
warehouses by streaming select data there, but that is an add-on and not mandatory.

The deployment options range from a **lightweight single-user app** to a **full enterprise cloud
service**, all using the same core. This flexibility ensures a low entry barrier (no infrastructure
needed to start), while not limiting growth into an enterprise-wide platform when value is proven.
Organisations can keep it on-premises for security or use a managed cloud version for convenience.
We use open-source and standard tech, which means they are not locked in – they could even self-host
completely. The architecture is cloud-native (use of containers, APIs) without _requiring_ the cloud
at inception, which aligns with modern software product strategy and meets users where they are.

### Non-Goals for v1

- Inline OWL/SHACL reasoning in the desktop process.
- Plugin marketplace.
- AR/VR visualisations.
- Multi-tenant SaaS and real-time co-editing.

## Future Extensibility and Roadmap

The platform is conceived as a **living system** that can adapt to future needs of enterprise
architecture management and integrate emerging technologies or methodologies. We outline key
extensibility patterns and future enhancements:

\-- **Meta-Model Extension:** While the platform ships with a neutral core meta-model, it is built
to accommodate meta-model changes or extensions. New concept types (classes) or relationship types
can be added through configuration, allowing support for industry-specific elements or industry
frameworks and future versions. The internal design treats the meta-model itself as data (a
meta-graph), so future adjustments – e.g. adding a “Ethical Constraint” concept or new relationship
– do not require re-coding the platform, just updating the config/ontology. This ensures the tool
stays relevant as business design frameworks evolve.

- **Plugin Architecture:** We plan to introduce a plugin system for the platform, especially for
  importers, exporters, and custom analytics. Third-party developers or internal power users could
  develop a module (e.g. a plugin to connect to a specific proprietary system, or a new
  visualisation type) and drop it into the platform. The Electron app could load plugins (Node
  packages or Web plugins) that can extend menus or API endpoints. This modular approach fosters an
  ecosystem around the platform and allows customisation without bloating the core.
- **Enhanced Visualisations and VR/AR:** As data gets more complex, we might integrate advanced
  visualisation techniques. For example, 3D graph visualisation or AR views for architecture
  (imagine an AR app where users can “see” their enterprise model drawn as a landscape). These are
  experimental, but the core graph API would allow any front-end to be built on top, so exploring
  new UI clients (mobile app for quick lookup, AR for presentations, etc.) is feasible without
  reworking the backend.
- **Deeper AI Integration:** The use of AI will grow. We might incorporate a **dedicated AI
  assistant** in the tool – a chatbot that uses the LLM and is fine‑tuned on the organisation’s EA
  data and vocabulary. This assistant could proactively answer “What-if” questions or guide users
  (“Next step suggestion: you added a new capability, usually you would link it to a value stream.
  Shall I search for relevant value streams for you?”). We will monitor improvements in LLMs’
  ability to work with knowledge graphs (techniques like retrieval-augmented generation, etc., which
  can be applied so that the LLM always has up-to-date graph context).
- **Integration with Enterprise Knowledge Graphs:** This EA platform could be part of a larger
  enterprise knowledge graph. We foresee patterns where the EA model links with other domains (like
  risk management or HR data). Our open graph approach allows linking out or integrating with those
  easily (e.g. using common URIs or federated queries). For example, if an organisation has a
  knowledge graph of regulations, our EA graph could connect a Requirement node to an external
  regulation node in another graph store. We plan for **semantic interoperability**, adopting
  standards like W3C’s Linked Data for enterprise artifacts.
- **Continuous Improvement and CI/CD:** We will practice continuous update delivery for platform
  development. Because users might be cautious about tool changes, we will allow in-app updates
  (with user confirmation) to smooth the process of getting new features or patches. For enterprise
  deployments, Docker images can be updated easily. We will maintain backwards compatibility in the
  data schema or provide migration tools.
- **Community and Open-Source Collaboration:** We align with a community-driven improvement model by
  leveraging open-source components. We might open-source parts of our platform (e.g. the meta-model
  definitions or the integration connectors) to allow community contributions and transparency. This
  ensures that as technology moves, the platform can incorporate new ideas quickly (for instance, if
  a new graph DB or a new, superior ML technique emerges, the open architecture allows swapping or
  adding it).
- **Performance Tuning:** As use cases expand, we might incorporate features like caching frequently
  used subgraphs, or summarising parts of the graph for a faster overview (especially if models grow
  huge). In‑memory options provided by certain engines are already planned if real-time analytics
  are needed. We also consider edge computing – in the future, parts of the analysis could run
  directly on the user’s browser for scalability (though currently it is contained in the app).
- **Additional Domains and Uses:** While initially targeted at enterprise architecture, the
  platform’s graph foundation could be extended to adjacent domains like portfolio management,
  process mining, or capability-based planning. Future patterns may see integration with BPMN
  modelling or project portfolio tools, effectively bridging strategic planning to execution
  tracking. The platform can extend to support **scenario planning** (branching the graph for
  multiple future scenarios and comparing them), and **simulation** (with enough data, simulate
  impacts of changes over time, not just a static impact analysis).

In conclusion, this architectural design sets a strong foundation for a **next-generation EA
platform** that is graph-native, intelligent, and user-friendly. It speaks the language of business
architecture. By using an open, modular technology stack (graph databases, Electron, APIs) and
layering on modern AI and automation, it provides immediate value in mapping complex enterprise
relationships and is poised to grow and adapt. It is a low-footprint solution – affordable and not
over-engineered – but does not compromise on **graph fidelity** or analytical power. This balance of
simplicity in deployment and richness in capability will help enterprise architects design and
govern their organisations with clarity, agility, and insight for years to come.
