use std::process::Command;
use std::str;

fn main() {
    tauri_build::build();
    let commit = Command::new("git")
        .args(["rev-parse", "HEAD"])
        .output()
        .and_then(|output| {
            if output.status.success() {
                Ok(output.stdout)
            } else {
                Err(std::io::Error::other("git rev-parse failed"))
            }
        })
        .and_then(|stdout| {
            let s = str::from_utf8(&stdout).map_err(std::io::Error::other)?;
            Ok(s.trim().to_owned())
        })
        .unwrap_or_else(|_| "unknown".to_string());

    println!("cargo:rustc-env=GIT_COMMIT_HASH={commit}");
}
