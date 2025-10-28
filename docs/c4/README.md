## C4 Diagrams (DSL Source)

This folder contains the Structurizr DSL source for the Aideon Praxis System Context and Container
views used during M0. CI renders the DSL to PlantUML and PNG on every push/PR.

### Local rendering (optional)

Requirements: Java 17+, Graphviz (`dot`).

```
pnpm run preflight
bash scripts/render-c4.sh
```

Outputs are written under `docs/c4/out/plantuml` and `docs/c4/out/png`.

### Files

- `workspace.dsl` – DSL source (System Context + Container views)
- `out/` – CI-generated exports (not committed); available as workflow artifacts
