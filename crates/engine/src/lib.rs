//! `aideon_engine` — the in-process execution seam the host calls.
//!
//! The host ([`src-tauri`](../../src-tauri)) never touches the storage layer
//! directly; it calls this engine façade, which owns the open [`Workspace`] and
//! returns host-facing DTOs ([M0 build contract], "Module ownership"). Keeping
//! the seam here means desktop mode runs the engine in-process behind one trait
//! surface, with no sockets and no Tauri types leaking into storage.
#![forbid(unsafe_code)]

use serde::Serialize;
use specta::Type;

use aideon_praxis::meta::MetaModelRegistry;

pub use mneme_core::ops::{OpEnvelope, OpPayload, Origin};
pub use mneme_core::{Id, Value};
pub use mneme_store::error::{Result, StoreError};
pub use mneme_store::{AppliedFrontier, FoundationProjectionSnapshot, Manifest, Workspace};

use mneme_core::effective::{EffectiveEdgeRule, EffectiveSchema};
use mneme_core::ops::{CreateEdge, CreateNode, Layer, SetPropertyInterval};
use mneme_core::time::ValidTime;
use mneme_core::validate::{EdgeContext, validate_edge, validate_node};
use std::collections::BTreeMap;
use std::path::Path;
use std::str::FromStr;

/// A host-facing summary of an open workspace's foundation state.
#[derive(Clone, Debug, PartialEq, Eq, Serialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct WorkspaceStatus {
    /// The portable container identity.
    pub workspace_id: String,
    /// The workspace's sole partition.
    pub partition_id: String,
    /// On-disk format version.
    pub workspace_format_version: u32,
    /// Count of applied canonical operations.
    pub applied_op_count: u64,
    /// The structural foundation-rebuild hash over the current state.
    pub foundation_rebuild_hash: String,
}

/// A host-facing projected node — the derived twin listing entry.
#[derive(Clone, Debug, PartialEq, Eq, Serialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct NodeRecord {
    /// The node id.
    pub node_id: String,
    /// The declared node type's storage symbol UUID, if any.
    pub type_id: Option<String>,
    /// The metamodel domain type key (e.g. `Application`), resolved from the
    /// symbol UUID via the registry; `None` for an untyped or unknown-symbol node.
    pub type_label: Option<String>,
    /// Whether a tombstone has retired the node.
    pub tombstoned: bool,
}

/// A host-facing projected relationship — the derived twin edge listing entry.
#[derive(Clone, Debug, PartialEq, Eq, Serialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct EdgeRecord {
    /// The edge id.
    pub edge_id: String,
    /// The relationship type's storage symbol UUID, if any.
    pub type_id: Option<String>,
    /// The metamodel relationship key (e.g. `realises`), resolved from the symbol.
    pub type_label: Option<String>,
    /// Source entity id.
    pub src_id: String,
    /// Destination entity id.
    pub dst_id: String,
    /// Whether a tombstone has retired the edge.
    pub tombstoned: bool,
}

/// A host-facing metamodel entity type — the authorable palette the renderer
/// offers ([M1 build contract], step 2).
#[derive(Clone, Debug, PartialEq, Eq, Serialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct MetaTypeInfo {
    /// The domain type key (e.g. `Application`).
    pub id: String,
    /// A human label; falls back to the id.
    pub label: String,
    /// The metamodel category (e.g. `Business`, `Application`).
    pub category: Option<String>,
    /// The type's authorable attributes.
    pub attributes: Vec<MetaAttributeInfo>,
}

/// A host-facing metamodel attribute descriptor for an entity type.
#[derive(Clone, Debug, PartialEq, Eq, Serialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct MetaAttributeInfo {
    /// The attribute name (e.g. `name`, `tier`).
    pub name: String,
    /// Whether a valid write must carry it.
    pub required: bool,
    /// The closed enum choices, when the attribute is an enum; else empty.
    pub enum_values: Vec<String>,
}

/// A single resolved slot value at a viewpoint — the winning fact after
/// interval, layer, and asserted-time selection ([M2 core]).
#[derive(Clone, Debug, PartialEq, Eq, Serialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct ResolvedProperty {
    /// The attribute name (e.g. `lifecycle`), resolved from its symbol UUID.
    pub field: String,
    /// The effective value's display form.
    pub value: String,
    /// The layer the winning fact came from (`plan` / `actual`).
    pub layer: String,
}

/// An entity with its slots resolved at a viewpoint.
#[derive(Clone, Debug, PartialEq, Eq, Serialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct ResolvedEntity {
    /// The entity id.
    pub node_id: String,
    /// The metamodel domain type key, if known.
    pub type_label: Option<String>,
    /// The entity's resolved slots at the viewpoint, ordered by attribute name.
    pub properties: Vec<ResolvedProperty>,
}

/// One slot whose resolved value differs between two viewpoints ([ADR-0008]:
/// a diff compares two viewpoints).
#[derive(Clone, Debug, PartialEq, Eq, Serialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct PropertyDelta {
    /// The entity id.
    pub node_id: String,
    /// The metamodel domain type key, if known.
    pub type_label: Option<String>,
    /// The attribute name.
    pub field: String,
    /// The value resolved at the first viewpoint, if any.
    pub before: Option<String>,
    /// The value resolved at the second viewpoint, if any.
    pub after: Option<String>,
}

/// A viewpoint: an `as_of` valid time and an ordered layer preference
/// (highest priority first).
#[derive(Clone, Debug, PartialEq, Eq, serde::Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct Viewpoint {
    /// The valid-time coordinate to resolve at.
    pub as_of: i64,
    /// The layer preference, highest priority first (e.g. `["actual","plan"]`).
    pub layers: Vec<String>,
}

