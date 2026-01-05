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

#[test]
fn setup_state_roundtrips_over_ipc_envelope() {
    let app = tauri::test::mock_app();
    app.manage(std::sync::Mutex::new(SetupState::new()));

    let state =
        get_setup_state(app.state::<std::sync::Mutex<SetupState>>()).expect("get setup state");
    assert!(!state.frontend);
    assert!(!state.backend);

    let state_ref = app.state::<std::sync::Mutex<SetupState>>();
    let mut guard = state_ref.lock().expect("lock");
    mark_complete(&mut guard, SetupTask::Frontend);
    drop(guard);

    let response = system_setup_state(
        app.state::<std::sync::Mutex<SetupState>>(),
        crate::ipc::IpcRequest {
            request_id: "req-1".to_string(),
            payload: crate::ipc::EmptyPayload {},
        },
    )
    .expect("system setup state");
    assert_eq!(response.status, "ok");
    assert!(response.result.expect("flags").frontend);
}
