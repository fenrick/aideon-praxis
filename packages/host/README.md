## aideon-host (stub)

Minimal Rust crate scaffolded for the future Tauri host (#95).

- No Tauri dependency yet (keeps CI fast and portable).
- Used only for `cargo fmt` and `cargo clippy` gating.

Next steps (tracked under #95):

- Add Tauri and capabilities manifest once CI scaffolding is stable.
- Introduce a typed IPC facade to the Python worker via UDS/Pipes.