/// The in-process engine handle wrapping one open workspace.
pub struct Engine {
    workspace: Workspace,
    /// The compiled seed metamodel used to validate every authoring write
    /// before it reaches the canonical op log (M1). Embedded at build time.
    registry: MetaModelRegistry,
    /// Reverse map from a type's storage symbol UUID to its domain key, so a
    /// projected node's raw `type_id` can be surfaced as `Application` etc.
    type_labels: BTreeMap<String, String>,
    /// Reverse map from an attribute's symbol UUID to its metamodel name.
    attribute_labels: BTreeMap<String, String>,
    /// The compiled effective schema per type (node + edge), from the published
    /// seed batch — the M1 write gate.
    schemas: Vec<EffectiveSchema>,
    /// The compiled relationship endpoint/self/duplicate rules, keyed by verb.
    edge_rules: Vec<EffectiveEdgeRule>,
}

impl Engine {
    /// Create a new workspace and open it for writing.
    pub fn create(root: impl AsRef<Path>, created_by_actor_id: Option<Id>) -> Result<Self> {
        Self::wrap(Workspace::create(root, created_by_actor_id)?)
    }

    /// Open an existing workspace for writing (rebuilding the runtime as needed).
    pub fn open(root: impl AsRef<Path>) -> Result<Self> {
        Self::wrap(Workspace::open(root)?)
    }

    /// Wrap an open workspace with the embedded seed metamodel registry and its
    /// symbol-UUID→domain-key reverse map.
    fn wrap(workspace: Workspace) -> Result<Self> {
        let registry = MetaModelRegistry::embedded().map_err(|e| {
            StoreError::Corruption(format!("seed metamodel failed to compile: {e}"))
        })?;
        // Publish the seed to the canonical batch and compile the M1 effective
        // schema + edge rules — the write gate all authoring validates against.
        let batch = aideon_praxis::meta::publish_embedded_core().map_err(|e| {
            StoreError::Corruption(format!("seed metamodel failed to publish: {e}"))
        })?;
        let schemas = mneme_core::effective::compile(&batch)
            .map_err(|e| StoreError::Corruption(format!("effective-schema compile failed: {e}")))?;
        let edge_rules = mneme_core::effective::compile_edge_rules(&batch)
            .map_err(|e| StoreError::Corruption(format!("edge-rule compile failed: {e}")))?;
        let document = registry.document();
        let mut type_labels = BTreeMap::new();
        let mut attribute_labels = BTreeMap::new();
        for ty in &document.types {
            if let Some(uuid) = ty.uuid.as_ref() {
                type_labels.insert(uuid.clone(), ty.id.clone());
            }
            for attr in &ty.attributes {
                if let Some(uuid) = attr.uuid.as_ref() {
                    attribute_labels.insert(uuid.clone(), attr.name.clone());
                }
            }
        }
        Ok(Self {
            workspace,
            registry,
            type_labels,
            attribute_labels,
            schemas,
            edge_rules,
        })
    }

    /// Delete the derived runtime and rebuild it from canonical material.
    ///
    /// Releases the writer lock, wipes `.aideon/runtime/`, then reopens — which
    /// replays the canonical op log into a fresh projection. The rebuilt engine
    /// reports the same [`WorkspaceStatus::foundation_rebuild_hash`] when the
    /// canonical material is unchanged ([ADR-0027]); this is the host's
    /// foundation rebuild path, run as accepted work.
    pub fn rebuild(self) -> Result<Self> {
        let runtime_dir = self.workspace.paths().runtime_dir();
        let root = self.workspace.paths().root().to_path_buf();
        // Drop the open workspace first so the writer lock is released and the
        // SQLite connection is closed before the runtime directory is removed.
        drop(self.workspace);
        if runtime_dir.exists() {
            std::fs::remove_dir_all(&runtime_dir).map_err(StoreError::Io)?;
        }
        Self::open(root)
    }

    /// Author one operation through the canonical write path.
    pub fn author(
        &mut self,
        actor_id: Id,
        origin: Origin,
        payload: OpPayload,
    ) -> Result<AppliedFrontier> {
        self.workspace.author(actor_id, origin, payload)
    }

    /// Author one `create-node` through the canonical write path, minting the
    /// node id and self-declaring a session actor on a fresh workspace (the
    /// actor registry's first entry is the session actor thereafter).
    pub fn author_node(&mut self, type_id: Option<Id>) -> Result<NodeRecord> {
        let actor = self.session_actor()?;
        let node_id = Id::new_v4();
        self.workspace.author(
            actor,
            Origin::manual(),
            OpPayload::CreateNode(CreateNode {
                partition: self.workspace.partition_id(),
                scenario_id: None,
                actor,
                asserted_at: mneme_core::Hlc(0),
                node_id,
                type_id,
                write_options: None,
            }),
        )?;
        Ok(self.record_of(
            node_id.to_canonical_string(),
            type_id.map(|t| t.to_canonical_string()),
        ))
    }

    /// The metamodel entity types a user may author, with their attributes —
    /// the authorable palette the renderer offers ([M1 build contract], step 2).
    pub fn metamodel_entity_types(&self) -> Vec<MetaTypeInfo> {
        meta_types(&self.registry)
    }

    /// The seed metamodel's authorable types, read without an open workspace —
    /// the metamodel is embedded at build time. Empty only if the seed fails to
    /// compile (a build-time invariant, so this is effectively infallible).
    pub fn metamodel_types_embedded() -> Vec<MetaTypeInfo> {
        MetaModelRegistry::embedded()
            .map(|r| meta_types(&r))
            .unwrap_or_default()
    }

