use super::*;

#[test]
fn parse_task_accepts_known_values() {
    assert_eq!(parse_task("frontend"), Some(SetupTask::Frontend));
    assert_eq!(parse_task("backend"), Some(SetupTask::Backend));
    assert_eq!(parse_task("unknown"), None);
}

#[test]
fn marking_tasks_tracks_completion() {
    let mut state = SetupState::new();
    assert!(!all_complete(&state));
    mark_complete(&mut state, SetupTask::Frontend);
    assert!(!all_complete(&state));
    mark_complete(&mut state, SetupTask::Backend);
    assert!(all_complete(&state));
}
