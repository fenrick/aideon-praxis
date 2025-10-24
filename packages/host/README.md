## aideon-host (Tauri)

Rust crate for the Tauri desktop host.

- Uses Tauri v2 with capabilities and typed commands.
- Communicates with the Python worker over Unix domain sockets (desktop mode; no TCP ports).
- See `tauri.conf.json` and `capabilities/` for windows and permissions.
