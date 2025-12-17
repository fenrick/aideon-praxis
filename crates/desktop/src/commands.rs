//! Simple Tauri commands used by tests and smoke checks.

#[tauri::command]
pub fn greet(name: String) -> String {
    format!("Hello {name} from Rust!")
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn greet_includes_name() {
        assert_eq!(greet("Aideon".into()), "Hello Aideon from Rust!");
    }
}
