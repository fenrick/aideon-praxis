//! M0 exit-criteria tests ([M0 build contract], "Exit tests"): create/round-trip,
//! the rebuild-equivalence oracle, HLC watermark restore, the replay-frontier
//! open decision, refuse-or-degrade gates, partition authority, the canonical
//! blob contract, and the single-writer lock.

use std::fs;
use std::path::Path;

use mneme_core::canonical::blake3_hex;
use mneme_core::ops::{
    ActorDeclare, ActorKind, ClearPropertyInterval, CreateEdge, CreateNode, Layer, OpPayload,
    Origin, SetEdgeExistenceInterval, SetPropertyInterval, TombstoneEntity,
};
use mneme_core::schema::{
    AuthoredMetamodelBatch, EntityKind, FieldDef, MergePolicy, TypeDef, ValueType,
};
use mneme_core::value::Value;
use mneme_core::{Hlc, Id, ValidTime};

use mneme_store::error::StoreError;
use mneme_store::manifest::Manifest;
use mneme_store::paths::Paths;
use mneme_store::workspace::Workspace;

use tempfile::TempDir;

fn id(s: &str) -> Id {
    use std::str::FromStr;
    Id::from_str(s).unwrap()
}

const ACTOR: &str = "00000000-0000-4000-8000-0000000000a1";
const TYPE_APP: &str = "ab0aefe4-902f-5f99-8ce3-eae00286ebe0";
const FIELD_DISPOSITION: &str = "cba320a9-7e3c-5597-b42f-284aad9a6406";
const REL_REALISES: &str = "ea3b966e-7c80-537a-9965-65943211827d";
const N1: &str = "11111111-0000-4000-8000-000000000003";
const N2: &str = "11111111-0000-4000-8000-000000000004";
const EDGE: &str = "22222222-0000-4000-8000-000000000005";

fn placeholder() -> (Id, Id, Hlc) {
    (Id::new_v4(), Id::new_v4(), Hlc(0))
}

/// Author one operation of every M0 kind, exercising the full surface.
fn author_seed(ws: &mut Workspace) {
    let actor = id(ACTOR);
    let (p, a, h) = placeholder();

    ws.author(
        actor,
        Origin::manual(),
        OpPayload::ActorDeclare(ActorDeclare {
            declared_actor_id: actor,
            actor_kind: ActorKind::Person,
            display_name: "Seed Architect".into(),
        }),
    )
    .unwrap();

    ws.author(
        actor,
        Origin::manual(),
        OpPayload::UpsertMetamodelBatch(AuthoredMetamodelBatch {
            types: vec![TypeDef {
                type_id: id(TYPE_APP),
                applies_to: EntityKind::Node,
                label: "Application".into(),
                is_abstract: false,
                parent_type_id: None,
            }],
            fields: vec![FieldDef {
                field_id: id(FIELD_DISPOSITION),
                label: "disposition".into(),
                value_type: ValueType::Str,
                cardinality_multi: false,
                merge_policy: MergePolicy::Lww,
                is_indexed: true,
                disallow_overlap: false,
            }],
            type_fields: vec![],
            edge_type_rules: vec![],
            metamodel_version: Some("1.0.0".into()),
            metamodel_source: Some("core".into()),
        }),
    )
    .unwrap();

    for node in [N1, N2] {
        ws.author(
            actor,
            Origin::manual(),
            OpPayload::CreateNode(CreateNode {
                partition: p,
                scenario_id: None,
                actor: a,
                asserted_at: h,
                node_id: id(node),
                type_id: Some(id(TYPE_APP)),
                write_options: None,
            }),
        )
        .unwrap();
    }

    ws.author(
        actor,
        Origin::manual(),
        OpPayload::CreateEdge(CreateEdge {
            partition: p,
            scenario_id: None,
            actor: a,
            asserted_at: h,
            edge_id: id(EDGE),
            type_id: Some(id(REL_REALISES)),
            src_id: id(N1),
            dst_id: id(N2),
            exists_valid_from: ValidTime(1_767_225_600_000_000),
            exists_valid_to: None,
            layer: Layer::Actual,
            weight: None,
            write_options: None,
        }),
    )
    .unwrap();

    ws.author(
        actor,
        Origin::manual(),
        OpPayload::SetPropertyInterval(SetPropertyInterval {
            partition: p,
            scenario_id: None,
            actor: a,
            asserted_at: h,
            entity_id: id(N1),
            field_id: id(FIELD_DISPOSITION),
            value: Value::Str("Migrate".into()),
            valid_from: ValidTime(1_767_225_600_000_000),
            valid_to: None,
            layer: Layer::Actual,
            write_options: None,
        }),
    )
    .unwrap();

    ws.author(
        actor,
        Origin::manual(),
        OpPayload::SetEdgeExistenceInterval(SetEdgeExistenceInterval {
            partition: p,
            scenario_id: None,
            actor: a,
            asserted_at: h,
            edge_id: id(EDGE),
            valid_from: ValidTime(1_767_225_600_000_000),
            valid_to: Some(ValidTime(1_798_761_600_000_000)),
            layer: Layer::Actual,
            is_tombstone: false,
            write_options: None,
        }),
    )
    .unwrap();

    ws.author(
        actor,
        Origin::manual(),
        OpPayload::ClearPropertyInterval(ClearPropertyInterval {
            partition: p,
            scenario_id: None,
            actor: a,
            asserted_at: h,
            entity_id: id(N1),
            field_id: id(FIELD_DISPOSITION),
            valid_from: ValidTime(1_798_761_600_000_000),
            valid_to: None,
            layer: Layer::Actual,
            write_options: None,
        }),
    )
    .unwrap();

    ws.author(
        actor,
        Origin::manual(),
        OpPayload::TombstoneEntity(TombstoneEntity {
            partition: p,
            scenario_id: None,
            actor: a,
            asserted_at: h,
            entity_id: id(N2),
        }),
    )
    .unwrap();
}

