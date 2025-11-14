//! Simple Tauri commands used by tests and smoke checks.

#[tauri::command]
pub fn greet(name: String) -> String {
    format!("Hello {name} from Rust!")
}
