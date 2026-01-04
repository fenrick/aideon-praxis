use super::{default_sqlite_path, load_or_init_config, open_store};
use tempfile::tempdir;

#[tokio::test]
async fn opens_store_with_default_config() {
    let dir = tempdir().expect("tempdir");
    let base = dir.path();
    let config = load_or_init_config(base).expect("config");
    assert_eq!(config.backend_name(), "sqlite");
    let store = open_store(base).await.expect("open store");
    let path = default_sqlite_path(base);
    assert!(path.exists());
    let _ = store;
}
