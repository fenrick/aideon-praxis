//! The atomic-write / fsync sequence shared by every whole-file canonical write
//! ([workspace-integrity-and-recovery], "The atomic-write / fsync sequence").
//!
//! Write to a temp file, `fsync` it, `rename` to the final path (the atomic
//! commit point), then `fsync` the containing directory so the new directory
//! entry is itself durable.

use std::fs::{self, File, OpenOptions};
use std::io::Write;
use std::path::Path;

use crate::error::Result;

/// Atomically write `bytes` to `path` via a sibling temp file and a rename.
pub fn atomic_write(path: &Path, bytes: &[u8]) -> Result<()> {
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent)?;
    }
    let tmp = temp_sibling(path);
    {
        let mut file = OpenOptions::new()
            .write(true)
            .create(true)
            .truncate(true)
            .open(&tmp)?;
        file.write_all(bytes)?;
        file.sync_all()?;
    }
    fs::rename(&tmp, path)?;
    fsync_parent(path)?;
    Ok(())
}

/// `fsync` the directory containing `path`, making a prior rename durable.
pub fn fsync_parent(path: &Path) -> Result<()> {
    if let Some(parent) = path.parent() {
        // Opening a directory read-only and syncing it is the portable way to
        // flush the directory entry on Unix; on platforms that reject it the
        // error is non-fatal to correctness of the file contents.
        if let Ok(dir) = File::open(parent) {
            let _ = dir.sync_all();
        }
    }
    Ok(())
}

fn temp_sibling(path: &Path) -> std::path::PathBuf {
    let mut name = path
        .file_name()
        .map(|n| n.to_os_string())
        .unwrap_or_default();
    name.push(".tmp");
    path.with_file_name(name)
}