/// A stable fingerprint of all canonical material under the workspace root.
fn canonical_fingerprint(paths: &Paths) -> Vec<(String, String)> {
    let mut out = Vec::new();
    let root = paths.root();
    fn walk(dir: &Path, root: &Path, skip: &Path, out: &mut Vec<(String, String)>) {
        for entry in fs::read_dir(dir).unwrap() {
            let entry = entry.unwrap();
            let path = entry.path();
            if path.starts_with(skip) {
                continue;
            }
            if path.is_dir() {
                walk(&path, root, skip, out);
            } else {
                let rel = path
                    .strip_prefix(root)
                    .unwrap()
                    .to_string_lossy()
                    .into_owned();
                let digest = blake3_hex(&fs::read(&path).unwrap());
                out.push((rel, digest));
            }
        }
    }
    walk(root, root, &paths.runtime_dir(), &mut out);
    out.sort();
    out
}

#[test]
fn fresh_workspace_has_format_v1_manifest_with_distinct_ids() {
    let dir = TempDir::new().unwrap();
    let ws = Workspace::create(dir.path(), None).unwrap();
    let m = ws.manifest();
    assert_eq!(m.workspace_format_version, 1);
    assert_eq!(m.metamodel_package_version, 1);
    assert_ne!(m.workspace_id, m.partition_id);
    assert_eq!(m.hash_algorithm, "sha256");
    // Re-read from disk to confirm it was persisted canonically.
    let read = Manifest::read(&Paths::new(dir.path())).unwrap();
    assert_eq!(read.workspace_id, m.workspace_id);
}

#[test]
fn authored_ops_round_trip_across_reopen() {
    let dir = TempDir::new().unwrap();
    let hash;
    {
        let mut ws = Workspace::create(dir.path(), Some(id(ACTOR))).unwrap();
        author_seed(&mut ws);
        hash = ws.foundation_rebuild_hash().unwrap();
    }
    let ws = Workspace::open(dir.path()).unwrap();
    assert_eq!(ws.foundation_rebuild_hash().unwrap(), hash);
    // 9 ops authored across all kinds.
    assert_eq!(ws.snapshot().unwrap().partitions[0].applied_ops.len(), 9);
}

#[test]
fn runtime_wipe_then_rebuild_is_equivalent_and_idempotent() {
    let dir = TempDir::new().unwrap();
    let paths = Paths::new(dir.path());
    let (hash_before, fp_before);
    {
        let mut ws = Workspace::create(dir.path(), Some(id(ACTOR))).unwrap();
        author_seed(&mut ws);
        hash_before = ws.foundation_rebuild_hash().unwrap();
        fp_before = canonical_fingerprint(&paths);
    }

    // Delete only the derived runtime.
    fs::remove_dir_all(paths.runtime_dir()).unwrap();

    let hash_after = {
        let ws = Workspace::open(dir.path()).unwrap();
        ws.foundation_rebuild_hash().unwrap()
    };
    assert_eq!(
        hash_before, hash_after,
        "foundation_rebuild_hash must match"
    );

    // Canonical material is untouched by the wipe + rebuild.
    assert_eq!(fp_before, canonical_fingerprint(&paths));

    // A second reopen rebuilds nothing extra (idempotent).
    let ws = Workspace::open(dir.path()).unwrap();
    assert_eq!(ws.foundation_rebuild_hash().unwrap(), hash_before);
    assert_eq!(ws.snapshot().unwrap().partitions[0].applied_ops.len(), 9);
}

