# Aideon Suite – Product & Design Overview

## Purpose

Describe the Aideon Suite at a product and conceptual design level: what problems it solves, how the
time-first digital twin is organised, and how the major modules fit together. Detailed architecture
and implementation design live in module `DESIGN.md` files, `Architecture-Boundary.md`, and ADRs
under `docs/adr/`.

The Aideon Suite is a **graph-native, time-first, local-first** digital twin platform for Enterprise
Architecture. It models strategy-to-execution as a graph, treats time as a first-class dimension,
and runs primarily as a secure desktop app that can pivot to client–server mode.

## 1. Goals and principles

- **Graph-native:** Represent strategy, capabilities, services, processes, data, technology, and
  change as a single, queryable graph.
- **Time-first:** Use commits, snapshots, plateaus, and plan events to answer “what did we know,
  when?” instead of treating time as an afterthought.
- **Local-first, cloud-ready:** Ship as a private desktop app with no open ports by default, with a
  clean pivot to remote/server mode via adapters.
- **Strict boundaries:** Renderer ↔ Host ↔ Engines communicate only via typed IPC and adapters; no
  backend logic in the renderer.
- **Security by default:** No renderer HTTP, least privilege, PII redaction on exports, and a
  hardened Tauri host.

See `Architecture-Boundary.md` for a deeper treatment of layering, adapters, and time semantics.

## 2. Modules in the suite

Aideon Suite is composed of several modules that share the same meta-model and time-first engine:

- **Aideon Praxis** – core desktop module (Praxis Canvas renderer + Tauri host + engines).
- **Aideon Chrona** – temporal visualisation over commits, snapshots, and plateaus.
- **Aideon Metis** – analytics engine for graph algorithms and TCO/impact analysis.
- **Aideon Continuum** – orchestration and connectors (scheduling, CMDB, cloud APIs).
- **Aideon Mneme** – persistence layer and shared commit/ref/snapshot DTOs.

The root `README.md` includes an “Aideon Suite modules” table with paths and responsibilities.
Internal structure and APIs for each module belong in that module’s `README.md` and `DESIGN.md`.

## 3. Strategy-to-execution meta-model (summary)

The suite’s meta-model captures an explicit “line of sight” from strategy to running solutions:

- **Motivation & Strategy:** Drivers, assessments, goals/objectives, principles, and requirements.
- **Value & Capabilities:** Value streams and capabilities as the unit of planning.
- **Services, Processes, & Data:** Business/application services, processes/functions, and data
  entities with access relationships.
- **Technology & Cloud:** Technology components/services, environments, and landing zones with
  guardrails.
- **Change & Time:** Work packages, plateaus/gaps, plan events, commits, scenarios, and measures.

The **meta-model itself is data**:

- Canonical schema payloads live under `docs/data/meta/core-v1.json`.
- The schema is materialised into a `MetaModelRegistry` in Praxis Engine and enforced at write time.
- Overrides and extensions are expressed as data (additional payloads or commits), not code.

For details, see:

- ADR: `docs/adr/0005-metamodel-as-graph-dataset.md`
- Meta-model docs: `docs/meta/README.md`
- Dataset docs: `docs/data/README.md`
- Strategy-to-execution design: `docs/design-strategy-to-execution.md`

## 4. Runtime architecture (suite-level)

At runtime, Aideon Suite is organised into three layers:

- **Renderer:** React/Tauri Praxis Canvas (legacy Svelte renderer removed) renders
  the workspace UI using Aideon Design System components.
- **Host:** The Tauri-based Aideon Host manages windows, IPC commands, OS integration, and security
  capabilities.
- **Engines:** Rust engine crates (Praxis Engine, Chrona, Metis, Continuum, Mneme) implement graph,
  time, analytics, orchestration, and persistence.

Cross-cutting rules:

- Renderer never talks to databases or raw HTTP; it only calls the host via a typed bridge (for
  example the `praxisApi` wrapper under `app/AideonDesktop/src/adapters`).
- Engines expose traits and DTOs; the host selects local or remote implementations (future server
  mode) without changing renderer contracts.
- Desktop mode keeps all engine calls in-process with no open ports; server mode reuses the same
  DTOs over RPC.

The full boundary and RPC design is covered in:

- `Architecture-Boundary.md`
- `docs/adr/0002-rpc-protocol-decision.md`
- `docs/adr/0003-adapter-boundaries.md`

## 5. UX surfaces and design system

The primary UX surface is the **Praxis Canvas**: a node-based workspace that hosts widgets such as
graph, catalogue, matrix, chart, and timeline views over the twin. Other surfaces (catalogues,
dashboards, inspectors) are built as widgets or panels within the same shell.

Design system decisions:

- React renderers use **Aideon Design System** (`app/AideonDesktop/src/design-system`), which wraps shadcn/ui and
  the React Flow UI registry into shared primitives and blocks.
- All React surfaces import from `@aideon/design-system/*` instead of talking directly to shadcn or
  React Flow.
- The legacy Svelte renderer has been removed; new work targets the React design system.

For UX and design details, see:

- `docs/UX-DESIGN.md` – UX goals, layouts, interaction principles.
- `docs/design-system.md` – design system structure and usage.
- ADR: `docs/adr/0004-design-system-shadcn-reactflow.md`.

## 6. Data, integration, and automation

Data flow in Aideon Suite follows a “graph + dataset” model:

- **Persistence:** Mneme Core manages commits, refs, snapshots, and analytics events (SQLite/WAL
  today). Storage design is documented in `docs/storage/sqlite.md`.
- **Baseline dataset:** `docs/data/base/baseline.yaml` seeds new workspaces with a realistic graph
  and plateaus; it is imported via `cargo aideon_xtask import-dataset`.
- **Integration:** Desktop mode provides read-only localhost APIs; server mode adds authenticated
  read/write APIs, CSV/XLSX import, and connectors (e.g., CMDB, cloud providers) via Continuum.
- **Automation:** Continuum Orchestrator schedules jobs (syncs, freshness checks) and coordinates
  connectors; results feed back into the twin and visualisations.

Detailed connector designs and SLOs should be captured in module-specific design docs and ADRs (for
example, a future ADR covering the first CMDB connector).

## 7. Where to go next

When working on Aideon Suite, use this document only as a **high-level map**. For deeper details:

- Architecture and boundaries: `Architecture-Boundary.md`
- Coding rules: `docs/CODING_STANDARDS.md`
- Testing approach: `docs/testing-strategy.md`
- Tauri security and client–server pivot: `docs/tauri-capabilities.md`,
  `docs/tauri-client-server-pivot.md`
- Module internals: `<module>/README.md` and `<module>/DESIGN.md`
- Decision history: `docs/adr/*.md`
