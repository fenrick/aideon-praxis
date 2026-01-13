use super::*;
use std::time::Duration;
use tauri::Manager;

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
fn splash_delay_respects_minimum() {
    let state = SetupState::new();
    let delay = close_delay(&state);
    assert!(delay <= Duration::from_secs(3));
    assert!(delay > Duration::from_secs(2));
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

#[tokio::test]
async fn system_setup_complete_marks_tasks() {
    let app = tauri::test::mock_app();
    app.manage(std::sync::Mutex::new(SetupState::new()));

    let response = system_setup_complete(
        app.handle().clone(),
        app.state::<std::sync::Mutex<SetupState>>(),
        crate::ipc::IpcRequest {
            request_id: "req-frontend".to_string(),
            payload: SetupCompletePayload {
                task: "frontend".to_string(),
            },
        },
    )
    .await
    .expect("frontend complete");
    assert_eq!(response.status, "ok");

    let response = system_setup_complete(
        app.handle().clone(),
        app.state::<std::sync::Mutex<SetupState>>(),
        crate::ipc::IpcRequest {
            request_id: "req-backend".to_string(),
            payload: SetupCompletePayload {
                task: "backend".to_string(),
            },
        },
    )
    .await
    .expect("backend complete");
    assert_eq!(response.status, "ok");

    let flags =
        get_setup_state(app.state::<std::sync::Mutex<SetupState>>()).expect("get setup state");
    assert!(flags.frontend);
    assert!(flags.backend);
}
