//! Continuum orchestration and API crate.
//! Provides persistence boundaries and schedulers used by host/worker.

use std::path::PathBuf;

/// Abstraction for snapshot persistence that the host can use without committing
/// to a specific backend. Implementations may store bytes in files, SQLite,
/// object stores, etc. Keys are implementation-defined references.
pub trait SnapshotStore {
    fn put(&self, key: &str, bytes: &[u8]) -> Result<(), String>;
    fn get(&self, key: &str) -> Result<Vec<u8>, String>;
}

/// File-based snapshot store for local desktop mode. Keys are paths relative to
/// a base directory. Parent directories are created as needed.
#[derive(Clone, Debug)]
pub struct FileSnapshotStore {
    pub base: PathBuf,
}

impl FileSnapshotStore {
    pub fn new(base: PathBuf) -> Self {
        Self { base }
    }
    fn resolve(&self, key: &str) -> PathBuf {
        self.base.join(key)
    }
}

impl SnapshotStore for FileSnapshotStore {
    fn put(&self, key: &str, bytes: &[u8]) -> Result<(), String> {
        let path = self.resolve(key);
        if let Some(parent) = path.parent() {
            std::fs::create_dir_all(parent).map_err(|e| format!("create_dir_all: {e}"))?;
        }
        std::fs::write(&path, bytes).map_err(|e| format!("write: {e}"))
    }
    fn get(&self, key: &str) -> Result<Vec<u8>, String> {
        let path = self.resolve(key);
        std::fs::read(&path).map_err(|e| format!("read: {e}"))
    }
}

#[cfg(test)]
mod tests {
    use super::{FileSnapshotStore, SnapshotStore};
    use std::fs;
    use std::time::{SystemTime, UNIX_EPOCH};

    #[test]
    fn file_store_put_get_roundtrip() {
        let base = std::env::temp_dir().join(format!(
            "aideon-test-{}",
            SystemTime::now()
                .duration_since(UNIX_EPOCH)
                .unwrap()
                .as_millis()
        ));
        let store = FileSnapshotStore::new(base.clone());
        let key = "docs/default/layout-2025-01-01.json";
        let payload = b"{\"ok\":true}";
        store.put(key, payload).expect("put ok");
        let out = store.get(key).expect("get ok");
        assert_eq!(out, payload);
        let _ = fs::remove_dir_all(base);
    }
}