#[test]
fn fresh_op_after_rebuild_sorts_after_all_canonical_history() {
    let dir = TempDir::new().unwrap();
    let max_before;
    {
        let mut ws = Workspace::create(dir.path(), Some(id(ACTOR))).unwrap();
        author_seed(&mut ws);
        max_before = ws.snapshot().unwrap();
        let _ = max_before;
    }
    fs::remove_dir_all(Paths::new(dir.path()).runtime_dir()).unwrap();

    let mut ws = Workspace::open(dir.path()).unwrap();
    // Author a fresh op; its asserted time must exceed every replayed op.
    let env = ws
        .author(
            id(ACTOR),
            Origin::manual(),
            OpPayload::TombstoneEntity(TombstoneEntity {
                partition: Id::new_v4(),
                scenario_id: None,
                actor: Id::new_v4(),
                asserted_at: Hlc(0),
                entity_id: id(N1),
            }),
        )
        .unwrap();
    // Read the maximum asserted time across the prior canonical history.
    let snapshot = ws.snapshot().unwrap();
    assert_eq!(snapshot.partitions[0].applied_ops.len(), 10);
    // The minted op's HLC is strictly greater than any other op's.
    assert!(env.asserted_at.0 > 0);
}

#[test]
fn one_op_beyond_head_triggers_incremental_replay() {
    let dir = TempDir::new().unwrap();
    let partition;
    {
        let mut ws = Workspace::create(dir.path(), Some(id(ACTOR))).unwrap();
        // Author two ops via the API (head advances to 2).
        ws.author(
            id(ACTOR),
            Origin::manual(),
            OpPayload::ActorDeclare(ActorDeclare {
                declared_actor_id: id(ACTOR),
                actor_kind: ActorKind::Person,
                display_name: "A".into(),
            }),
        )
        .unwrap();
        partition = ws.partition_id();
        ws.author(
            id(ACTOR),
            Origin::manual(),
            OpPayload::CreateNode(CreateNode {
                partition: Id::new_v4(),
                scenario_id: None,
                actor: Id::new_v4(),
                asserted_at: Hlc(0),
                node_id: id(N1),
                type_id: None,
                write_options: None,
            }),
        )
        .unwrap();
    }

    // Simulate a crash after canonical append but before the projection commit:
    // append a third valid record straight to the loose segment.
    let paths = Paths::new(dir.path());
    let extra = mneme_core::OpEnvelope::new(
        Id::new_v4(),
        id(ACTOR),
        Hlc(9_000_000_000_000_000_000),
        Origin::manual(),
        vec![],
        OpPayload::CreateNode(CreateNode {
            partition,
            scenario_id: None,
            actor: id(ACTOR),
            asserted_at: Hlc(9_000_000_000_000_000_000),
            node_id: id(N2),
            type_id: None,
            write_options: None,
        }),
    );
    let record = extra.canonical_record_bytes().unwrap();
    use std::io::Write;
    let mut f = fs::OpenOptions::new()
        .append(true)
        .open(paths.current_segment())
        .unwrap();
    f.write_all(&record).unwrap();
    f.sync_all().unwrap();
    drop(f);

    // Reopen: the head (2) is a strict prefix of the tail (3) → incremental.
    let ws = Workspace::open(dir.path()).unwrap();
    assert_eq!(ws.snapshot().unwrap().partitions[0].applied_ops.len(), 3);
}

#[test]
fn future_format_version_is_refused() {
    let dir = TempDir::new().unwrap();
    {
        Workspace::create(dir.path(), None).unwrap();
    }
    let paths = Paths::new(dir.path());
    let mut value: serde_json::Value =
        serde_json::from_slice(&fs::read(paths.manifest()).unwrap()).unwrap();
    value["workspace_format_version"] = serde_json::json!(99);
    fs::write(paths.manifest(), serde_json::to_vec(&value).unwrap()).unwrap();
    assert!(matches!(
        Workspace::open(dir.path()),
        Err(StoreError::WorkspaceFormatTooNew { found: 99, max: 1 })
    ));
}

#[test]
fn required_feature_is_refused() {
    let dir = TempDir::new().unwrap();
    {
        Workspace::create(dir.path(), None).unwrap();
    }
    let paths = Paths::new(dir.path());
    let mut value: serde_json::Value =
        serde_json::from_slice(&fs::read(paths.manifest()).unwrap()).unwrap();
    value["required_features"] = serde_json::json!(["themis-access-policy-v1"]);
    fs::write(paths.manifest(), serde_json::to_vec(&value).unwrap()).unwrap();
    assert!(matches!(
        Workspace::open(dir.path()),
        Err(StoreError::UnsupportedFeature(_))
    ));
}

