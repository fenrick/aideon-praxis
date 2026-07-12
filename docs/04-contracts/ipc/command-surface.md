# Command surface

How IPC commands are namespaced into families, and where each family's command table is documented. The executable
snapshot of every command name is the [IPC manifest](../../contracts/ipc-manifest.json), generated and drift-checked
([generated-schema-discipline.md](./generated-schema-discipline.md)).

---

## Namespacing

Every command name is `<module>_<area>_<verb>` in `snake_case`, so the owning module is read off the prefix. The prefix
is the contract boundary: a command is owned by exactly one module, and its payload struct lives in that module's crate.

| Prefix                                                              | Owner         | Examples                                                        |
| ------------------------------------------------------------------- | ------------- | --------------------------------------------------------------- |
| `mneme_store_*`                                                     | Mneme         | `mneme_store_create_node`, `mneme_store_read_entity_at_time`    |
| `mneme_trigger_*`                                                   | Mneme         | `mneme_trigger_rebuild_effective_schema`                        |
| `chrona_temporal_*`                                                 | Chrona        | `chrona_temporal_diff`, `chrona_temporal_state_at`              |
| `praxis_artefact_*`, `praxis_canvas_*`, `praxis_task_*`, `praxis_*` | Praxis        | `praxis_artefact_execute_graph`, `praxis_task_apply_operations` |
| `workspace_*`                                                       | Host / Praxis | `workspace_templates_list`, `workspace_projects_list`           |
| `system_*`                                                          | Host          | `system_setup_state`, `system_worker_health`                    |

## The contract families

The surface groups into six families, all sharing the one [envelope](./envelope.md) and the one
[error envelope](./error-envelope.md):

| #   | Family                        | Owner            | Where the command table lives                                          |
| --- | ----------------------------- | ---------------- | ---------------------------------------------------------------------- |
| 1   | IPC envelope and errors       | Host             | [envelope.md](./envelope.md), [error-envelope.md](./error-envelope.md) |
| 2   | Temporal query context        | Chrona / Mneme   | [temporal-and-scenario/](../temporal-and-scenario/README.md)           |
| 3   | Mneme store operations        | Mneme            | [Mneme module](../../05-modules/mneme/README.md)                       |
| 4   | Chrona temporal operations    | Chrona           | [Chrona module](../../05-modules/chrona/README.md)                     |
| 5   | Praxis artefact and workspace | Praxis           | [Praxis module](../../05-modules/praxis/README.md)                     |
| 6   | Accepted work and events      | Continuum / Host | [accepted-work-and-events/](../accepted-work-and-events/README.md)     |

The per-engine command tables (the full list of `mneme_store_*`, `chrona_temporal_*`, and `praxis_*` commands with their
payloads) live with their modules rather than being duplicated here — the module is the single source of truth for what
it exposes. The host wires them all behind the trust boundary
([Host: IPC command surface](../../05-modules/host/ipc-command-surface.md)).

## System commands

| Command                 | Description                             |
| ----------------------- | --------------------------------------- |
| `system_setup_state`    | Query first-run setup state.            |
| `system_setup_complete` | Mark setup as complete.                 |
| `system_window_open`    | Open a named window.                    |
| `system_worker_health`  | Health check for the background worker. |

## References & standards

- **OpenAPI / AsyncAPI** _(informative: the machine-readable manifest convention the IPC and event manifests follow)_.

## Related documents

| Document                                                                  | What it covers                                   |
| ------------------------------------------------------------------------- | ------------------------------------------------ |
| [generated-schema-discipline.md](./generated-schema-discipline.md)        | How the manifest is generated and drift-checked. |
| [Host: IPC command surface](../../05-modules/host/ipc-command-surface.md) | The host that registers every command.           |
| [IPC manifest](../../contracts/ipc-manifest.json)                         | The executable list of command names.            |
