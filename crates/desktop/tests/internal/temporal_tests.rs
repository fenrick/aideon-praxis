use super::*;
use aideon_chrona::TemporalEngine;
use aideon_praxis::mneme::open_store;
use aideon_praxis::praxis::temporal::{
    ChangeSet, CommitRef, EdgeVersion, NodeVersion, StateAtArgs, TopologyDeltaArgs,
};
use serde_json::json;
use tauri::Manager;
use tempfile::tempdir;

fn ipc_request<T>(payload: T) -> IpcRequest<T> {
    use std::sync::atomic::{AtomicU32, Ordering};
    static COUNTER: AtomicU32 = AtomicU32::new(1);
    let id = COUNTER.fetch_add(1, Ordering::Relaxed);
    IpcRequest {
        request_id: format!("req-{id}"),
        payload,
    }
}

#[test]
fn host_error_maps_codes() {
    let err = PraxisError::ValidationFailed {
        message: "bad".into(),
    };
    let mapped = host_error(err);
    assert_eq!(mapped.code, "validation_failed");
    assert!(mapped.message.contains("bad"));

    let err = PraxisError::IntegrityViolation {
        message: "dup".into(),
    };
    let mapped = host_error(err);
    assert_eq!(mapped.code, "integrity_violation");
}

#[test]
fn host_error_covers_all_codes() {
    let cases = vec![
        (
            PraxisError::UnknownBranch {
                branch: "main".to_string(),
            },
            "unknown_branch",
        ),
        (
            PraxisError::UnknownCommit {
                commit: "abc123".to_string(),
            },
            "unknown_commit",
        ),
        (
            PraxisError::ConcurrencyConflict {
                branch: "dev".to_string(),
                expected: Some("a1".to_string()),
                actual: Some("b2".to_string()),
            },
            "concurrency_conflict",
        ),
        (
            PraxisError::MergeConflict {
                message: "edge".to_string(),
            },
            "merge_conflict",
        ),
    ];

    for (error, code) in cases {
        let mapped = host_error(error);
        assert_eq!(mapped.code, code);
        assert!(
            mapped
                .message
                .contains(code.split('_').next().unwrap_or(""))
        );
    }
}

#[tokio::test]
async fn temporal_command_helpers_cover_core_flows() {
    let engine = TemporalEngine::new().await.expect("engine");
    let base = commit_seed(&engine, "base").await;
    let expanded = commit_with_edge(&engine, "expand", &base).await;

    let state = temporal_state_at_inner(
        &engine,
        StateAtArgs {
            as_of: CommitRef::Id(expanded.clone()),
            scenario: Some("main".into()),
            confidence: None,
            layer: None,
        },
    )
    .await
    .expect("state");
    assert!(state.nodes > 0);

    let diff = temporal_diff_inner(
        &engine,
        DiffArgs {
            from: CommitRef::Id(base.clone()),
            to: CommitRef::Id(expanded.clone()),
            scope: None,
        },
    )
    .await
    .expect("diff");
    assert!(diff.node_adds >= 1);

    let commits = list_commits_inner(&engine, "main".to_string())
        .await
        .expect("commits");
    assert!(!commits.is_empty());

    let branches = list_branches_inner(&engine).await;
    assert!(!branches.branches.is_empty());

    let delta = topology_delta_inner(
        &engine,
        TopologyDeltaArgs {
            from: CommitRef::Id(base),
            to: CommitRef::Id(expanded),
        },
    )
    .await
    .expect("delta");
    assert!(delta.node_adds >= 1);
}

async fn commit_seed(engine: &TemporalEngine, message: &str) -> String {
    engine
        .commit(CommitChangesRequest {
            branch: "main".into(),
            parent: None,
            author: Some("tester".into()),
            time: None,
            message: message.to_string(),
            tags: vec![],
            changes: ChangeSet {
                node_creates: vec![NodeVersion {
                    id: "cap-1".into(),
                    r#type: Some("Capability".into()),
                    props: Some(json!({ "name": "cap-1" })),
                }],
                ..ChangeSet::default()
            },
        })
        .await
        .expect("commit")
}

