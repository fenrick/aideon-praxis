use aideon_mneme_core::{
    PersistedCommit, SqliteDb, Store,
    temporal::{ChangeSet, CommitSummary, EdgeVersion, NodeTombstone},
};
use sea_orm::{ConnectionTrait, Database, DbBackend, Statement};
use serde_json::Value;
use tempfile::tempdir;

fn sample_commit() -> PersistedCommit {
    PersistedCommit {
        summary: CommitSummary {
            id: "c1".into(),
            parents: vec!["p0".into()],
            branch: "main".into(),
            author: Some("Ada".into()),
            time: Some("2025-11-13T12:00:00Z".into()),
            message: "seed graph".into(),
            tags: vec!["baseline".into()],
            change_count: 3,
        },
        change_set: ChangeSet {
            node_creates: vec![aideon_mneme_core::temporal::NodeVersion {
                id: "n-1".into(),
                r#type: Some("Capability".into()),
                props: None,
            }],
            node_updates: vec![],
            node_deletes: vec![NodeTombstone { id: "n-9".into() }],
            edge_creates: vec![EdgeVersion {
                from: "n-1".into(),
                to: "n-2".into(),
                ..Default::default()
            }],
            edge_updates: vec![],
            edge_deletes: vec![],
        },
    }
}

#[tokio::test]
async fn writes_metis_projection_for_commits() {
    let dir = tempdir().expect("tempdir");
    let path = dir.path().join("mneme.sqlite");
    let db = SqliteDb::open(&path).await.expect("open");

    let commit = sample_commit();
    db.put_commit(&commit).await.expect("put commit");

    let database_url = format!("sqlite://{}?mode=rwc&cache=shared", path.display());
    let conn = Database::connect(&database_url).await.expect("connect");
    let row = conn
        .query_one(Statement::from_string(
            DbBackend::Sqlite,
            String::from("SELECT event_id, commit_id, payload FROM metis_events"),
        ))
        .await
        .expect("query")
        .expect("row");

    let event_id: String = row.try_get("", "event_id").expect("event id");
    assert_eq!(event_id, commit.summary.id);
    let commit_id: String = row.try_get("", "commit_id").expect("commit id");
    assert_eq!(commit_id, commit.summary.id);
    let payload: String = row.try_get("", "payload").expect("payload");
    let json: Value = serde_json::from_str(&payload).expect("json");

    assert_eq!(json["commitId"], commit.summary.id);
    assert_eq!(json["branch"], commit.summary.branch);
    assert_eq!(json["message"], commit.summary.message);
    assert_eq!(json["changeCount"], commit.summary.change_count);
    assert_eq!(json["summary"]["nodes"]["created"], 1);
    assert_eq!(json["summary"]["nodes"]["deleted"], 1);
    assert_eq!(json["summary"]["edges"]["created"], 1);

    let node_rows = conn
        .query_all(Statement::from_string(
            DbBackend::Sqlite,
            String::from(
                "SELECT node_id, operation, node_type, recorded_at_ms FROM metis_commit_nodes ORDER BY operation",
            ),
        ))
        .await
        .expect("query nodes");
    assert_eq!(node_rows.len(), 2);
    let create_row = &node_rows[0];
    let delete_row = &node_rows[1];
    assert_eq!(
        create_row.try_get::<String>("", "operation").unwrap(),
        "create"
    );
    assert_eq!(
        create_row
            .try_get::<String>("", "node_id")
            .expect("create node id"),
        "n-1"
    );
    assert_eq!(
        create_row
            .try_get::<Option<String>>("", "node_type")
            .expect("create node type"),
        Some(String::from("Capability"))
    );
    let create_recorded: i64 = create_row
        .try_get("", "recorded_at_ms")
        .expect("create recorded");
    assert!(create_recorded > 0);

    assert_eq!(
        delete_row.try_get::<String>("", "operation").unwrap(),
        "delete"
    );
    assert_eq!(
        delete_row
            .try_get::<String>("", "node_id")
            .expect("delete node id"),
        "n-9"
    );
    assert!(
        delete_row
            .try_get::<Option<String>>("", "node_type")
            .expect("delete node type")
            .is_none()
    );

    let edge_rows = conn
        .query_all(Statement::from_string(
            DbBackend::Sqlite,
            String::from(
                "SELECT edge_id, from_node, to_node, operation, recorded_at_ms FROM metis_commit_edges",
            ),
        ))
        .await
        .expect("query edges");
    assert_eq!(edge_rows.len(), 1);
    let edge_row = &edge_rows[0];
    assert_eq!(
        edge_row.try_get::<String>("", "operation").unwrap(),
        "create"
    );
    assert_eq!(
        edge_row.try_get::<String>("", "from_node").expect("from"),
        "n-1"
    );
    assert_eq!(
        edge_row.try_get::<String>("", "to_node").expect("to"),
        "n-2"
    );
    let recorded: i64 = edge_row
        .try_get("", "recorded_at_ms")
        .expect("edge recorded");
    assert!(recorded > 0);
}
