use aideon_mneme::temporal::{ChangeSet, CommitRef, StateAtArgs, StateAtResult};
use serde_json::json;

#[test]
fn changeset_reports_non_empty() {
    let mut changes = ChangeSet::default();
    assert!(changes.is_empty());

    changes.node_creates.push(Default::default());
    assert!(!changes.is_empty());
}

#[test]
fn state_at_helpers_build_expected_shapes() {
    let args = StateAtArgs::new("c1".into(), Some("dev".into()), Some(0.8));
    assert_eq!(
        args,
        StateAtArgs {
            as_of: CommitRef::Id("c1".into()),
            scenario: Some("dev".into()),
            confidence: Some(0.8),
        }
    );

    let empty = StateAtResult::empty("c1".into(), None, None);
    assert_eq!(empty.nodes, 0);
    assert_eq!(empty.edges, 0);
    let serialized = serde_json::to_value(&empty).expect("serializes");
    assert_eq!(
        serialized,
        json!({"asOf":"c1","scenario":null,"confidence":null,"nodes":0,"edges":0})
    );
}
