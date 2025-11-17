# Praxis Engine – Internal Design

## Overview

Praxis Engine owns the time-first digital twin: commits, branches, snapshots, and schema
validation. It implements the commit model and `state_at`/`diff` semantics described in
`Architecture-Boundary.md`.

## Internal structure

- Commit and branch management modules (append-only DAG).
- Snapshot materialisation and caching.
- Meta-model registry and validation.
- Import/export helpers for baseline datasets.

## Data model and APIs

- Core types: Commit, Branch, Snapshot, ChangeSet, NodeVersion, EdgeVersion.
- Public APIs for `commit`, `state_at`, `diff`, branch operations, and meta-model hydration.
- Works against persistence traits provided by Mneme Core.

## Interactions

- Called by Praxis Host and Praxis Facade to service IPC commands.
- Supplies snapshots and diffs to Chrona Visualisation and Metis Analytics.
- Reads/writes data exclusively through Mneme Core persistence interfaces.

## Constraints and invariants

- Commit history is append-only; no rewrites.
- Schema validation must pass before persistence.
- Diff/merge semantics follow the rules documented in `Architecture-Boundary.md` (e.g. delete wins
  over update by default).
