//! The canonical operation record: the typed envelope, the kebab `kind`
//! discriminator and its registry code, the per-kind typed payloads, and the
//! parse/normalise/digest pipeline ([ADR-0038], [canonical-json]).

use serde::{Deserialize, Serialize};
use serde_json::Value as JsonValue;
use std::collections::HashSet;

use crate::canonical::{CANONICAL_JSON_PROFILE_VERSION, blake3_hex, canonical_jsonl_record};
use crate::error::CoreError;
use crate::ids::Id;
use crate::schema::AuthoredMetamodelBatch;
use crate::time::{Hlc, ValidTime};
use crate::value::{FiniteF64, Value};

/// The M1 authoring-object kind carried by a grouped operation batch.
#[derive(Clone, Copy, PartialEq, Eq, Debug, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum ChangeEventKind {
    /// A base-case actual-layer change. Plan Events arrive with M2.
    Change,
}

/// Approval state for an M1 Change Event.
#[derive(Clone, Copy, PartialEq, Eq, Debug, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum ChangeEventApprovalState {
    /// No approval workflow applies before Themis owns that policy at M6.
    NotRequired,
}

/// Lifecycle recorded once a Change Event's operation batch is durable.
#[derive(Clone, Copy, PartialEq, Eq, Debug, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum ChangeEventLifecycle {
    /// The complete batch reached its canonical commit marker.
    Applied,
}

/// Canonical authoring context repeated on every operation in one Change Event.
///
/// Repetition keeps each operation self-describing while `transaction_id`
/// groups the atomic batch. The host derives the M1 defaults; the renderer only
/// supplies the rationale and task actions.
#[derive(Clone, PartialEq, Eq, Debug, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct ChangeEventMetadata {
    /// Stable identity of the user-facing authoring object.
    pub change_event_id: Id,
    /// M1 supports ordinary Change Events; Plan Events arrive with M2.
    pub event_kind: ChangeEventKind,
    /// Logical workspace actor responsible for the change.
    pub owner_actor_id: Id,
    /// Human-authored reason for the change.
    pub rationale: String,
    /// Stable source identifier for the authoring surface.
    pub source: String,
    /// Approval is explicitly not required until governance arrives at M6.
    pub approval_state: ChangeEventApprovalState,
    /// Optional grouping identity for related authoring objects.
    pub group_id: Option<Id>,
    /// Dependencies on earlier Change Events, empty for the M1 local writer.
    pub dependency_event_ids: Vec<Id>,
    /// Durable lifecycle state represented by these committed operations.
    pub lifecycle: ChangeEventLifecycle,
}

impl ChangeEventMetadata {
    /// Build the settled M1 metadata for a durably applied desktop change.
    #[must_use]
    pub fn applied(
        change_event_id: Id,
        owner_actor_id: Id,
        rationale: impl Into<String>,
        source: impl Into<String>,
    ) -> Self {
        Self {
            change_event_id,
            event_kind: ChangeEventKind::Change,
            owner_actor_id,
            rationale: rationale.into(),
            source: source.into(),
            approval_state: ChangeEventApprovalState::NotRequired,
            group_id: None,
            dependency_event_ids: Vec::new(),
            lifecycle: ChangeEventLifecycle::Applied,
        }
    }
}

/// Reserved discriminator for an atomic Change Event batch commit marker.
pub const BATCH_COMMIT_RECORD_TYPE: &str = "change-event-commit";

/// Canonical marker that makes all preceding operations for a transaction
/// visible as one committed Change Event.
#[derive(Clone, PartialEq, Eq, Debug, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct BatchCommit {
    record_type: String,
    /// Canonical record format version.
    pub format_version: u32,
    /// Transaction shared by the covered operations.
    pub transaction_id: Id,
    /// Covered operation identities in append order.
    pub operation_ids: Vec<Id>,
    /// Redundant count used to reject truncated or edited markers.
    pub operation_count: u64,
    /// BLAKE3 over the exact ordered canonical operation-record bytes.
    pub operations_digest: String,
}

