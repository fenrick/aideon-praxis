use super::log_level;
use tauri_plugin_log::log::LevelFilter;

#[test]
fn log_level_returns_valid_filter() {
    let level = log_level();
    assert!(matches!(level, LevelFilter::Debug | LevelFilter::Info));
}