    /// Author a typed entity, **validated against the seed metamodel before any
    /// operation is appended** ([M1 build contract]). A write naming an unknown
    /// type, omitting a required attribute, or carrying an out-of-range enum is
    /// rejected with [`StoreError::Validation`] and **never enters the op log**.
    ///
    /// On success it appends a `create-node` (carrying the type's symbol UUID)
    /// followed by one `set-property-interval` per supplied attribute, on the
    /// `plan` layer over the open-ended interval.
    pub fn author_typed_node(
        &mut self,
        type_id: &str,
        props: serde_json::Value,
    ) -> Result<NodeRecord> {
        let node_id = Id::new_v4();
        // Validate the intended write against the compiled effective schema
        // (the same gate edge authoring uses) before any op is appended.
        let schema = self
            .schemas
            .iter()
            .find(|s| s.type_id == type_id)
            .ok_or_else(|| StoreError::Validation {
                message: format!("unknown type `{type_id}`"),
            })?;
        validate_node(schema, &props).map_err(|e| StoreError::Validation {
            message: e.to_string(),
        })?;

        let type_symbol = self.type_symbol(type_id)?;
        let actor = self.session_actor()?;
        let partition = self.workspace.partition_id();

        self.workspace.author(
            actor,
            Origin::manual(),
            OpPayload::CreateNode(CreateNode {
                partition,
                scenario_id: None,
                actor,
                asserted_at: mneme_core::Hlc(0),
                node_id,
                type_id: Some(type_symbol),
                write_options: None,
            }),
        )?;

        // Persist each supplied attribute as a plan-layer fact so the meaning is
        // canonical, not just validated in flight.
        if let Some(map) = props.as_object() {
            for (name, json) in map {
                let field_id = self.attribute_symbol(type_id, name)?;
                self.workspace.author(
                    actor,
                    Origin::manual(),
                    OpPayload::SetPropertyInterval(SetPropertyInterval {
                        partition,
                        scenario_id: None,
                        actor,
                        asserted_at: mneme_core::Hlc(0),
                        entity_id: node_id,
                        field_id,
                        value: to_value(json)?,
                        valid_from: ValidTime(0),
                        valid_to: None,
                        layer: Layer::Plan,
                        write_options: None,
                    }),
                )?;
            }
        }

        Ok(self.record_of(
            node_id.to_canonical_string(),
            Some(type_symbol.to_canonical_string()),
        ))
    }

    /// Author a typed relationship, **validated against the compiled effective
    /// schema before any operation is appended** ([M1 build contract]). A write
    /// naming an unknown relationship, a disallowed endpoint type, a self-link
    /// where `allow_self` is false, a duplicate where `allow_duplicate` is false,
    /// or a bad/missing attribute is rejected with [`StoreError::Validation`] and
    /// **never enters the op log**.
    ///
    /// On success it appends a `create-edge` (carrying the relationship symbol)
    /// followed by one `set-property-interval` per supplied attribute on the
    /// `plan` layer over the open interval.
    pub fn author_typed_edge(
        &mut self,
        rel_type: &str,
        src_id: &str,
        dst_id: &str,
        props: serde_json::Value,
    ) -> Result<EdgeRecord> {
        // Resolve the compiled rule, effective schema, and storage symbol; an
        // unknown relationship key is rejected before any op is appended.
        let (rule, schema, rel_symbol) = self.resolve_edge_rules(rel_type)?;

        // Resolve both endpoints' domain type keys from the projected twin, then
        // validate the intended write; on failure nothing is appended.
        let nodes = self.workspace.list_nodes()?;
        let src_type = self.node_type_key(&nodes, src_id)?;
        let dst_type = self.node_type_key(&nodes, dst_id)?;
        let duplicate_exists =
            self.workspace
                .edge_exists(&rel_symbol.to_canonical_string(), src_id, dst_id)?;
        validate_edge(
            &rule,
            &schema,
            &EdgeContext {
                src_type: &src_type,
                dst_type: &dst_type,
                is_self: src_id == dst_id,
                duplicate_exists,
            },
            &props,
        )
        .map_err(|e| StoreError::Validation {
            message: e.to_string(),
        })?;

        let edge_id = Id::new_v4();
        let actor = self.session_actor()?;
        let partition = self.workspace.partition_id();
        let src = Id::from_str(src_id).map_err(|_| StoreError::Validation {
            message: "source id is not a UUID".into(),
        })?;
        let dst = Id::from_str(dst_id).map_err(|_| StoreError::Validation {
            message: "destination id is not a UUID".into(),
        })?;
        self.workspace.author(
            actor,
            Origin::manual(),
            OpPayload::CreateEdge(CreateEdge {
                partition,
                scenario_id: None,
                actor,
                asserted_at: mneme_core::Hlc(0),
                edge_id,
                type_id: Some(rel_symbol),
                src_id: src,
                dst_id: dst,
                exists_valid_from: ValidTime(0),
                exists_valid_to: None,
                layer: Layer::Plan,
                weight: None,
                write_options: None,
            }),
        )?;

        self.append_edge_props(edge_id, &schema, &props)?;

        Ok(EdgeRecord {
            edge_id: edge_id.to_canonical_string(),
            type_id: Some(rel_symbol.to_canonical_string()),
            type_label: Some(rel_type.to_owned()),
            src_id: src_id.to_owned(),
            dst_id: dst_id.to_owned(),
            tombstoned: false,
        })
    }

    /// Resolve a relationship key to its compiled validation rule, effective
    /// schema, and storage symbol, rejecting an unknown key with a validation
    /// error before any op is appended.
    fn resolve_edge_rules(
        &self,
        rel_type: &str,
    ) -> Result<(EffectiveEdgeRule, EffectiveSchema, Id)> {
        let rule = self
            .edge_rules
            .iter()
            .find(|r| r.key == rel_type)
            .cloned()
            .ok_or_else(|| StoreError::Validation {
                message: format!("unknown relationship type `{rel_type}`"),
            })?;
        let schema = self
            .schemas
            .iter()
            .find(|s| s.type_id == rel_type)
            .cloned()
            .ok_or_else(|| StoreError::Validation {
                message: format!("relationship type `{rel_type}` has no effective schema"),
            })?;
        let rel_symbol = self.relationship_symbol(rel_type)?;
        Ok((rule, schema, rel_symbol))
    }

