use super::*;
use aideon_chrona::TemporalEngine;
use aideon_praxis::praxis::temporal::{
    ChangeSet, CommitRef, EdgeVersion, NodeVersion, StateAtArgs, TopologyDeltaArgs,
};
use serde_json::json;

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
