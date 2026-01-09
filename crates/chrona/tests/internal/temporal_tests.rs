use super::TemporalEngine;
use aideon_praxis::temporal::{
    ChangeSet, CommitChangesRequest, CommitRef, EdgeTombstone, EdgeVersion, NodeTombstone,
    NodeVersion, StateAtArgs, TopologyDeltaArgs,
};
use serde_json::json;

fn capability_node(id: &str) -> NodeVersion {
    NodeVersion {
        id: id.into(),
        r#type: Some("Capability".into()),
        props: Some(json!({ "name": id })),
    }
}

fn stage_node(id: &str) -> NodeVersion {
    NodeVersion {
        id: id.into(),
        r#type: Some("ValueStreamStage".into()),
        props: Some(json!({ "name": id })),
    }
}

#[tokio::test]
async fn commit_and_state_flow() {
    let engine = TemporalEngine::new().await.expect("engine");
    let commit_id = engine
        .commit(CommitChangesRequest {
            branch: "main".into(),
            parent: None,
            author: Some("tester".into()),
            time: None,
            message: "seed".into(),
            tags: vec![],
            changes: ChangeSet {
                node_creates: vec![capability_node("cap-1")],
                ..ChangeSet::default()
            },
        })
        .await
        .expect("commit ok");
    let result = engine
        .state_at(StateAtArgs {
            as_of: CommitRef::Id(commit_id),
            scenario: Some("main".into()),
            confidence: None,
            layer: None,
        })
        .await
        .expect("state ok");
    assert!(result.nodes > 0);
    assert!(result.edges > 0);
}

#[tokio::test]
async fn topology_delta_passthrough() {
    let engine = TemporalEngine::new().await.expect("engine");
    let base = engine
        .commit(CommitChangesRequest {
            branch: "main".into(),
            parent: None,
            author: None,
            time: None,
            message: "base".into(),
            tags: vec![],
            changes: ChangeSet {
                node_creates: vec![capability_node("cap-root")],
                ..ChangeSet::default()
            },
        })
        .await
        .expect("base commit");

    let expanded = engine
        .commit(CommitChangesRequest {
            branch: "main".into(),
            parent: Some(base.clone()),
            author: None,
            time: None,
            message: "expand".into(),
            tags: vec![],
            changes: {
                let mut change = ChangeSet::default();
                change.node_creates.push(stage_node("stage-extra"));
                change.edge_creates.push(EdgeVersion {
                    id: None,
                    from: "cap-root".into(),
                    to: "stage-extra".into(),
                    r#type: Some("serves".into()),
                    directed: Some(true),
                    props: None,
                });
                change
            },
        })
        .await
        .expect("expanded commit");

    let delta = engine
        .topology_delta(TopologyDeltaArgs {
            from: CommitRef::Id(base.clone()),
            to: CommitRef::Id(expanded.clone()),
        })
        .await
        .expect("topology delta");
    assert_eq!(delta.node_adds, 1);
    assert_eq!(delta.edge_adds, 1);

    let trimmed = engine
        .commit(CommitChangesRequest {
            branch: "main".into(),
            parent: Some(expanded.clone()),
            author: None,
            time: None,
            message: "trim".into(),
            tags: vec![],
            changes: {
                let mut change = ChangeSet::default();
                change.edge_deletes.push(EdgeTombstone {
                    from: "cap-root".into(),
                    to: "stage-extra".into(),
                });
                change.node_deletes.push(NodeTombstone {
                    id: "stage-extra".into(),
                });
                change
            },
        })
        .await
        .expect("trim commit");

    let delta_trim = engine
        .topology_delta(TopologyDeltaArgs {
            from: CommitRef::Id(expanded),
            to: CommitRef::Id(trimmed),
        })
        .await
        .expect("topology delta trim");
    assert_eq!(delta_trim.node_dels, 1);
    assert_eq!(delta_trim.edge_dels, 1);
}