    /// Persist each supplied relationship attribute as a plan-layer fact over
    /// the open interval, resolving its field symbol from the compiled slot
    /// descriptors. An attribute with no matching slot is skipped.
    fn append_edge_props(
        &mut self,
        edge_id: Id,
        schema: &EffectiveSchema,
        props: &serde_json::Value,
    ) -> Result<()> {
        let Some(map) = props.as_object() else {
            return Ok(());
        };
        let actor = self.session_actor()?;
        let partition = self.workspace.partition_id();
        for (name, json) in map {
            let Some(slot) = schema.slots.iter().find(|s| &s.key == name) else {
                continue;
            };
            let field_id = Id::from_str(&slot.uuid).map_err(|_| StoreError::Validation {
                message: format!("slot `{name}` has an invalid uuid"),
            })?;
            self.workspace.author(
                actor,
                Origin::manual(),
                OpPayload::SetPropertyInterval(SetPropertyInterval {
                    partition,
                    scenario_id: None,
                    actor,
                    asserted_at: mneme_core::Hlc(0),
                    entity_id: edge_id,
                    field_id,
                    value: to_value(json)?,
                    valid_from: ValidTime(0),
                    valid_to: None,
                    layer: Layer::Plan,
                    write_options: None,
                }),
            )?;
        }
        Ok(())
    }

    /// The projected edge listing — the derived twin view, re-derived on rebuild.
    pub fn edges(&self) -> Result<Vec<EdgeRecord>> {
        Ok(self
            .workspace
            .list_edges()?
            .into_iter()
            .map(|e| EdgeRecord {
                type_label: e
                    .type_id
                    .as_ref()
                    .and_then(|u| self.type_labels.get(u).cloned()),
                edge_id: e.edge_id,
                type_id: e.type_id,
                src_id: e.src_id,
                dst_id: e.dst_id,
                tombstoned: e.tombstoned,
            })
            .collect())
    }

    /// The domain type key of a projected node, for endpoint validation.
    fn node_type_key(
        &self,
        nodes: &[mneme_store::projection::NodeRow],
        id: &str,
    ) -> Result<String> {
        let node =
            nodes
                .iter()
                .find(|n| n.node_id == id)
                .ok_or_else(|| StoreError::Validation {
                    message: format!("endpoint entity `{id}` does not exist"),
                })?;
        node.type_id
            .as_ref()
            .and_then(|u| self.type_labels.get(u).cloned())
            .ok_or_else(|| StoreError::Validation {
                message: format!("endpoint entity `{id}` has no known type"),
            })
    }

    /// Resolve a relationship key to its storage symbol UUID.
    fn relationship_symbol(&self, rel_type: &str) -> Result<Id> {
        let raw =
            self.registry
                .relationship_uuid(rel_type)
                .ok_or_else(|| StoreError::Validation {
                    message: format!("unknown relationship type `{rel_type}`"),
                })?;
        Id::from_str(raw).map_err(|_| StoreError::Corruption("relationship uuid invalid".into()))
    }

    /// The projected node listing — the derived twin view, re-derived on
    /// every rebuild.
    pub fn nodes(&self) -> Result<Vec<NodeRecord>> {
        Ok(self
            .workspace
            .list_nodes()?
            .into_iter()
            .map(|n| self.record_of(n.node_id, n.type_id))
            .collect())
    }

    /// Assert a slot value on a layer over a valid-time interval ([M2]: a
    /// plan/actual claim at a valid time). The value is checked against the
    /// attribute's metamodel kind/enum before the operation is appended; an
    /// out-of-range value is refused with [`StoreError::Validation`].
    ///
    /// `layer` is `"plan"` or `"actual"`; `valid_to` is `None` for open-ended.
    #[allow(clippy::too_many_arguments)] // a claim is a flat 7-field coordinate
    pub fn set_property_claim(
        &mut self,
        entity_id: &str,
        type_id: &str,
        attribute: &str,
        value: &str,
        layer: &str,
        valid_from: i64,
        valid_to: Option<i64>,
    ) -> Result<()> {
        self.check_attribute_value(type_id, attribute, value)?;
        let entity = Id::from_str(entity_id).map_err(|_| StoreError::Validation {
            message: "entity id is not a UUID".into(),
        })?;
        let field_id = self.attribute_symbol(type_id, attribute)?;
        let layer_enum = parse_layer(layer)?;
        let actor = self.session_actor()?;
        let partition = self.workspace.partition_id();
        self.workspace.author(
            actor,
            Origin::manual(),
            OpPayload::SetPropertyInterval(SetPropertyInterval {
                partition,
                scenario_id: None,
                actor,
                asserted_at: mneme_core::Hlc(0),
                entity_id: entity,
                field_id,
                value: Value::Str(value.to_string()),
                valid_from: ValidTime(valid_from),
                valid_to: valid_to.map(ValidTime),
                layer: layer_enum,
                write_options: None,
            }),
        )?;
        Ok(())
    }

    /// Resolve the twin at a viewpoint: every entity with its slots' effective
    /// values ([M2 core]). Entities with no resolved slot still appear (type
    /// only), so the twin is visible even before any temporal claim.
    pub fn state_at(&self, view: &Viewpoint) -> Result<Vec<ResolvedEntity>> {
        let layers: Vec<&str> = view.layers.iter().map(String::as_str).collect();
        let facts = self.workspace.resolve_at(view.as_of, &layers)?;

        // Group resolved facts by entity.
        let mut by_entity: BTreeMap<String, Vec<ResolvedProperty>> = BTreeMap::new();
        for fact in facts {
            by_entity
                .entry(fact.entity_id)
                .or_default()
                .push(ResolvedProperty {
                    field: self
                        .attribute_labels
                        .get(&fact.field_id)
                        .cloned()
                        .unwrap_or(fact.field_id),
                    value: value_display(&fact.value_json),
                    layer: fact.layer,
                });
        }

        Ok(self
            .workspace
            .list_nodes()?
            .into_iter()
            .filter(|n| !n.tombstoned)
            .map(|n| {
                let mut properties = by_entity.remove(&n.node_id).unwrap_or_default();
                properties.sort_by(|a, b| a.field.cmp(&b.field));
                ResolvedEntity {
                    type_label: n
                        .type_id
                        .as_ref()
                        .and_then(|u| self.type_labels.get(u).cloned()),
                    node_id: n.node_id,
                    properties,
                }
            })
            .collect())
    }