impl BatchCommit {
    /// Build a commit marker over an ordered operation byte sequence.
    #[must_use]
    pub fn new(transaction_id: Id, operation_ids: Vec<Id>, operation_bytes: &[u8]) -> Self {
        Self {
            record_type: BATCH_COMMIT_RECORD_TYPE.to_string(),
            format_version: CANONICAL_JSON_PROFILE_VERSION,
            operation_count: operation_ids.len() as u64,
            transaction_id,
            operation_ids,
            operations_digest: blake3_hex(operation_bytes),
        }
    }

    /// Canonical JSONL bytes for this commit marker.
    pub fn canonical_record_bytes(&self) -> Result<Vec<u8>, CoreError> {
        let value = serde_json::to_value(self)
            .map_err(|e| CoreError::InvalidRecord(format!("batch commit: {e}")))?;
        canonical_jsonl_record(&value)
    }
}

/// Parse and validate one canonical Change Event commit-marker line.
pub fn parse_batch_commit_line(line: &str) -> Result<BatchCommit, CoreError> {
    let commit: BatchCommit = serde_json::from_str(line)
        .map_err(|e| CoreError::InvalidRecord(format!("batch commit: {e}")))?;
    if commit.record_type != BATCH_COMMIT_RECORD_TYPE {
        return Err(CoreError::InvalidRecord(format!(
            "batch commit record_type must be `{BATCH_COMMIT_RECORD_TYPE}`"
        )));
    }
    if commit.format_version != CANONICAL_JSON_PROFILE_VERSION {
        return Err(CoreError::InvalidRecord(format!(
            "unsupported batch commit format_version {}",
            commit.format_version
        )));
    }
    if commit.operation_count != commit.operation_ids.len() as u64 {
        return Err(CoreError::InvalidRecord(
            "batch commit operation_count does not match operation_ids".to_string(),
        ));
    }
    if commit.operation_ids.is_empty() {
        return Err(CoreError::InvalidRecord(
            "batch commit must cover at least one operation".to_string(),
        ));
    }
    let mut operation_ids = HashSet::with_capacity(commit.operation_ids.len());
    if !commit
        .operation_ids
        .iter()
        .all(|id| operation_ids.insert(*id))
    {
        return Err(CoreError::InvalidRecord(
            "batch commit operation_ids must be unique".to_string(),
        ));
    }
    Ok(commit)
}

/// The layer a fact or edge existence is asserted into.
#[derive(Clone, Copy, PartialEq, Eq, Debug, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum Layer {
    /// A planned (non-actual) belief.
    Plan,
    /// The actual, realised belief.
    Actual,
}

/// Bulk-import write options carried on a mutating operation.
#[derive(Clone, Copy, PartialEq, Eq, Debug, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct WriteOptions {
    /// Whether the operation is part of an accepted bulk-import job.
    pub bulk_mode: bool,
}

/// Through which process an operation arose (provenance, distinct from the
/// asserting `actor_id`). A `manual` origin carries only `kind`; the optional
/// fields are present only for the origins that use them.
#[derive(Clone, PartialEq, Eq, Debug, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct Origin {
    /// Which kind of process produced the operation.
    pub kind: OriginKind,
    /// Import-origin: the batch this operation belongs to.
    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub import_batch_id: Option<Id>,
    /// Import-origin: digest of the source artefact.
    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub source_digest: Option<String>,
    /// Import-origin: digest of the mapping configuration.
    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub mapping_config_digest: Option<String>,
    /// Import-origin: the source item key within the batch.
    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub source_item_key: Option<String>,
    /// Connector-origin: the connector run that produced the operation.
    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub connector_run_id: Option<Id>,
}

impl Origin {
    /// A manual origin (a human action), carrying only `kind`.
    #[must_use]
    pub const fn manual() -> Self {
        Self {
            kind: OriginKind::Manual,
            import_batch_id: None,
            source_digest: None,
            mapping_config_digest: None,
            source_item_key: None,
            connector_run_id: None,
        }
    }
}

/// The kind of process that produced an operation.
#[derive(Clone, Copy, PartialEq, Eq, Debug, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum OriginKind {
    /// A human action.
    Manual,
    /// An import batch.
    Import,
    /// A connector run.
    Connector,
    /// An automated/AI generation.
    Generated,
    /// The system itself.
    System,
}