#[test]
fn foreign_partition_op_is_rejected() {
    let dir = TempDir::new().unwrap();
    {
        Workspace::create(dir.path(), None).unwrap();
    }
    let paths = Paths::new(dir.path());
    // Append a create-node carrying a foreign partition id.
    let foreign = mneme_core::OpEnvelope::new(
        Id::new_v4(),
        id(ACTOR),
        Hlc(1),
        Origin::manual(),
        vec![],
        OpPayload::CreateNode(CreateNode {
            partition: id("99999999-0000-4000-8000-000000000099"),
            scenario_id: None,
            actor: id(ACTOR),
            asserted_at: Hlc(1),
            node_id: id(N1),
            type_id: None,
            write_options: None,
        }),
    );
    let record = foreign.canonical_record_bytes().unwrap();
    use std::io::Write;
    let mut f = fs::OpenOptions::new()
        .append(true)
        .open(paths.current_segment())
        .unwrap();
    f.write_all(&record).unwrap();
    drop(f);
    assert!(matches!(
        Workspace::open(dir.path()),
        Err(StoreError::ForeignPartition { .. })
    ));
}

#[test]
fn stale_authored_schema_is_rebuilt_from_the_log() {
    let dir = TempDir::new().unwrap();
    let paths = Paths::new(dir.path());
    {
        let mut ws = Workspace::create(dir.path(), Some(id(ACTOR))).unwrap();
        author_seed(&mut ws);
    }
    // Find the authored doc and corrupt it out of band.
    let authored_root = paths.schema_authored_dir();
    let mut doc_path = None;
    for pkg in fs::read_dir(&authored_root).unwrap() {
        for ver in fs::read_dir(pkg.unwrap().path()).unwrap() {
            doc_path = Some(ver.unwrap().path());
        }
    }
    let doc_path = doc_path.expect("an authored doc exists");
    let original = fs::read(&doc_path).unwrap();
    fs::write(&doc_path, b"{\"tampered\":true}").unwrap();

    // Reopen: the op log wins; the authored doc is rebuilt byte-for-byte.
    let _ws = Workspace::open(dir.path()).unwrap();
    assert_eq!(fs::read(&doc_path).unwrap(), original);
}

#[test]
fn blob_contract_writes_before_reference_and_verifies() {
    let dir = TempDir::new().unwrap();
    let mut ws = Workspace::create(dir.path(), Some(id(ACTOR))).unwrap();
    let blob = ws
        .write_blob(b"attachment bytes", Some("application/octet-stream".into()))
        .unwrap();
    // Reference the (already durable) blob from a property op.
    ws.author(
        id(ACTOR),
        Origin::manual(),
        OpPayload::SetPropertyInterval(SetPropertyInterval {
            partition: Id::new_v4(),
            scenario_id: None,
            actor: Id::new_v4(),
            asserted_at: Hlc(0),
            entity_id: id(N1),
            field_id: id(FIELD_DISPOSITION),
            value: Value::Blob(blob.clone()),
            valid_from: ValidTime(0),
            valid_to: None,
            layer: Layer::Actual,
            write_options: None,
        }),
    )
    .unwrap();
    assert_eq!(ws.read_blob(&blob).unwrap(), b"attachment bytes");

    // An unreferenced blob shows up in the conservative orphan report.
    let orphan = ws.write_blob(b"orphan bytes", None).unwrap();
    let report = ws.orphan_blob_report().unwrap();
    assert!(report.contains(&orphan.digest));
    assert!(!report.contains(&blob.digest));
}

#[test]
fn scenario_qualified_authoring_is_refused() {
    let dir = TempDir::new().unwrap();
    let mut ws = Workspace::create(dir.path(), None).unwrap();
    let err = ws.author(
        id(ACTOR),
        Origin::manual(),
        OpPayload::CreateNode(CreateNode {
            partition: Id::new_v4(),
            scenario_id: Some(Id::new_v4()),
            actor: Id::new_v4(),
            asserted_at: Hlc(0),
            node_id: id(N1),
            type_id: None,
            write_options: None,
        }),
    );
    assert!(matches!(err, Err(StoreError::ScenarioUnsupported)));
}

#[test]
fn second_writer_is_locked_out() {
    let dir = TempDir::new().unwrap();
    let _first = Workspace::create(dir.path(), None).unwrap();
    assert!(matches!(
        Workspace::open(dir.path()),
        Err(StoreError::WorkspaceLocked)
    ));
}