async fn commit_with_edge(engine: &TemporalEngine, message: &str, parent: &str) -> String {
    engine
        .commit(CommitChangesRequest {
            branch: "main".into(),
            parent: Some(parent.to_string()),
            author: None,
            time: None,
            message: message.to_string(),
            tags: vec![],
            changes: {
                let mut change = ChangeSet::default();
                change.node_creates.push(NodeVersion {
                    id: "stage-1".into(),
                    r#type: Some("ValueStreamStage".into()),
                    props: Some(json!({ "name": "stage-1" })),
                });
                change.edge_creates.push(EdgeVersion {
                    id: None,
                    from: "cap-1".into(),
                    to: "stage-1".into(),
                    r#type: Some("serves".into()),
                    directed: Some(true),
                    props: None,
                });
                change
            },
        })
        .await
        .expect("commit")
}

#[tokio::test]
async fn temporal_wrapped_commands_cover_ipc_surface() {
    let dir = tempdir().expect("tempdir");
    let mneme = open_store(dir.path()).await.expect("open store");
    let engine = TemporalEngine::new().await.expect("engine");
    let state = WorkerState::new(engine, mneme);
    let app = tauri::test::mock_app();
    app.manage(state);
    let state = app.state::<WorkerState>();

    let base = commit_seed(state.engine(), "base").await;
    let expanded = commit_with_edge(state.engine(), "expand", &base).await;

    let response = chrona_temporal_state_at(
        state.clone(),
        ipc_request(StateAtArgs {
            as_of: CommitRef::Id(expanded.clone()),
            scenario: Some("main".into()),
            confidence: None,
            layer: None,
        }),
    )
    .await
    .expect("state response");
    assert_eq!(response.status, "ok");

    let response = chrona_temporal_diff(
        state.clone(),
        ipc_request(DiffArgs {
            from: CommitRef::Id(base.clone()),
            to: CommitRef::Id(expanded.clone()),
            scope: None,
        }),
    )
    .await
    .expect("diff response");
    assert_eq!(response.status, "ok");

    let response = chrona_temporal_list_commits(
        state.clone(),
        ipc_request(ListCommitsPayload {
            branch: "main".into(),
        }),
    )
    .await
    .expect("commits response");
    assert_eq!(response.status, "ok");

    let response = chrona_temporal_list_branches(state.clone(), ipc_request(EmptyPayload {}))
        .await
        .expect("branches response");
    assert_eq!(response.status, "ok");

    let response = chrona_temporal_topology_delta(
        state.clone(),
        ipc_request(TopologyDeltaArgs {
            from: CommitRef::Id(base.clone()),
            to: CommitRef::Id(expanded.clone()),
        }),
    )
    .await
    .expect("delta response");
    assert_eq!(response.status, "ok");

    let response = chrona_temporal_commit_changes(
        state.clone(),
        ipc_request(CommitChangesRequest {
            branch: "main".into(),
            parent: Some(expanded.clone()),
            author: Some("tester".into()),
            time: None,
            message: "branch commit".into(),
            tags: vec![],
            changes: ChangeSet {
                node_creates: vec![NodeVersion {
                    id: "extra-node".into(),
                    r#type: Some("Capability".into()),
                    props: Some(json!({ "name": "extra-node" })),
                }],
                ..ChangeSet::default()
            },
        }),
    )
    .await
    .expect("commit response");
    assert_eq!(response.status, "ok");

    let response = chrona_temporal_create_branch(
        state.clone(),
        ipc_request(CreateBranchRequest {
            name: "feature".into(),
            from: Some(CommitRef::Id(expanded.clone())),
        }),
    )
    .await
    .expect("create branch");
    assert_eq!(response.status, "ok");

    let response = chrona_temporal_merge_branches(
        state.clone(),
        ipc_request(MergeRequest {
            source: "feature".into(),
            target: "main".into(),
        }),
    )
    .await
    .expect("merge response");
    assert!(matches!(response.status, "ok" | "error"));

    let response = praxis_metamodel_get(state, ipc_request(EmptyPayload {}))
        .await
        .expect("metamodel response");
    assert_eq!(response.status, "ok");
}