/// The kind of logical actor introduced by an `actor-declare` operation.
#[derive(Clone, Copy, PartialEq, Eq, Debug, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum ActorKind {
    /// A human.
    Person,
    /// An import job.
    Import,
    /// An AI process.
    Ai,
    /// A connector run.
    Connector,
    /// The system.
    System,
}

/// The M0-valid operation kinds. Deferred kinds keep reserved registry codes
/// (6/7 CRDT, 9/10 scenario lifecycle) but are not accepted here.
#[derive(Clone, Copy, PartialEq, Eq, Debug, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum OpKind {
    /// Create a node entity (code 1).
    CreateNode,
    /// Create an edge with an existence interval (code 2).
    CreateEdge,
    /// Soft-delete an entity by supersession (code 3).
    TombstoneEntity,
    /// Set a typed property over a valid-time interval (code 4).
    SetPropertyInterval,
    /// Close a property interval (code 5).
    ClearPropertyInterval,
    /// A batch schema-as-data update (code 8).
    UpsertMetamodelBatch,
    /// Modify an edge's existence interval (code 11).
    SetEdgeExistenceInterval,
    /// Declare a logical actor (code 12).
    ActorDeclare,
}

impl OpKind {
    /// The reserved `u16` registry code (record-absent; projection/registry
    /// only).
    #[must_use]
    pub const fn code(self) -> u16 {
        match self {
            Self::CreateNode => 1,
            Self::CreateEdge => 2,
            Self::TombstoneEntity => 3,
            Self::SetPropertyInterval => 4,
            Self::ClearPropertyInterval => 5,
            Self::UpsertMetamodelBatch => 8,
            Self::SetEdgeExistenceInterval => 11,
            Self::ActorDeclare => 12,
        }
    }

    /// The stable kebab discriminator.
    #[must_use]
    pub const fn as_str(self) -> &'static str {
        match self {
            Self::CreateNode => "create-node",
            Self::CreateEdge => "create-edge",
            Self::TombstoneEntity => "tombstone-entity",
            Self::SetPropertyInterval => "set-property-interval",
            Self::ClearPropertyInterval => "clear-property-interval",
            Self::UpsertMetamodelBatch => "upsert-metamodel-batch",
            Self::SetEdgeExistenceInterval => "set-edge-existence-interval",
            Self::ActorDeclare => "actor-declare",
        }
    }
}

/// `create-node` payload (code 1).
#[derive(Clone, PartialEq, Eq, Debug, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct CreateNode {
    /// The workspace's sole partition.
    pub partition: Id,
    /// Scenario overlay; `null` (base case) only at M0.
    pub scenario_id: Option<Id>,
    /// The asserting logical actor.
    pub actor: Id,
    /// Asserted time.
    pub asserted_at: Hlc,
    /// Per-instance entity identifier.
    pub node_id: Id,
    /// Metamodel type symbol UUID.
    pub type_id: Option<Id>,
    /// Bulk write options.
    pub write_options: Option<WriteOptions>,
}

/// `create-edge` payload (code 2).
#[derive(Clone, PartialEq, Debug, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct CreateEdge {
    /// The workspace's sole partition.
    pub partition: Id,
    /// Scenario overlay; `null` only at M0.
    pub scenario_id: Option<Id>,
    /// The asserting logical actor.
    pub actor: Id,
    /// Asserted time.
    pub asserted_at: Hlc,
    /// Per-instance edge identifier.
    pub edge_id: Id,
    /// Metamodel relationship symbol UUID.
    pub type_id: Option<Id>,
    /// Source entity instance.
    pub src_id: Id,
    /// Destination entity instance.
    pub dst_id: Id,
    /// Existence interval start.
    pub exists_valid_from: ValidTime,
    /// Existence interval end (half-open); `null` for open-ended.
    pub exists_valid_to: Option<ValidTime>,
    /// The layer.
    pub layer: Layer,
    /// Optional edge weight.
    pub weight: Option<FiniteF64>,
    /// Bulk write options.
    pub write_options: Option<WriteOptions>,
}

