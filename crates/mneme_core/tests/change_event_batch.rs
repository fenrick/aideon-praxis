use std::str::FromStr;

use mneme_core::canonical::blake3_hex;
use mneme_core::ops::{
    BatchCommit, ChangeEventMetadata, OpEnvelope, OpPayload, Origin, parse_batch_commit_line,
    parse_record_line,
};
use mneme_core::{Hlc, Id};

fn id(value: &str) -> Id {
    Id::from_str(value).unwrap()
}

#[test]
fn grouped_operation_round_trips_change_event_metadata() {
    let transaction_id = id("00000000-0000-4000-8000-000000000101");
    let change_event_id = id("00000000-0000-4000-8000-000000000102");
    let actor_id = id("00000000-0000-4000-8000-000000000103");
    let operation_id = id("00000000-0000-4000-8000-000000000104");
    let payload = OpPayload::ActorDeclare(mneme_core::ops::ActorDeclare {
        declared_actor_id: actor_id,
        actor_kind: mneme_core::ops::ActorKind::Person,
        display_name: "M1 author".into(),
    });
    let metadata = ChangeEventMetadata::applied(
        change_event_id,
        actor_id,
        "Create the application model",
        "desktop",
    );
    let envelope = OpEnvelope::new(
        operation_id,
        actor_id,
        Hlc(1),
        Origin::manual(),
        vec![],
        payload,
    )
    .in_change_event(transaction_id, metadata.clone());

    let bytes = envelope.canonical_record_bytes().unwrap();
    let parsed = parse_record_line(std::str::from_utf8(&bytes).unwrap().trim_end()).unwrap();

    assert_eq!(parsed.transaction_id, Some(transaction_id));
    assert_eq!(parsed.change_event, Some(metadata));
}

#[test]
fn batch_commit_round_trips_and_covers_ordered_operation_bytes() {
    let transaction_id = id("00000000-0000-4000-8000-000000000201");
    let operation_ids = vec![
        id("00000000-0000-4000-8000-000000000202"),
        id("00000000-0000-4000-8000-000000000203"),
    ];
    let covered = b"first canonical operation\nsecond canonical operation\n";
    let commit = BatchCommit::new(transaction_id, operation_ids.clone(), covered);

    let bytes = commit.canonical_record_bytes().unwrap();
    let parsed = parse_batch_commit_line(std::str::from_utf8(&bytes).unwrap().trim_end()).unwrap();

    assert_eq!(parsed.transaction_id, transaction_id);
    assert_eq!(parsed.operation_ids, operation_ids);
    assert_eq!(parsed.operation_count, 2);
    assert_eq!(parsed.operations_digest, blake3_hex(covered));
}

#[test]
fn batch_commit_rejects_empty_and_duplicate_operation_ids() {
    let transaction_id = id("00000000-0000-4000-8000-000000000301");
    let operation_id = id("00000000-0000-4000-8000-000000000302");

    let empty = BatchCommit::new(transaction_id, vec![], b"");
    let empty_bytes = empty.canonical_record_bytes().unwrap();
    assert!(
        parse_batch_commit_line(std::str::from_utf8(&empty_bytes).unwrap().trim_end()).is_err()
    );

    let duplicate = BatchCommit::new(
        transaction_id,
        vec![operation_id, operation_id],
        b"first\nsecond\n",
    );
    let duplicate_bytes = duplicate.canonical_record_bytes().unwrap();
    assert!(
        parse_batch_commit_line(std::str::from_utf8(&duplicate_bytes).unwrap().trim_end(),)
            .is_err()
    );
}
