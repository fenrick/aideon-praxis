use std::fs;

use mneme_core::ops::{CreateNode, OpPayload, Origin};
use mneme_core::{Hlc, Id};
use mneme_store::Paths;
use mneme_store::Workspace;
use tempfile::TempDir;

fn node_payload(node_id: Id) -> OpPayload {
    OpPayload::CreateNode(CreateNode {
        partition: Id::new_v4(),
        scenario_id: None,
        actor: Id::new_v4(),
        asserted_at: Hlc(0),
        node_id,
        type_id: None,
        write_options: None,
    })
}

#[test]
fn authors_one_atomic_change_event_batch() {
    let dir = TempDir::new().unwrap();
    let actor = Id::new_v4();
    let mut workspace = Workspace::create(dir.path(), Some(actor)).unwrap();

    let applied = workspace
        .author_change_event_batch(
            actor,
            Origin::manual(),
            "Create two model elements",
            "desktop.modelling-studio",
            vec![node_payload(Id::new_v4()), node_payload(Id::new_v4())],
        )
        .unwrap();

    assert_eq!(applied.operation_ids.len(), 2);
    assert_eq!(applied.canonical_head, applied.projection_head);
    assert_eq!(applied.canonical_head.applied_record_count, 2);
    assert_eq!(workspace.list_nodes().unwrap().len(), 2);

    let log = fs::read_to_string(workspace.paths().current_segment()).unwrap();
    let lines: Vec<_> = log.lines().collect();
    assert_eq!(lines.len(), 3);
    assert!(lines[0].contains("\"transaction_id\""));
    assert!(lines[1].contains("\"transaction_id\""));
    assert!(lines[2].contains("\"record_type\":\"change-event-commit\""));
}

#[test]
fn missing_commit_marker_discards_the_whole_loose_batch_on_reopen() {
    let dir = TempDir::new().unwrap();
    let actor = Id::new_v4();
    let mut workspace = Workspace::create(dir.path(), Some(actor)).unwrap();
    workspace
        .author_change_event_batch(
            actor,
            Origin::manual(),
            "Create two model elements",
            "desktop.modelling-studio",
            vec![node_payload(Id::new_v4()), node_payload(Id::new_v4())],
        )
        .unwrap();
    let log_path = workspace.paths().current_segment();
    let log = fs::read(&log_path).unwrap();
    let marker_start = log
        .windows(b"{\"format_version\"".len())
        .rposition(|window| window == b"{\"format_version\"")
        .unwrap();
    drop(workspace);
    let file = fs::OpenOptions::new().write(true).open(&log_path).unwrap();
    file.set_len(marker_start as u64).unwrap();
    file.sync_all().unwrap();

    let reopened = Workspace::open(dir.path()).unwrap();

    assert!(reopened.list_nodes().unwrap().is_empty());
    assert_eq!(fs::metadata(log_path).unwrap().len(), 0);
}

#[test]
fn durable_marker_replays_the_complete_batch_after_runtime_loss() {
    let dir = TempDir::new().unwrap();
    let actor = Id::new_v4();
    {
        let mut workspace = Workspace::create(dir.path(), Some(actor)).unwrap();
        workspace
            .author_change_event_batch(
                actor,
                Origin::manual(),
                "Create two model elements",
                "desktop.modelling-studio",
                vec![node_payload(Id::new_v4()), node_payload(Id::new_v4())],
            )
            .unwrap();
    }
    fs::remove_dir_all(Paths::new(dir.path()).runtime_dir()).unwrap();

    let reopened = Workspace::open(dir.path()).unwrap();

    assert_eq!(reopened.list_nodes().unwrap().len(), 2);
    assert_eq!(
        reopened.snapshot().unwrap().partitions[0].applied_ops.len(),
        2
    );
}

#[test]
fn mismatched_commit_digest_is_canonical_corruption() {
    let dir = TempDir::new().unwrap();
    let actor = Id::new_v4();
    let log_path;
    {
        let mut workspace = Workspace::create(dir.path(), Some(actor)).unwrap();
        workspace
            .author_change_event_batch(
                actor,
                Origin::manual(),
                "Create one model element",
                "desktop.modelling-studio",
                vec![node_payload(Id::new_v4())],
            )
            .unwrap();
        log_path = workspace.paths().current_segment();
    }
    let log = fs::read_to_string(&log_path).unwrap();
    let digest_key = "\"operations_digest\":\"";
    let digest_start = log.rfind(digest_key).unwrap() + digest_key.len();
    let mut bytes = log.into_bytes();
    bytes[digest_start] = if bytes[digest_start] == b'0' {
        b'1'
    } else {
        b'0'
    };
    fs::write(&log_path, bytes).unwrap();

    let error = Workspace::open(dir.path())
        .err()
        .expect("corruption refused");
    assert!(error.to_string().contains("canonical corruption"));
}