/// `tombstone-entity` payload (code 3).
#[derive(Clone, PartialEq, Eq, Debug, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct TombstoneEntity {
    /// The workspace's sole partition.
    pub partition: Id,
    /// Scenario overlay; `null` only at M0.
    pub scenario_id: Option<Id>,
    /// The asserting logical actor.
    pub actor: Id,
    /// Asserted time.
    pub asserted_at: Hlc,
    /// The node or edge instance to tombstone.
    pub entity_id: Id,
}

/// `set-property-interval` payload (code 4).
#[derive(Clone, PartialEq, Debug, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct SetPropertyInterval {
    /// The workspace's sole partition.
    pub partition: Id,
    /// Scenario overlay; `null` only at M0.
    pub scenario_id: Option<Id>,
    /// The asserting logical actor.
    pub actor: Id,
    /// Asserted time.
    pub asserted_at: Hlc,
    /// The entity instance the slot belongs to.
    pub entity_id: Id,
    /// The attribute symbol UUID.
    pub field_id: Id,
    /// The typed value.
    pub value: Value,
    /// Interval start.
    pub valid_from: ValidTime,
    /// Interval end (half-open); `null` for open-ended.
    pub valid_to: Option<ValidTime>,
    /// The layer.
    pub layer: Layer,
    /// Bulk write options.
    pub write_options: Option<WriteOptions>,
}

/// `clear-property-interval` payload (code 5).
#[derive(Clone, PartialEq, Eq, Debug, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct ClearPropertyInterval {
    /// The workspace's sole partition.
    pub partition: Id,
    /// Scenario overlay; `null` only at M0.
    pub scenario_id: Option<Id>,
    /// The asserting logical actor.
    pub actor: Id,
    /// Asserted time.
    pub asserted_at: Hlc,
    /// The entity instance.
    pub entity_id: Id,
    /// The attribute symbol UUID.
    pub field_id: Id,
    /// Interval start.
    pub valid_from: ValidTime,
    /// Interval end (half-open); `null` for open-ended.
    pub valid_to: Option<ValidTime>,
    /// The layer.
    pub layer: Layer,
    /// Bulk write options.
    pub write_options: Option<WriteOptions>,
}

/// `set-edge-existence-interval` payload (code 11).
#[derive(Clone, PartialEq, Eq, Debug, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct SetEdgeExistenceInterval {
    /// The workspace's sole partition.
    pub partition: Id,
    /// Scenario overlay; `null` only at M0.
    pub scenario_id: Option<Id>,
    /// The asserting logical actor.
    pub actor: Id,
    /// Asserted time.
    pub asserted_at: Hlc,
    /// The edge instance.
    pub edge_id: Id,
    /// Interval start.
    pub valid_from: ValidTime,
    /// Interval end (half-open); `null` for open-ended.
    pub valid_to: Option<ValidTime>,
    /// The layer.
    pub layer: Layer,
    /// When true, suppresses the edge from `valid_from` within its layer.
    pub is_tombstone: bool,
    /// Bulk write options.
    pub write_options: Option<WriteOptions>,
}

/// `actor-declare` payload (code 12).
#[derive(Clone, PartialEq, Eq, Debug, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct ActorDeclare {
    /// The opaque, stable, device-independent logical actor UUID.
    pub declared_actor_id: Id,
    /// What kind of logical actor this is.
    pub actor_kind: ActorKind,
    /// Human-readable label (never used to infer identity).
    pub display_name: String,
}

/// The typed per-kind payload. Serialised inline (the `kind` discriminator is a
/// sibling envelope field, never a payload wrapper).
#[derive(Clone, PartialEq, Debug, Serialize)]
#[serde(untagged)]
pub enum OpPayload {
    /// `create-node`.
    CreateNode(CreateNode),
    /// `create-edge`.
    CreateEdge(CreateEdge),
    /// `tombstone-entity`.
    TombstoneEntity(TombstoneEntity),
    /// `set-property-interval`.
    SetPropertyInterval(SetPropertyInterval),
    /// `clear-property-interval`.
    ClearPropertyInterval(ClearPropertyInterval),
    /// `upsert-metamodel-batch`.
    UpsertMetamodelBatch(AuthoredMetamodelBatch),
    /// `set-edge-existence-interval`.
    SetEdgeExistenceInterval(SetEdgeExistenceInterval),
    /// `actor-declare`.
    ActorDeclare(ActorDeclare),
}

