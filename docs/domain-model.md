# Domain Model

**Audience:** Engineers wiring Praxis Desktop to the digital twin. Captures the working nouns and how they relate.

## Core entities

- **Project** – top-level workspace for an organisation or initiative. Owns Scenarios and their Templates.
- **Scenario** – a named, time-aware branch of the twin (e.g., `main`, `chronaplay`). Bound to a Project and backed by a temporal branch.
- **Template** – saved arrangement of Widgets for a Scenario. Stores layout + widget definitions; reusable across Scenarios when compatible.
- **Branch** – temporal lineage for commits inside a Scenario. One branch per Scenario by default, mapped to engine branches.
- **Commit** – immutable change set on a Branch. Drives time cursor; referenced by `state_at` and `diff` requests.
- **Widget** – UI block backed by a view definition (Graph, Catalogue, Matrix, Chart). Widgets emit selection and consume view data.
- **Node / Edge** – graph primitives inside widget views. Nodes may carry type + properties; Edges link two Nodes with a relationship type.

## Relationships

- Project **has many** Scenarios.
- Scenario **maps to** one primary Branch; Branch **has many** Commits.
- Template **belongs to** a Project and may be **applied to** any Scenario within the Project.
- Template **contains many** Widgets (ordered). Widgets read data for the Scenario + Commit chosen by the time cursor.
- Widget views **produce** Nodes and Edges; user selection of these drives the Properties Inspector and edit flows.

## Data flow

1) User selects **Scenario** → loads Branch + Commits → picks Commit via **time cursor** → fetches snapshot metrics.
2) User selects **Template** → widgets render using Scenario + Commit context.
3) Widget selection (Widget/Node/Edge) → **Selection store** updates → Inspector shows editable fields → apply operations back to the twin.

## Source of truth

- Temporal data (Branches, Commits, snapshots) lives in the Praxis engine/host.
- Templates + Widgets are persisted via host adapters; renderer keeps only transient UI state.
- Selection/edit state is renderer-local but must sync back through typed operations (no ad-hoc storage).
