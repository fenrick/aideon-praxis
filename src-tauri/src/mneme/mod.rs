//! Host-side Mneme commands bridging renderer IPC calls to the Mneme store.

use aideon_praxis::mneme::{ActorId, Hlc, Layer, ScenarioId};
use aideon_praxis::mneme::{
    AnalyticsApi, AnalyticsResultsApi, ChangeEvent, ChangeFeedApi, ClearPropIntervalInput,
    CompareOp, ComputedCacheApi, ComputedCacheEntry, ComputedRule, ComputedRulesApi,
    CounterUpdateInput, CreateEdgeInput, CreateNodeInput, CreateScenarioInput, DiagnosticsApi,
    Direction, EdgeTypeRule, EntityKind, ExplainResolutionInput, ExplainResolutionResult,
    ExplainTraversalInput, ExplainTraversalResult, ExportOpsInput, ExportOptions, ExportRecord,
    FieldFilter, GetGraphDegreeStatsInput, GetGraphEdgeTypeCountsInput, GetProjectionEdgesInput,
    GraphDegreeStat, GraphEdgeTypeCount, GraphReadApi, GraphWriteApi, ImportOptions, ImportReport,
    IntegrityHead, JobSummary, ListComputedCacheInput, ListEntitiesInput, ListEntitiesResultItem,
    MetamodelApi, MetamodelBatch, MnemeError, MnemeExportApi, MnemeImportApi, MnemeProcessingApi,
    MnemeSnapshotApi, OpEnvelope, OpId, OrSetUpdateInput, PageRankRunSpec, PartitionId,
    ProjectionEdge, PropertyWriteApi, ReadEntityAtTimeInput, ReadEntityAtTimeResult,
    RetentionPolicy, RunWorkerInput, ScenarioApi, SchemaHead, SchemaManifest, SchemaVersion,
    SetEdgeExistenceIntervalInput, SetOp, SetPropIntervalInput, SnapshotOptions, SyncApi,
    TraverseAtTimeInput, TraverseEdgeItem, TriggerCompactionInput, TriggerProcessingInput,
    TriggerRetentionInput, ValidTime, ValidationRule, ValidationRulesApi, Value,
};
use log::{debug, error, info};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::atomic::{AtomicU64, Ordering};
use tauri::Emitter;
use tauri::State;
use tauri::Window;
use tauri::async_runtime::spawn;
use time::OffsetDateTime;
use time::format_description::well_known::Rfc3339;
use tokio::sync::oneshot;

use crate::ipc::{EmptyPayload, HostError, IpcRequest, IpcResponse, ipc_handle};
use crate::worker::WorkerState;

static SUBSCRIPTION_COUNTER: AtomicU64 = AtomicU64::new(1);

include!("commands_write.rs");
include!("commands_read.rs");
include!("commands_analytics_sync.rs");
include!("commands_processing.rs");
include!("store_core.rs");
include!("store_processing.rs");
include!("helpers.rs");
include!("payloads_graph.rs");
include!("payloads_analytics_sync.rs");
include!("payloads_processing.rs");

#[cfg(test)]
#[path = "../../tests/internal/mneme_tests.rs"]
mod tests;