impl OpPayload {
    /// The kind discriminator for this payload.
    #[must_use]
    pub const fn kind(&self) -> OpKind {
        match self {
            Self::CreateNode(_) => OpKind::CreateNode,
            Self::CreateEdge(_) => OpKind::CreateEdge,
            Self::TombstoneEntity(_) => OpKind::TombstoneEntity,
            Self::SetPropertyInterval(_) => OpKind::SetPropertyInterval,
            Self::ClearPropertyInterval(_) => OpKind::ClearPropertyInterval,
            Self::UpsertMetamodelBatch(_) => OpKind::UpsertMetamodelBatch,
            Self::SetEdgeExistenceInterval(_) => OpKind::SetEdgeExistenceInterval,
            Self::ActorDeclare(_) => OpKind::ActorDeclare,
        }
    }
}

/// The canonical append-only operation record.
#[derive(Clone, PartialEq, Debug, Serialize)]
pub struct OpEnvelope {
    /// Permanent identity of this one append.
    pub op_id: Id,
    /// Who or what asserted the operation.
    pub actor_id: Id,
    /// Hybrid logical clock asserted time.
    pub asserted_at: Hlc,
    /// Stable kebab discriminator.
    pub kind: OpKind,
    /// Canonical-JSON profile / record format version.
    pub format_version: u32,
    /// Provenance.
    pub origin: Origin,
    /// Causal dependencies, by `op_id` (`[]` for M0-authored ops).
    pub deps: Vec<Id>,
    /// Atomic Change Event transaction, absent on legacy M0 operations.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub transaction_id: Option<Id>,
    /// Canonical authoring context, present exactly when `transaction_id` is.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub change_event: Option<ChangeEventMetadata>,
    /// Typed payload for this kind.
    pub payload: OpPayload,
}

impl OpEnvelope {
    /// Build an envelope, deriving `kind` from the payload and pinning the
    /// current canonical format version.
    #[must_use]
    pub fn new(
        op_id: Id,
        actor_id: Id,
        asserted_at: Hlc,
        origin: Origin,
        deps: Vec<Id>,
        payload: OpPayload,
    ) -> Self {
        Self {
            op_id,
            actor_id,
            asserted_at,
            kind: payload.kind(),
            format_version: CANONICAL_JSON_PROFILE_VERSION,
            origin,
            deps,
            transaction_id: None,
            change_event: None,
            payload,
        }
    }

    /// Attach this operation to one atomic Change Event batch.
    #[must_use]
    pub fn in_change_event(
        mut self,
        transaction_id: Id,
        change_event: ChangeEventMetadata,
    ) -> Self {
        self.transaction_id = Some(transaction_id);
        self.change_event = Some(change_event);
        self
    }

    /// The partition this operation belongs to, where the payload carries one.
    /// `actor-declare` carries no partition in its payload (it is partition-less
    /// at the payload level); callers supply the manifest partition for it.
    #[must_use]
    pub fn payload_partition(&self) -> Option<Id> {
        match &self.payload {
            OpPayload::CreateNode(p) => Some(p.partition),
            OpPayload::CreateEdge(p) => Some(p.partition),
            OpPayload::TombstoneEntity(p) => Some(p.partition),
            OpPayload::SetPropertyInterval(p) => Some(p.partition),
            OpPayload::ClearPropertyInterval(p) => Some(p.partition),
            OpPayload::SetEdgeExistenceInterval(p) => Some(p.partition),
            OpPayload::UpsertMetamodelBatch(_) | OpPayload::ActorDeclare(_) => None,
        }
    }

    /// The canonical [`serde_json::Value`] tree for this record.
    pub fn canonical_value(&self) -> Result<JsonValue, CoreError> {
        serde_json::to_value(self)
            .map_err(|e| CoreError::BadNumber(format!("could not build record JSON: {e}")))
    }

    /// The canonical record bytes: canonical JSON plus exactly one trailing LF.
    pub fn canonical_record_bytes(&self) -> Result<Vec<u8>, CoreError> {
        canonical_jsonl_record(&self.canonical_value()?)
    }

    /// The `blake3-256` lower-case hex digest over the canonical record bytes.
    pub fn canonical_record_digest(&self) -> Result<String, CoreError> {
        Ok(blake3_hex(&self.canonical_record_bytes()?))
    }
}