    /// Compare the twin at two viewpoints, returning only the slots whose
    /// resolved value differs ([ADR-0008]).
    pub fn diff(&self, before: &Viewpoint, after: &Viewpoint) -> Result<Vec<PropertyDelta>> {
        let index = |entities: Vec<ResolvedEntity>| {
            let mut map: BTreeMap<(String, String), (Option<String>, Option<String>)> =
                BTreeMap::new();
            for entity in entities {
                for property in entity.properties {
                    map.insert(
                        (entity.node_id.clone(), property.field),
                        (entity.type_label.clone(), Some(property.value)),
                    );
                }
            }
            map
        };
        let a = index(self.state_at(before)?);
        let b = index(self.state_at(after)?);

        let mut keys: Vec<(String, String)> = a.keys().chain(b.keys()).cloned().collect();
        keys.sort();
        keys.dedup();

        let mut deltas = Vec::new();
        for key in keys {
            let before_v = a.get(&key);
            let after_v = b.get(&key);
            let before_value = before_v.and_then(|(_, v)| v.clone());
            let after_value = after_v.and_then(|(_, v)| v.clone());
            if before_value != after_value {
                deltas.push(PropertyDelta {
                    node_id: key.0,
                    type_label: before_v.or(after_v).and_then(|(t, _)| t.clone()),
                    field: key.1,
                    before: before_value,
                    after: after_value,
                });
            }
        }
        Ok(deltas)
    }

    /// Check a candidate value against an attribute's metamodel kind/enum, so a
    /// single-slot claim is validated even outside the whole-node path.
    fn check_attribute_value(&self, type_id: &str, attribute: &str, value: &str) -> Result<()> {
        let types = meta_types(&self.registry);
        let ty = types
            .iter()
            .find(|t| t.id == type_id)
            .ok_or_else(|| StoreError::Validation {
                message: format!("unknown entity type '{type_id}'"),
            })?;
        let attr = ty
            .attributes
            .iter()
            .find(|a| a.name == attribute)
            .ok_or_else(|| StoreError::Validation {
                message: format!("unknown attribute '{attribute}' on type '{type_id}'"),
            })?;
        if !attr.enum_values.is_empty()
            && !attr
                .enum_values
                .iter()
                .any(|choice| choice.eq_ignore_ascii_case(value))
        {
            return Err(StoreError::Validation {
                message: format!(
                    "'{value}' is not a valid {attribute} (expected one of: {})",
                    attr.enum_values.join(", ")
                ),
            });
        }
        Ok(())
    }

    /// Build a [`NodeRecord`], resolving the symbol UUID to its domain key.
    fn record_of(&self, node_id: String, type_id: Option<String>) -> NodeRecord {
        let type_label = type_id
            .as_ref()
            .and_then(|uuid| self.type_labels.get(uuid).cloned());
        NodeRecord {
            node_id,
            type_id,
            type_label,
            tombstoned: false,
        }
    }

    /// Resolve a domain type key to its storage symbol UUID, or a validation
    /// error naming the unknown type.
    fn type_symbol(&self, type_id: &str) -> Result<Id> {
        let uuid = self
            .registry
            .type_uuid(type_id)
            .ok_or_else(|| StoreError::Validation {
                message: format!("unknown entity type '{type_id}'"),
            })?;
        Id::from_str(uuid)
            .map_err(|e| StoreError::Corruption(format!("type symbol not a UUID: {e}")))
    }

    /// Resolve a `(type, attribute)` to its storage symbol UUID.
    fn attribute_symbol(&self, type_id: &str, attribute: &str) -> Result<Id> {
        let uuid = self
            .registry
            .attribute_uuid(type_id, attribute)
            .ok_or_else(|| StoreError::Validation {
                message: format!("unknown attribute '{attribute}' on type '{type_id}'"),
            })?;
        Id::from_str(uuid)
            .map_err(|e| StoreError::Corruption(format!("attribute symbol not a UUID: {e}")))
    }

    /// The session actor: the first declared actor, or a fresh `Local User`
    /// declared on first use.
    fn session_actor(&mut self) -> Result<Id> {
        if let Some(first) = self.workspace.list_actors()?.first() {
            return Id::from_str(&first.actor_id)
                .map_err(|e| StoreError::Corruption(format!("actor id not a UUID: {e}")));
        }
        let actor = Id::new_v4();
        self.workspace.author(
            actor,
            Origin::manual(),
            OpPayload::ActorDeclare(mneme_core::ops::ActorDeclare {
                declared_actor_id: actor,
                actor_kind: mneme_core::ops::ActorKind::Person,
                display_name: "Local User".into(),
            }),
        )?;
        Ok(actor)
    }

    /// The host-facing workspace status DTO.
    pub fn status(&self) -> Result<WorkspaceStatus> {
        let manifest = self.workspace.manifest();
        let snapshot = self.workspace.snapshot()?;
        let applied_op_count = snapshot
            .partitions
            .iter()
            .map(|p| p.applied_ops.len() as u64)
            .sum();
        Ok(WorkspaceStatus {
            workspace_id: manifest.workspace_id.to_canonical_string(),
            partition_id: manifest.partition_id.to_canonical_string(),
            workspace_format_version: manifest.workspace_format_version,
            applied_op_count,
            foundation_rebuild_hash: snapshot.foundation_rebuild_hash()?,
        })
    }

    /// The underlying workspace, for direct foundation operations.
    pub fn workspace(&self) -> &Workspace {
        &self.workspace
    }

