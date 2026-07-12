//! M1 effective-schema query: authoring a metamodel batch makes the compiled
//! effective schema queryable, and it is rebuilt from the op log after a runtime
//! wipe (reopen) — it is a derived projection, never authored.

use std::str::FromStr;

use mneme_core::Id;
use mneme_core::effective::Cardinality;
use mneme_core::ops::{ActorDeclare, ActorKind, OpPayload, Origin};
use mneme_core::schema::{
    AuthoredMetamodelBatch, AuthoredValidationRules, EntityKind, FieldDef, FieldKind, TypeDef,
    TypeFieldDef, ValueType,
};
use mneme_store::workspace::Workspace;
use tempfile::TempDir;

const ACTOR: &str = "00000000-0000-4000-8000-0000000000a1";
const TYPE_APP: &str = "c8d3aeef-d3d2-5143-9c63-7e11c2f019a2";
const FIELD_DISPOSITION: &str = "d4c7fcfa-3c4c-5ceb-abd3-1fc14e28c273";

fn id(s: &str) -> Id {
    Id::from_str(s).unwrap()
}

fn author_application_metamodel(ws: &mut Workspace) {
    let actor = id(ACTOR);
    ws.author(
        actor,
        Origin::manual(),
        OpPayload::ActorDeclare(ActorDeclare {
            declared_actor_id: actor,
            actor_kind: ActorKind::Person,
            display_name: "Architect".into(),
        }),
    )
    .unwrap();

    ws.author(
        actor,
        Origin::manual(),
        OpPayload::UpsertMetamodelBatch(AuthoredMetamodelBatch {
            types: vec![TypeDef {
                type_id: id(TYPE_APP),
                key: "Application".into(),
                applies_to: EntityKind::Node,
                label: "Application".into(),
                category: Some("Application".into()),
                effect_types: vec![],
                is_abstract: false,
                parent_type_id: None,
            }],
            fields: vec![FieldDef {
                field_id: id(FIELD_DISPOSITION),
                key: "disposition".into(),
                label: "disposition".into(),
                value_type: ValueType::Str,
                semantic_kind: FieldKind::Enum,
                enum_values: vec!["Invest".into(), "Tolerate".into(), "Migrate".into()],
                cardinality_multi: false,
                is_indexed: true,
            }],
            type_fields: vec![TypeFieldDef {
                type_id: id(TYPE_APP),
                field_id: id(FIELD_DISPOSITION),
                is_required: false,
                default_value: None,
                override_default: false,
                tighten_required: false,
            }],
            edge_type_rules: vec![],
            validation: AuthoredValidationRules {
                string_max_length: Some(256),
                text_max_length: Some(4096),
                enum_case_sensitive: false,
            },
            metamodel_version: Some("1.0.0".into()),
            metamodel_source: Some("test".into()),
        }),
    )
    .unwrap();
}

#[test]
fn authored_batch_is_queryable_as_effective_schema() {
    let dir = TempDir::new().unwrap();
    let mut ws = Workspace::create(dir.path(), Some(id(ACTOR))).unwrap();
    author_application_metamodel(&mut ws);

    let app = ws
        .get_effective_schema("Application")
        .unwrap()
        .expect("Application compiled");
    assert_eq!(app.type_id, "Application");
    assert_eq!(app.slots.len(), 1);
    let slot = &app.slots[0];
    assert_eq!(slot.key, "disposition");
    assert_eq!(slot.kind, FieldKind::Enum);
    assert_eq!(slot.cardinality, Cardinality::Single);
    assert_eq!(slot.case_sensitive, Some(false));
    assert_eq!(
        slot.enum_variants.as_deref(),
        Some(
            [
                "Invest".to_owned(),
                "Tolerate".to_owned(),
                "Migrate".to_owned()
            ]
            .as_slice()
        )
    );

    assert!(ws.get_effective_schema("Nonexistent").unwrap().is_none());
}

#[test]
fn effective_schema_is_rebuilt_from_the_log_after_reopen() {
    let dir = TempDir::new().unwrap();
    {
        let mut ws = Workspace::create(dir.path(), Some(id(ACTOR))).unwrap();
        author_application_metamodel(&mut ws);
    }
    // Wipe the derived runtime; the op log is canonical and must rebuild it.
    let _ = std::fs::remove_dir_all(dir.path().join(".aideon").join("runtime"));

    let ws = Workspace::open(dir.path()).unwrap();
    let app = ws
        .get_effective_schema("Application")
        .unwrap()
        .expect("rebuilt from log");
    assert_eq!(
        app.slots.len(),
        1,
        "the disposition slot survives a runtime wipe"
    );
}