/// The deferred (reserved-but-not-M0) kind names, recognised so the reader can
/// refuse them with a precise diagnostic rather than a generic parse error.
const DEFERRED_KINDS: &[&str] = &[
    "or-set-update",
    "counter-update",
    "create-scenario",
    "delete-scenario",
];

#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
struct RawEnvelope {
    op_id: Id,
    actor_id: Id,
    asserted_at: Hlc,
    kind: String,
    format_version: u32,
    origin: Origin,
    deps: Vec<Id>,
    #[serde(default)]
    transaction_id: Option<Id>,
    #[serde(default)]
    change_event: Option<ChangeEventMetadata>,
    payload: JsonValue,
}

/// Parse a canonical record from a [`serde_json::Value`], validating the
/// envelope and routing the payload to its typed shape. Deferred kinds are
/// refused with [`CoreError::UnsupportedKind`]; structurally invalid records
/// with [`CoreError::InvalidRecord`].
pub fn parse_record(value: &JsonValue) -> Result<OpEnvelope, CoreError> {
    let raw: RawEnvelope = serde_json::from_value(value.clone())
        .map_err(|e| CoreError::InvalidRecord(format!("envelope: {e}")))?;

    if raw.format_version < 1 {
        return Err(CoreError::InvalidRecord(format!(
            "format_version must be >= 1, got {}",
            raw.format_version
        )));
    }

    let kind = match raw.kind.as_str() {
        "create-node" => OpKind::CreateNode,
        "create-edge" => OpKind::CreateEdge,
        "tombstone-entity" => OpKind::TombstoneEntity,
        "set-property-interval" => OpKind::SetPropertyInterval,
        "clear-property-interval" => OpKind::ClearPropertyInterval,
        "upsert-metamodel-batch" => OpKind::UpsertMetamodelBatch,
        "set-edge-existence-interval" => OpKind::SetEdgeExistenceInterval,
        "actor-declare" => OpKind::ActorDeclare,
        other if DEFERRED_KINDS.contains(&other) => {
            return Err(CoreError::UnsupportedKind(other.to_string()));
        }
        other => {
            return Err(CoreError::InvalidRecord(format!("unknown kind `{other}`")));
        }
    };

    let payload = route_payload(kind, raw.payload)?;
    if raw.transaction_id.is_some() != raw.change_event.is_some() {
        return Err(CoreError::InvalidRecord(
            "transaction_id and change_event must be present together".to_string(),
        ));
    }
    Ok(OpEnvelope {
        op_id: raw.op_id,
        actor_id: raw.actor_id,
        asserted_at: raw.asserted_at,
        kind,
        format_version: raw.format_version,
        origin: raw.origin,
        deps: raw.deps,
        transaction_id: raw.transaction_id,
        change_event: raw.change_event,
        payload,
    })
}

/// Parse a canonical record from a single JSONL line.
pub fn parse_record_line(line: &str) -> Result<OpEnvelope, CoreError> {
    let value: JsonValue = serde_json::from_str(line)
        .map_err(|e| CoreError::InvalidRecord(format!("line is not JSON: {e}")))?;
    parse_record(&value)
}