    /// The underlying workspace, mutably.
    pub fn workspace_mut(&mut self) -> &mut Workspace {
        &mut self.workspace
    }
}

/// Parse a layer string (`plan` / `actual`) into the canonical [`Layer`].
fn parse_layer(layer: &str) -> Result<Layer> {
    match layer {
        "plan" => Ok(Layer::Plan),
        "actual" => Ok(Layer::Actual),
        other => Err(StoreError::Validation {
            message: format!("unknown layer '{other}' (expected 'plan' or 'actual')"),
        }),
    }
}

/// Render a canonical [`Value`] JSON encoding into a plain display string
/// (e.g. `{"str":"Strategic"}` → `Strategic`). Falls back to the raw JSON.
fn value_display(value_json: &str) -> String {
    match serde_json::from_str::<serde_json::Value>(value_json) {
        Ok(serde_json::Value::Object(map)) => map
            .values()
            .next()
            .map(|v| match v {
                serde_json::Value::String(s) => s.clone(),
                other => other.to_string(),
            })
            .unwrap_or_else(|| value_json.to_string()),
        _ => value_json.to_string(),
    }
}

/// Map a compiled registry's entity types into the host-facing palette.
fn meta_types(registry: &MetaModelRegistry) -> Vec<MetaTypeInfo> {
    registry
        .document()
        .types
        .into_iter()
        .map(|ty| MetaTypeInfo {
            label: ty.label.clone().unwrap_or_else(|| ty.id.clone()),
            category: ty.category.clone(),
            attributes: ty
                .attributes
                .iter()
                .map(|a| MetaAttributeInfo {
                    name: a.name.clone(),
                    required: a.required,
                    enum_values: a.enum_values.clone(),
                })
                .collect(),
            id: ty.id,
        })
        .collect()
}

