//! The typed IPC surface generates the renderer's TypeScript client from the
//! Rust commands ([ADR-0039]). Running the suite regenerates the committed
//! client and the derived command manifest; CI then fails on any `git diff`, so
//! the generated surface cannot drift from the registered commands — drift is
//! structural, not test-asserted.

use super::{ipc_builder, typescript};

/// The committed client the renderer imports. CWD-independent so it resolves the
/// same whether `cargo test` runs from the crate or the workspace root.
const GENERATED_CLIENT: &str = concat!(
    env!("CARGO_MANIFEST_DIR"),
    "/../src/adapters/ipc-bindings.gen.ts"
);

/// The derived command inventory (ADR-0037 as amended by ADR-0039: a generated
/// artefact, not hand-authored). Kept for reviewability and the renderer
/// `⊆ manifest` contract test until the renderer fully consumes the client.
const GENERATED_MANIFEST: &str = concat!(
    env!("CARGO_MANIFEST_DIR"),
    "/../docs/contracts/ipc-manifest.json"
);

/// Pull the snake_case command strings the client dispatches (`TAURI_INVOKE("…")`).
pub(crate) fn generated_command_names(client: &str) -> Vec<String> {
    let mut names = Vec::new();
    for (idx, _) in client.match_indices("TAURI_INVOKE(\"") {
        let rest = &client[idx + "TAURI_INVOKE(\"".len()..];
        if let Some(end) = rest.find('"') {
            names.push(rest[..end].to_string());
        }
    }
    names.sort();
    names.dedup();
    names
}

#[test]
fn commands_regenerate_the_renderer_client_and_manifest() {
    ipc_builder()
        .export(typescript(), GENERATED_CLIENT)
        .expect("export typescript bindings");

    let ts = std::fs::read_to_string(GENERATED_CLIENT).expect("read generated client");
    // Smoke the seam end-to-end: a host command, an engine DTO carried across the
    // crate boundary, and the shared envelope all reach the generated client.
    for token in [
        "workspaceStatus",
        "WorkspaceStatus",
        "IpcResponse",
        "HostError",
    ] {
        assert!(ts.contains(token), "generated client exposes {token}");
    }

    // Regenerate the derived manifest from the same source.
    let commands = generated_command_names(&ts);
    let entries = commands
        .iter()
        .map(|c| format!("    \"{c}\""))
        .collect::<Vec<_>>()
        .join(",\n");
    let manifest = format!("{{\n  \"schemaVersion\": 2,\n  \"commands\": [\n{entries}\n  ]\n}}\n");
    std::fs::write(GENERATED_MANIFEST, manifest).expect("write generated ipc manifest");
}