fn route_payload(kind: OpKind, payload: JsonValue) -> Result<OpPayload, CoreError> {
    fn decode<T: for<'de> Deserialize<'de>>(payload: JsonValue) -> Result<T, CoreError> {
        serde_json::from_value(payload)
            .map_err(|e| CoreError::InvalidRecord(format!("payload: {e}")))
    }
    Ok(match kind {
        OpKind::CreateNode => OpPayload::CreateNode(decode(payload)?),
        OpKind::CreateEdge => OpPayload::CreateEdge(decode(payload)?),
        OpKind::TombstoneEntity => OpPayload::TombstoneEntity(decode(payload)?),
        OpKind::SetPropertyInterval => OpPayload::SetPropertyInterval(decode(payload)?),
        OpKind::ClearPropertyInterval => OpPayload::ClearPropertyInterval(decode(payload)?),
        OpKind::UpsertMetamodelBatch => OpPayload::UpsertMetamodelBatch(decode(payload)?),
        OpKind::SetEdgeExistenceInterval => OpPayload::SetEdgeExistenceInterval(decode(payload)?),
        OpKind::ActorDeclare => OpPayload::ActorDeclare(decode(payload)?),
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::str::FromStr;

    fn sample_set_property() -> OpEnvelope {
        let id = |s: &str| Id::from_str(s).unwrap();
        OpEnvelope::new(
            id("33333333-0000-4000-8000-000000000004"),
            id("00000000-0000-4000-8000-0000000000a1"),
            Hlc(7_338_950_400_000_000_000),
            Origin::manual(),
            vec![],
            OpPayload::SetPropertyInterval(SetPropertyInterval {
                partition: id("00000000-0000-4000-8000-000000000001"),
                scenario_id: None,
                actor: id("00000000-0000-4000-8000-0000000000a1"),
                asserted_at: Hlc(7_338_950_400_000_000_000),
                entity_id: id("11111111-0000-4000-8000-000000000003"),
                field_id: id("cba320a9-7e3c-5597-b42f-284aad9a6406"),
                value: Value::Str("Migrate".into()),
                valid_from: ValidTime(1_767_225_600_000_000),
                valid_to: None,
                layer: Layer::Actual,
                write_options: None,
            }),
        )
    }

    #[test]
    fn canonical_record_matches_the_documented_example() {
        let env = sample_set_property();
        let bytes = env.canonical_record_bytes().unwrap();
        let line = String::from_utf8(bytes).unwrap();
        let expected = concat!(
            r#"{"actor_id":"00000000-0000-4000-8000-0000000000a1","#,
            r#""asserted_at":"7338950400000000000","deps":[],"#,
            r#""format_version":1,"kind":"set-property-interval","#,
            r#""op_id":"33333333-0000-4000-8000-000000000004","#,
            r#""origin":{"kind":"manual"},"#,
            r#""payload":{"actor":"00000000-0000-4000-8000-0000000000a1","#,
            r#""asserted_at":"7338950400000000000","#,
            r#""entity_id":"11111111-0000-4000-8000-000000000003","#,
            r#""field_id":"cba320a9-7e3c-5597-b42f-284aad9a6406","#,
            r#""layer":"actual","partition":"00000000-0000-4000-8000-000000000001","#,
            r#""scenario_id":null,"valid_from":"1767225600000000","valid_to":null,"#,
            r#""value":{"str":"Migrate"},"write_options":null}}"#,
            "\n"
        );
        assert_eq!(line, expected);
    }

    #[test]
    fn round_trips_through_parse() {
        let env = sample_set_property();
        let value = env.canonical_value().unwrap();
        let parsed = parse_record(&value).unwrap();
        assert_eq!(parsed, env);
        assert_eq!(
            parsed.canonical_record_digest().unwrap(),
            env.canonical_record_digest().unwrap()
        );
    }

    #[test]
    fn deferred_kind_is_refused_precisely() {
        let value = serde_json::json!({
            "op_id": "33333333-0000-4000-8000-000000000004",
            "actor_id": "00000000-0000-4000-8000-0000000000a1",
            "asserted_at": "1",
            "kind": "or-set-update",
            "format_version": 1,
            "origin": { "kind": "manual" },
            "deps": [],
            "payload": {}
        });
        assert_eq!(
            parse_record(&value),
            Err(CoreError::UnsupportedKind("or-set-update".into()))
        );
    }

    #[test]
    fn unknown_kind_is_invalid() {
        let value = serde_json::json!({
            "op_id": "33333333-0000-4000-8000-000000000004",
            "actor_id": "00000000-0000-4000-8000-0000000000a1",
            "asserted_at": "1",
            "kind": "frobnicate-widget",
            "format_version": 1,
            "origin": { "kind": "manual" },
            "deps": [],
            "payload": {}
        });
        assert!(matches!(
            parse_record(&value),
            Err(CoreError::InvalidRecord(_))
        ));
    }

    #[test]
    fn registry_codes_are_pinned() {
        assert_eq!(OpKind::CreateNode.code(), 1);
        assert_eq!(OpKind::SetEdgeExistenceInterval.code(), 11);
        assert_eq!(OpKind::ActorDeclare.code(), 12);
    }
}
