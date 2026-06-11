//! Simple Tauri commands used by tests and smoke checks.

#[cfg(test)]
pub fn greet(name: String) -> String {
    format!("Hello {name} from Rust!")
}

#[cfg(test)]
#[path = "../tests/internal/commands_tests.rs"]
mod tests;
