pub const EVENT_SHELL_COMMAND: &str = "shell_command";
pub const EVENT_MNEME_CHANGE: &str = "mneme_change_event";

pub fn is_contract_event_name(name: &str) -> bool {
    matches!(name, EVENT_SHELL_COMMAND | EVENT_MNEME_CHANGE)
}
