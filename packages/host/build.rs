fn main() {
    ensure_worker_sidecar_placeholder();
    tauri_build::build();
}

fn ensure_worker_sidecar_placeholder() {
    let triple = resolve_target_triple();
    let Some(triple) = triple else {
        return;
    };

    let binaries_dir = PathBuf::from("binaries");
    if let Err(error) = fs::create_dir_all(&binaries_dir) {
        panic!("failed to create binaries dir: {error}");
    }

    let extension = if triple.contains("windows") { ".exe" } else { "" };
    let base_name = format!("aideon-worker{extension}");
    let base_path = binaries_dir.join(&base_name);
    if !base_path.exists() {
        write_placeholder(&base_path);
        set_executable(&base_path);
    }

    let suffixed_name = format!("aideon-worker-{triple}{extension}");
    let suffixed_path = binaries_dir.join(suffixed_name);
    if !suffixed_path.exists() {
        fs::copy(&base_path, &suffixed_path)
            .unwrap_or_else(|error| panic!("failed to copy worker placeholder: {error}"));
        set_executable(&suffixed_path);
    }
}

fn resolve_target_triple() -> Option<String> {
    if let Ok(value) = env::var("TAURI_ENV_TARGET_TRIPLE") {
        if !value.is_empty() {
            return Some(value);
        }
    }

    let arch = env::var("CARGO_CFG_TARGET_ARCH").ok()?;
    let os = env::var("CARGO_CFG_TARGET_OS").ok()?;
    let env_kind = env::var("CARGO_CFG_TARGET_ENV").unwrap_or_default();

    let triple = match os.as_str() {
        "macos" => format!("{arch}-apple-darwin"),
        "windows" => {
            let mapped_arch = match arch.as_str() {
                "x86_64" => "x86_64",
                "aarch64" => "aarch64",
                "x86" => "i686",
                other => other,
            };
            format!("{mapped_arch}-pc-windows-msvc")
        }
        "linux" => {
            let abi = if env_kind == "musl" { "musl" } else { "gnu" };
            format!("{arch}-unknown-linux-{abi}")
        }
        _ => return None,
    };

    Some(triple)
}

fn write_placeholder(path: &Path) {
    let mut file =
        fs::File::create(path).unwrap_or_else(|error| panic!("create worker placeholder: {error}"));
    const MESSAGE: &[u8] =
        b"# Placeholder worker sidecar. Run `yarn worker:bundle` before packaging.\n";
    file.write_all(MESSAGE)
        .unwrap_or_else(|error| panic!("write worker placeholder: {error}"));
}

#[cfg(unix)]
fn set_executable(path: &Path) {
    use std::os::unix::fs::PermissionsExt;
    let mut perms = fs::metadata(path)
        .unwrap_or_else(|error| panic!("read permissions for {path:?}: {error}"))
        .permissions();
    perms.set_mode(0o755);
    fs::set_permissions(path, perms)
        .unwrap_or_else(|error| panic!("set permissions for {path:?}: {error}"));
}

#[cfg(not(unix))]
fn set_executable(_path: &Path) {}

use std::env;
use std::fs;
use std::io::Write;
use std::path::{Path, PathBuf};
