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