/// Convert a JSON attribute value into the canonical [`Value`] algebra. The M1
/// slice authors string and enum (string) and boolean attributes; an integer is
/// carried as `i64`. A non-integral number or a composite value is refused —
/// the seed's authorable slots do not use them yet.
fn to_value(json: &serde_json::Value) -> Result<Value> {
    match json {
        serde_json::Value::String(s) => Ok(Value::Str(s.clone())),
        serde_json::Value::Bool(b) => Ok(Value::Bool(*b)),
        serde_json::Value::Number(n) if n.as_i64().is_some() => {
            Ok(Value::I64(mneme_core::value::IntStr(n.as_i64().unwrap())))
        }
        _ => Err(StoreError::Validation {
            message: "unsupported attribute value type".into(),
        }),
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use mneme_core::ops::{ActorDeclare, ActorKind};
    use tempfile::TempDir;

    #[test]
    fn create_author_status_round_trip() {
        let dir = TempDir::new().unwrap();
        let actor = Id::new_v4();
        let mut engine = Engine::create(dir.path(), Some(actor)).unwrap();
        engine
            .author(
                actor,
                Origin::manual(),
                OpPayload::ActorDeclare(ActorDeclare {
                    declared_actor_id: actor,
                    actor_kind: ActorKind::Person,
                    display_name: "Architect".into(),
                }),
            )
            .unwrap();
        let status = engine.status().unwrap();
        assert_eq!(status.applied_op_count, 1);
        assert_eq!(status.workspace_format_version, 1);
        assert_eq!(status.foundation_rebuild_hash.len(), 64);
        drop(engine);

        // Reopen through the seam and confirm the state survives.
        let reopened = Engine::open(dir.path()).unwrap();
        assert_eq!(reopened.status().unwrap().applied_op_count, 1);
    }

    /// Author one node of each seed type used by the edge tests.
    fn seed_nodes(engine: &mut Engine) -> (String, String, String, String) {
        let app = engine
            .author_typed_node("Application", serde_json::json!({ "name": "Insight Hub" }))
            .unwrap()
            .node_id;
        let cap = engine
            .author_typed_node(
                "Capability",
                serde_json::json!({ "name": "Customer Insight" }),
            )
            .unwrap()
            .node_id;
        let data = engine
            .author_typed_node(
                "DataEntity",
                serde_json::json!({ "name": "Customer Profile" }),
            )
            .unwrap()
            .node_id;
        let cap2 = engine
            .author_typed_node("Capability", serde_json::json!({ "name": "Journey" }))
            .unwrap()
            .node_id;
        (app, cap, data, cap2)
    }

    #[test]
    fn author_typed_edge_validates_and_lands() {
        let dir = TempDir::new().unwrap();
        let mut engine = Engine::create(dir.path(), Some(Id::new_v4())).unwrap();
        let (app, cap, _data, _) = seed_nodes(&mut engine);

        // Application realises Capability — a valid seed relationship.
        let edge = engine
            .author_typed_edge("realises", &app, &cap, serde_json::json!({}))
            .unwrap();
        assert_eq!(edge.type_label.as_deref(), Some("realises"));
        assert!(!edge.tombstoned);

        let edges = engine.edges().unwrap();
        assert_eq!(edges.len(), 1);
        assert_eq!(edges[0].src_id, app);
        assert_eq!(edges[0].dst_id, cap);
    }

    #[test]
    fn accesses_with_mode_lands_and_a_duplicate_is_rejected() {
        let dir = TempDir::new().unwrap();
        let mut engine = Engine::create(dir.path(), Some(Id::new_v4())).unwrap();
        let (app, _cap, data, _) = seed_nodes(&mut engine);

        engine
            .author_typed_edge(
                "accesses",
                &app,
                &data,
                serde_json::json!({ "mode": "readwrite" }),
            )
            .unwrap();
        let after_first = engine.status().unwrap().applied_op_count;

        // A second accesses between the same pair is rejected (allowDuplicate=false).
        let err = engine
            .author_typed_edge(
                "accesses",
                &app,
                &data,
                serde_json::json!({ "mode": "read" }),
            )
            .unwrap_err();
        assert!(matches!(err, StoreError::Validation { .. }));
        assert_eq!(
            engine.status().unwrap().applied_op_count,
            after_first,
            "a rejected duplicate edge appends no op"
        );
    }

    #[test]
    fn invalid_typed_edges_are_rejected_and_append_nothing() {
        // Each case names the relationship and the endpoint pick from the seeded
        // (app, cap, data, cap2) tuple that makes the write invalid. In every
        // case the write must be refused and append no op to the canonical log.
        type EndpointPick = fn(&(String, String, String, String)) -> (String, String);
        let cases: &[(&str, EndpointPick)] = &[
            // accesses requires a mode; omitting it is rejected. Application → DataEntity.
            ("accesses", |(app, _c, data, _)| (app.clone(), data.clone())),
            // realises.from is [Application, TechnologyComponent]; a Capability source is invalid.
            ("realises", |(app, cap, _d, _)| (cap.clone(), app.clone())),
            // serves disallows a self-link (allowSelf=false).
            ("serves", |(_a, cap, _d, _)| (cap.clone(), cap.clone())),
        ];

        for (rel_type, pick) in cases {
            let dir = TempDir::new().unwrap();
            let mut engine = Engine::create(dir.path(), Some(Id::new_v4())).unwrap();
            let seeded = seed_nodes(&mut engine);
            let (src, dst) = pick(&seeded);
            let before = engine.status().unwrap().applied_op_count;

            let err = engine
                .author_typed_edge(rel_type, &src, &dst, serde_json::json!({}))
                .unwrap_err();
            assert!(matches!(err, StoreError::Validation { .. }));
            assert_eq!(engine.status().unwrap().applied_op_count, before);
        }
    }

    #[test]
    fn unknown_relationship_type_is_rejected() {
        let dir = TempDir::new().unwrap();
        let mut engine = Engine::create(dir.path(), Some(Id::new_v4())).unwrap();
        let (app, cap, _data, _) = seed_nodes(&mut engine);
        let err = engine
            .author_typed_edge("bogus", &app, &cap, serde_json::json!({}))
            .unwrap_err();
        assert!(matches!(err, StoreError::Validation { .. }));
    }

    #[test]
    fn author_node_declares_session_actor_and_lists_the_node() {
        let dir = TempDir::new().unwrap();
        let mut engine = Engine::create(dir.path(), None).unwrap();

        // First authoring on a fresh workspace self-declares the session actor.
        let node = engine.author_node(None).unwrap();
        assert!(!node.tombstoned);
        assert!(node.type_id.is_none());
        assert!(node.type_label.is_none());

        let status = engine.status().unwrap();
        assert_eq!(
            status.applied_op_count, 2,
            "actor-declare + create-node both land in the canonical log"
        );

        // A second node reuses the session actor — one more op, not two.
        let second = engine.author_node(None).unwrap();
        assert_ne!(node.node_id, second.node_id);
        assert_eq!(engine.status().unwrap().applied_op_count, 3);

        let nodes = engine.nodes().unwrap();
        assert_eq!(nodes.len(), 2);

        // The listing is derived state: it survives close/reopen.
        drop(engine);
        let reopened = Engine::open(dir.path()).unwrap();
        assert_eq!(reopened.nodes().unwrap().len(), 2);
    }

    #[test]
    fn author_typed_node_validates_against_the_metamodel() {
        let dir = TempDir::new().unwrap();
        let mut engine = Engine::create(dir.path(), None).unwrap();

        // The seed metamodel is authorable through the engine.
        let types = engine.metamodel_entity_types();
        assert!(
            types.iter().any(|t| t.id == "Capability"),
            "seed metamodel exposes Capability"
        );

        // A valid Capability lands: create-node + two property facts (name, tier),
        // plus the self-declared session actor = 4 ops.
        let node = engine
            .author_typed_node(
                "Capability",
                serde_json::json!({ "name": "Customer Insight", "tier": "Strategic" }),
            )
            .unwrap();
        assert_eq!(node.type_label.as_deref(), Some("Capability"));
        let after_valid = engine.status().unwrap().applied_op_count;
        assert_eq!(after_valid, 4, "actor + create-node + name + tier");

        // Enum match is case-insensitive per the seed (tier lower-case still valid).
        engine
            .author_typed_node(
                "Capability",
                serde_json::json!({ "name": "X", "tier": "core" }),
            )
            .unwrap();
        let after_second = engine.status().unwrap().applied_op_count;

        // An out-of-range enum is rejected and appends NOTHING to the op log.
        let bad_enum = engine.author_typed_node(
            "Capability",
            serde_json::json!({ "name": "Y", "tier": "Tactical" }),
        );
        assert!(matches!(bad_enum, Err(StoreError::Validation { .. })));
        assert_eq!(
            engine.status().unwrap().applied_op_count,
            after_second,
            "a rejected write never enters the op log"
        );

        // An unknown type is likewise refused with a validation error, no op.
        let bad_type = engine.author_typed_node("Wizard", serde_json::json!({ "name": "Z" }));
        assert!(matches!(bad_type, Err(StoreError::Validation { .. })));
        assert_eq!(engine.status().unwrap().applied_op_count, after_second);

        // The typed node survives a runtime wipe (derived listing re-derives it).
        let node_id = node.node_id.clone();
        let rebuilt = engine.rebuild().unwrap();
        let listed = rebuilt.nodes().unwrap();
        assert!(
            listed
                .iter()
                .any(|n| n.node_id == node_id && n.type_label.as_deref() == Some("Capability")),
            "the typed node is re-derived after a rebuild"
        );
    }

    #[test]
    fn plan_and_actual_claims_resolve_and_diff_across_viewpoints() {
        let dir = TempDir::new().unwrap();
        let mut engine = Engine::create(dir.path(), None).unwrap();

        // Author an Application; capture its id.
        let app = engine
            .author_typed_node("Application", serde_json::json!({ "name": "Billing" }))
            .unwrap();
        let id = app.node_id.clone();

        // A plan claim: lifecycle = Target over [0, 100). An actual claim:
        // lifecycle = Current from 50 onward (open-ended).
        engine
            .set_property_claim(
                &id,
                "Application",
                "lifecycle",
                "Build",
                "plan",
                0,
                Some(100),
            )
            .unwrap();
        engine
            .set_property_claim(&id, "Application", "lifecycle", "Run", "actual", 50, None)
            .unwrap();

        let plan_first = Viewpoint {
            as_of: 10,
            layers: vec!["actual".into(), "plan".into()],
        };
        let after_actual = Viewpoint {
            as_of: 60,
            layers: vec!["actual".into(), "plan".into()],
        };

        // At as_of=10 only the plan interval covers: lifecycle resolves to Target.
        let early = engine.state_at(&plan_first).unwrap();
        let early_app = early.iter().find(|e| e.node_id == id).unwrap();
        let early_life = early_app
            .properties
            .iter()
            .find(|p| p.field == "lifecycle")
            .unwrap();
        assert_eq!(early_life.value, "Build");
        assert_eq!(early_life.layer, "plan");

        // At as_of=60 the actual layer wins: lifecycle resolves to Current.
        let late = engine.state_at(&after_actual).unwrap();
        let late_life = late
            .iter()
            .find(|e| e.node_id == id)
            .unwrap()
            .properties
            .iter()
            .find(|p| p.field == "lifecycle")
            .unwrap();
        assert_eq!(late_life.value, "Run");
        assert_eq!(late_life.layer, "actual");

        // The diff between the two viewpoints reports the lifecycle change.
        let deltas = engine.diff(&plan_first, &after_actual).unwrap();
        let life_delta = deltas
            .iter()
            .find(|d| d.node_id == id && d.field == "lifecycle")
            .unwrap();
        assert_eq!(life_delta.before.as_deref(), Some("Build"));
        assert_eq!(life_delta.after.as_deref(), Some("Run"));

        // A claim with an out-of-range enum is refused; no op appended.
        let before_ops = engine.status().unwrap().applied_op_count;
        let bad =
            engine.set_property_claim(&id, "Application", "lifecycle", "Nonsense", "plan", 0, None);
        assert!(matches!(bad, Err(StoreError::Validation { .. })));
        assert_eq!(engine.status().unwrap().applied_op_count, before_ops);

        // Resolution survives a runtime wipe: it re-derives from canonical ops.
        let rebuilt = engine.rebuild().unwrap();
        let after = rebuilt.state_at(&after_actual).unwrap();
        let after_life = after
            .iter()
            .find(|e| e.node_id == id)
            .unwrap()
            .properties
            .iter()
            .find(|p| p.field == "lifecycle")
            .unwrap();
        assert_eq!(after_life.value, "Run", "resolution re-derives after wipe");
    }

    #[test]
    fn full_thread_rebuild_is_structurally_and_semantically_equivalent() {
        // The golden journey's final assertion over the whole slice: author a
        // typed twin + plan/actual claims, then wipe the runtime and rebuild —
        // the structural foundation hash AND the resolved semantic state must
        // both come back identical ([golden-journey] step 10).
        let dir = TempDir::new().unwrap();
        let mut engine = Engine::create(dir.path(), None).unwrap();

        let cap = engine
            .author_typed_node(
                "Capability",
                serde_json::json!({ "name": "Insight", "tier": "Strategic" }),
            )
            .unwrap();
        let app = engine
            .author_typed_node("Application", serde_json::json!({ "name": "Billing" }))
            .unwrap();
        engine
            .set_property_claim(
                &app.node_id,
                "Application",
                "lifecycle",
                "Build",
                "plan",
                0,
                Some(100),
            )
            .unwrap();
        engine
            .set_property_claim(
                &app.node_id,
                "Application",
                "lifecycle",
                "Run",
                "actual",
                50,
                None,
            )
            .unwrap();

        let view = Viewpoint {
            as_of: 60,
            layers: vec!["actual".into(), "plan".into()],
        };
        let hash_before = engine.status().unwrap().foundation_rebuild_hash;
        let state_before = engine.state_at(&view).unwrap();

        let rebuilt = engine.rebuild().unwrap();
        let hash_after = rebuilt.status().unwrap().foundation_rebuild_hash;
        let state_after = rebuilt.state_at(&view).unwrap();

        assert_eq!(
            hash_before, hash_after,
            "structural foundation hash is stable across a wipe"
        );
        assert_eq!(
            state_before, state_after,
            "resolved semantic state re-derives identically"
        );
        // Sanity: the semantic state actually carries the resolved thread.
        assert!(state_after.iter().any(|e| e.node_id == cap.node_id));
        assert!(
            state_after
                .iter()
                .find(|e| e.node_id == app.node_id)
                .unwrap()
                .properties
                .iter()
                .any(|p| p.field == "lifecycle" && p.value == "Run" && p.layer == "actual")
        );
    }

    #[test]
    fn rebuild_wipes_runtime_and_preserves_the_foundation_hash() {
        let dir = TempDir::new().unwrap();
        let actor = Id::new_v4();
        let mut engine = Engine::create(dir.path(), Some(actor)).unwrap();
        engine
            .author(
                actor,
                Origin::manual(),
                OpPayload::ActorDeclare(ActorDeclare {
                    declared_actor_id: actor,
                    actor_kind: ActorKind::Person,
                    display_name: "Architect".into(),
                }),
            )
            .unwrap();
        let before = engine.status().unwrap();

        // Rebuild deletes the derived runtime and replays canonical material.
        let rebuilt = engine.rebuild().unwrap();
        let after = rebuilt.status().unwrap();

        assert_eq!(after.applied_op_count, before.applied_op_count);
        assert_eq!(
            after.foundation_rebuild_hash, before.foundation_rebuild_hash,
            "rebuild yields a logically equivalent foundation"
        );
    }
}
