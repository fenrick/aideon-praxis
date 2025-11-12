use std::cmp::min;
use std::collections::{BTreeMap, HashSet, VecDeque};
use std::path::Path;
use std::sync::{Arc, Mutex, MutexGuard};

use aideon_continuum::SnapshotStore;
use aideon_mneme::meta::MetaModelDocument;
use aideon_mneme::temporal::{
    BranchInfo, ChangeSet, CommitChangesRequest, CommitRef, CommitSummary, DiffArgs, DiffPatch,
    DiffSummary, EdgeTombstone, EdgeVersion, MergeConflict, MergeRequest, MergeResponse,
    NodeTombstone, NodeVersion, StateAtArgs, StateAtResult, TopologyDeltaArgs, TopologyDeltaResult,
};
use aideon_mneme::{
    MemorySnapshotStore, MemoryStore, PersistedCommit, SqliteDb, Store, sanitize_id,
};
use bincode::{deserialize, serialize};
use blake3::Hasher;
use serde::Serialize;
use serde_json::json;
use time::OffsetDateTime;
use time::format_description::well_known::Rfc3339;

use crate::error::{PraxisError, PraxisResult};
use crate::graph::{GraphSnapshot, SnapshotStats};
use crate::meta::{MetaModelConfig, MetaModelRegistry};
use crate::meta_seed::meta_model_seed_change_set;

#[derive(Clone, Debug)]
pub struct PraxisEngineConfig {
    /// Allow commits with empty change sets. Defaults to `false`.
    pub allow_empty_commits: bool,
    /// Prefix applied to generated commit identifiers. Defaults to `"c"`.
    pub commit_id_prefix: String,
    /// Meta-model configuration controlling schema enforcement.
    pub meta_model: MetaModelConfig,
}

impl Default for PraxisEngineConfig {
    fn default() -> Self {
        Self {
            allow_empty_commits: false,
            commit_id_prefix: "c".into(),
            meta_model: MetaModelConfig::default(),
        }
    }
}

#[derive(Clone)]
pub struct PraxisEngine {
    inner: Arc<Mutex<Inner>>,
}

struct Inner {
    commits: BTreeMap<String, CommitRecord>,
    branches: BTreeMap<String, BranchState>,
    config: PraxisEngineConfig,
    store: Arc<dyn Store>,
    snapshot_store: Arc<dyn SnapshotStore>,
    registry: Arc<MetaModelRegistry>,
}

#[derive(Clone, Debug)]
struct CommitRecord {
    summary: CommitSummary,
    snapshot: Arc<GraphSnapshot>,
    #[allow(dead_code)]
    change_set: ChangeSet,
}

#[derive(Clone, Debug, Default)]
struct BranchState {
    head: Option<String>,
}

impl PraxisEngine {
    pub fn new() -> Self {
        Self::with_config(PraxisEngineConfig::default())
    }

    pub fn with_config(config: PraxisEngineConfig) -> Self {
        Self::with_stores(
            config,
            Arc::new(MemoryStore::default()),
            Arc::new(MemorySnapshotStore::default()),
        )
        .expect("in-memory praxis engine initialization failed")
    }

    pub fn with_sqlite(path: impl AsRef<Path>) -> PraxisResult<Self> {
        Self::with_sqlite_and_config(path, PraxisEngineConfig::default())
    }

    pub fn with_sqlite_and_config(
        path: impl AsRef<Path>,
        config: PraxisEngineConfig,
    ) -> PraxisResult<Self> {
        let storage = SqliteDb::open(path)?;
        let snapshot = storage.snapshot_store();
        let commit_store: Arc<dyn Store> = Arc::new(storage.clone());
        let snapshot_store: Arc<dyn SnapshotStore> = Arc::new(snapshot);
        Self::with_stores(config, commit_store, snapshot_store)
    }

    pub fn with_stores(
        config: PraxisEngineConfig,
        store: Arc<dyn Store>,
        snapshot_store: Arc<dyn SnapshotStore>,
    ) -> PraxisResult<Self> {
        let inner = Inner::new(config, store, snapshot_store)?;
        let engine = Self {
            inner: Arc::new(Mutex::new(inner)),
        };
        engine.ensure_seeded()?;
        Ok(engine)
    }

    fn lock(&self) -> MutexGuard<'_, Inner> {
        self.inner.lock().expect("praxis engine mutex poisoned")
    }

    /// Ensure the commit log contains an initial design sample commit.
    pub fn ensure_seeded(&self) -> PraxisResult<()> {
        let needs_seed = {
            let inner = self.lock();
            inner
                .branches
                .get("main")
                .and_then(|branch| branch.head.clone())
                .is_none()
        };

        if !needs_seed {
            return Ok(());
        }

        let mut initial = build_seed_change_set();
        let meta_changes = meta_model_seed_change_set();
        initial.node_creates.extend(meta_changes.node_creates);
        initial.edge_creates.extend(meta_changes.edge_creates);
        let request = CommitChangesRequest {
            branch: "main".into(),
            parent: None,
            author: Some("bootstrap".into()),
            time: None,
            message: "seed: bootstrap design sample".into(),
            tags: vec!["seed".into(), "design".into()],
            changes: initial,
        };
        let _ = self.commit(request)?;
        Ok(())
    }

    pub fn commit(&self, request: CommitChangesRequest) -> PraxisResult<String> {
        let mut inner = self.lock();
        validate_branch_name(&request.branch)?;

        if !inner.config.allow_empty_commits && request.changes.is_empty() {
            return Err(PraxisError::ValidationFailed {
                message: "empty commits are disabled".into(),
            });
        }

        if !inner.branches.contains_key(&request.branch) {
            inner.store.ensure_branch(&request.branch)?;
            inner
                .branches
                .insert(request.branch.clone(), BranchState::default());
        }

        let current_head = inner
            .branches
            .get(&request.branch)
            .and_then(|state| state.head.clone());

        let expected_parent = match (&request.parent, &current_head) {
            (Some(explicit), Some(head)) if explicit != head => {
                return Err(PraxisError::ConcurrencyConflict {
                    branch: request.branch.clone(),
                    expected: Some(explicit.clone()),
                    actual: Some(head.clone()),
                });
            }
            (Some(explicit), _) => Some(explicit.clone()),
            (None, head) => head.clone(),
        };

        let base_snapshot = match expected_parent.as_deref() {
            Some(parent_id) => inner.snapshot_for(parent_id)?,
            None => Arc::new(GraphSnapshot::empty()),
        };

        let normalized_changes = normalize_change_set(&request.changes);
        if !inner.config.allow_empty_commits && normalized_changes.is_empty() {
            return Err(PraxisError::ValidationFailed {
                message: "empty commits are disabled".into(),
            });
        }

        let snapshot = Arc::new(base_snapshot.apply(&normalized_changes, inner.registry.as_ref())?);

        let parents: Vec<String> = expected_parent.into_iter().collect();
        let timestamp = request.time.clone().or_else(|| Some(current_timestamp()));

        let commit_id = derive_commit_id(
            &inner.config.commit_id_prefix,
            &request.branch,
            &parents,
            request.author.as_deref(),
            &request.message,
            &request.tags,
            &normalized_changes,
        );

        if inner.store.get_commit(&commit_id)?.is_some() {
            return Err(PraxisError::IntegrityViolation {
                message: format!("commit '{commit_id}' already exists"),
            });
        }

        let summary = CommitSummary {
            id: commit_id.clone(),
            parents: parents.clone(),
            branch: request.branch.clone(),
            author: request.author.clone(),
            time: timestamp,
            message: request.message.clone(),
            tags: request.tags.clone(),
            change_count: change_count(&normalized_changes),
        };

        let persisted = PersistedCommit {
            summary: summary.clone(),
            change_set: normalized_changes.clone(),
        };

        inner.store.put_commit(&persisted)?;
        inner.persist_snapshot(&commit_id, &snapshot)?;

        inner.store.compare_and_swap_branch(
            &request.branch,
            current_head.as_deref(),
            Some(&commit_id),
        )?;
        inner
            .branches
            .entry(request.branch.clone())
            .or_default()
            .head = Some(commit_id.clone());

        inner.commits.insert(
            commit_id.clone(),
            CommitRecord {
                summary,
                snapshot: Arc::clone(&snapshot),
                change_set: normalized_changes,
            },
        );

        Ok(commit_id)
    }

    pub fn create_branch(&self, name: String, from: Option<CommitRef>) -> PraxisResult<BranchInfo> {
        let mut inner = self.lock();
        validate_branch_name(&name)?;
        if inner.branches.contains_key(&name) {
            return Err(PraxisError::ValidationFailed {
                message: format!("branch '{name}' already exists"),
            });
        }

        let head = match from {
            Some(reference) => Some(resolve_commit_id(&mut inner, &reference, None)?),
            None => inner.branches.get("main").and_then(|b| b.head.clone()),
        };
        inner.store.ensure_branch(&name)?;
        inner
            .store
            .compare_and_swap_branch(&name, None, head.as_deref())?;
        inner
            .branches
            .insert(name.clone(), BranchState { head: head.clone() });
        Ok(BranchInfo { name, head })
    }

    pub fn list_commits(&self, branch: String) -> PraxisResult<Vec<CommitSummary>> {
        let mut inner = self.lock();
        let state = inner
            .branches
            .get(&branch)
            .ok_or_else(|| PraxisError::UnknownBranch {
                branch: branch.clone(),
            })?;

        let mut ordered: Vec<CommitSummary> = Vec::new();
        let mut cursor = state.head.clone();
        while let Some(id) = cursor {
            let record = inner.record_for(&id)?;
            ordered.push(record.summary.clone());
            cursor = record.summary.parents.first().cloned();
        }
        ordered.reverse();
        Ok(ordered)
    }

    pub fn state_at(&self, args: StateAtArgs) -> PraxisResult<StateAtResult> {
        let mut inner = self.lock();
        let (commit_id, snapshot, branch_name) =
            resolve_snapshot(&mut inner, &args.as_of, args.scenario.as_deref())?;
        let stats = snapshot.stats();
        Ok(StateAtResult::new(
            commit_id,
            Some(branch_name),
            args.confidence,
            stats.node_count as u64,
            stats.edge_count as u64,
        ))
    }

    pub fn diff_summary(&self, args: DiffArgs) -> PraxisResult<DiffSummary> {
        let mut inner = self.lock();
        let (from_id, from_snapshot, _) = resolve_snapshot(&mut inner, &args.from, None)?;
        let (to_id, to_snapshot, _) = resolve_snapshot(&mut inner, &args.to, None)?;
        let patch = from_snapshot.diff(&to_snapshot);
        Ok(DiffSummary::new(
            from_id,
            to_id,
            patch.node_adds.len() as u64,
            patch.node_mods.len() as u64,
            patch.node_dels.len() as u64,
            patch.edge_adds.len() as u64,
            patch.edge_mods.len() as u64,
            patch.edge_dels.len() as u64,
        ))
    }

    pub fn topology_delta(&self, args: TopologyDeltaArgs) -> PraxisResult<TopologyDeltaResult> {
        let mut inner = self.lock();
        let (from_id, from_snapshot, _) = resolve_snapshot(&mut inner, &args.from, None)?;
        let (to_id, to_snapshot, _) = resolve_snapshot(&mut inner, &args.to, None)?;
        let patch = from_snapshot.diff(&to_snapshot);
        Ok(TopologyDeltaResult::new(
            from_id,
            to_id,
            patch.node_adds.len() as u64,
            patch.node_dels.len() as u64,
            patch.edge_adds.len() as u64,
            patch.edge_dels.len() as u64,
        ))
    }

    pub fn list_branches(&self) -> Vec<BranchInfo> {
        let inner = self.lock();
        inner
            .branches
            .iter()
            .map(|(name, state)| BranchInfo {
                name: name.clone(),
                head: state.head.clone(),
            })
            .collect()
    }

    pub fn stats_for_commit(&self, commit_id: &str) -> PraxisResult<SnapshotStats> {
        let mut inner = self.lock();
        let record = inner.record_for(commit_id)?;
        Ok(record.snapshot.stats())
    }

    pub fn snapshot_for_commit(&self, commit_id: &str) -> PraxisResult<Arc<GraphSnapshot>> {
        let mut inner = self.lock();
        inner.snapshot_for(commit_id)
    }

    pub fn meta_model(&self) -> MetaModelDocument {
        let inner = self.lock();
        inner.registry.document()
    }

    pub fn merge(&self, request: MergeRequest) -> PraxisResult<MergeResponse> {
        let mut inner = self.lock();

        let source_head = inner
            .branches
            .get(&request.source)
            .ok_or_else(|| PraxisError::UnknownBranch {
                branch: request.source.clone(),
            })?
            .head
            .clone()
            .ok_or_else(|| PraxisError::UnknownCommit {
                commit: request.source.clone(),
            })?;
        let target_head = inner
            .branches
            .get(&request.target)
            .ok_or_else(|| PraxisError::UnknownBranch {
                branch: request.target.clone(),
            })?
            .head
            .clone()
            .ok_or_else(|| PraxisError::UnknownCommit {
                commit: request.target.clone(),
            })?;

        let base =
            find_common_ancestor(&mut inner, &source_head, &target_head)?.ok_or_else(|| {
                PraxisError::MergeConflict {
                    message: "branches do not share a common ancestor".into(),
                }
            })?;

        let base_snapshot = inner.snapshot_for(&base)?;
        let source_snapshot = inner.snapshot_for(&source_head)?;
        let target_snapshot = inner.snapshot_for(&target_head)?;

        let source_patch = base_snapshot.diff(&source_snapshot);
        let target_patch = base_snapshot.diff(&target_snapshot);

        let conflicts = detect_conflicts(&source_patch, &target_patch);
        if !conflicts.is_empty() {
            return Ok(MergeResponse {
                result: None,
                conflicts: Some(conflicts),
            });
        }

        let changes = build_change_set(target_snapshot.as_ref(), &source_patch);
        if changes.is_empty() {
            return Ok(MergeResponse {
                result: Some(target_head),
                conflicts: None,
            });
        }
        let normalized_changes = normalize_change_set(&changes);

        let parents = vec![target_head.clone(), source_head.clone()];
        let message = format!("merge {} -> {}", request.source, request.target);
        let tags = vec!["merge".into()];
        let commit_id = derive_commit_id(
            &inner.config.commit_id_prefix,
            &request.target,
            &parents,
            None,
            &message,
            &tags,
            &normalized_changes,
        );

        if inner.store.get_commit(&commit_id)?.is_some() {
            return Err(PraxisError::IntegrityViolation {
                message: format!("commit '{commit_id}' already exists"),
            });
        }

        let summary = CommitSummary {
            id: commit_id.clone(),
            parents: parents.clone(),
            branch: request.target.clone(),
            author: None,
            time: Some(current_timestamp()),
            message,
            tags: tags.clone(),
            change_count: change_count(&normalized_changes),
        };
        let snapshot =
            Arc::new(target_snapshot.apply(&normalized_changes, inner.registry.as_ref())?);

        let persisted = PersistedCommit {
            summary: summary.clone(),
            change_set: normalized_changes.clone(),
        };

        inner.store.put_commit(&persisted)?;
        inner.persist_snapshot(&commit_id, &snapshot)?;
        inner.store.compare_and_swap_branch(
            &request.target,
            Some(&target_head),
            Some(&commit_id),
        )?;
        inner
            .branches
            .entry(request.target.clone())
            .or_default()
            .head = Some(commit_id.clone());
        inner.commits.insert(
            commit_id.clone(),
            CommitRecord {
                summary,
                snapshot: Arc::clone(&snapshot),
                change_set: normalized_changes,
            },
        );

        Ok(MergeResponse {
            result: Some(commit_id),
            conflicts: None,
        })
    }
}

impl Default for PraxisEngine {
    fn default() -> Self {
        Self::new()
    }
}

impl Inner {
    fn new(
        config: PraxisEngineConfig,
        store: Arc<dyn Store>,
        snapshot_store: Arc<dyn SnapshotStore>,
    ) -> PraxisResult<Self> {
        let registry = Arc::new(MetaModelRegistry::load(&config.meta_model)?);
        let mut branches = BTreeMap::new();
        for (name, head) in store.list_branches()? {
            branches.insert(name, BranchState { head });
        }
        if !branches.contains_key("main") {
            store.ensure_branch("main")?;
            branches.insert("main".into(), BranchState::default());
        }
        Ok(Self {
            commits: BTreeMap::new(),
            branches,
            config,
            store,
            snapshot_store,
            registry,
        })
    }

    fn persist_snapshot(&self, commit_id: &str, snapshot: &GraphSnapshot) -> PraxisResult<()> {
        let bytes = serialize(snapshot).map_err(|err| PraxisError::IntegrityViolation {
            message: format!("encode snapshot '{commit_id}': {err}"),
        })?;
        let key = snapshot_key(commit_id);
        self.snapshot_store
            .put(&key, &bytes)
            .map_err(|err| PraxisError::IntegrityViolation {
                message: format!("write snapshot '{commit_id}': {err}"),
            })
    }

    fn record_for(&mut self, commit_id: &str) -> PraxisResult<CommitRecord> {
        if let Some(record) = self.commits.get(commit_id) {
            return Ok(record.clone());
        }
        let persisted =
            self.store
                .get_commit(commit_id)?
                .ok_or_else(|| PraxisError::UnknownCommit {
                    commit: commit_id.into(),
                })?;
        let bytes = self
            .snapshot_store
            .get(&snapshot_key(commit_id))
            .map_err(|err| PraxisError::IntegrityViolation {
                message: format!("read snapshot '{commit_id}': {err}"),
            })?;
        let snapshot: GraphSnapshot =
            deserialize(&bytes).map_err(|err| PraxisError::IntegrityViolation {
                message: format!("decode snapshot '{commit_id}': {err}"),
            })?;
        let record = CommitRecord {
            summary: persisted.summary.clone(),
            snapshot: Arc::new(snapshot),
            change_set: persisted.change_set.clone(),
        };
        self.commits.insert(commit_id.into(), record.clone());
        Ok(record)
    }

    fn snapshot_for(&mut self, commit_id: &str) -> PraxisResult<Arc<GraphSnapshot>> {
        let record = self.record_for(commit_id)?;
        Ok(Arc::clone(&record.snapshot))
    }
}

fn change_count(set: &ChangeSet) -> u64 {
    (set.node_creates.len()
        + set.node_updates.len()
        + set.node_deletes.len()
        + set.edge_creates.len()
        + set.edge_updates.len()
        + set.edge_deletes.len()) as u64
}

fn normalize_change_set(input: &ChangeSet) -> ChangeSet {
    let mut normalized = input.clone();
    normalized.node_creates.sort_by_key(|node| node.id.clone());
    normalized.node_updates.sort_by_key(|node| node.id.clone());
    normalized.node_deletes.sort_by_key(|node| node.id.clone());
    normalized.edge_creates.sort_by_key(edge_sort_key);
    normalized.edge_updates.sort_by_key(edge_sort_key);
    normalized.edge_deletes.sort_by_key(edge_tombstone_key);
    normalized
}

fn edge_sort_key(edge: &EdgeVersion) -> (String, String, String) {
    (
        edge.id.clone().unwrap_or_default(),
        edge.from.clone(),
        edge.to.clone(),
    )
}

fn edge_tombstone_key(tombstone: &EdgeTombstone) -> (String, String) {
    (tombstone.from.clone(), tombstone.to.clone())
}

fn derive_commit_id(
    prefix: &str,
    branch: &str,
    parents: &[String],
    author: Option<&str>,
    message: &str,
    tags: &[String],
    changes: &ChangeSet,
) -> String {
    #[derive(Serialize)]
    struct Identity<'a> {
        branch: &'a str,
        parents: &'a [String],
        author: Option<&'a str>,
        message: &'a str,
        tags: &'a [String],
        changes: &'a ChangeSet,
    }

    let identity = Identity {
        branch,
        parents,
        author,
        message,
        tags,
        changes,
    };
    let payload = serde_json::to_vec(&identity).expect("commit identity serialization");
    let mut hasher = Hasher::new();
    hasher.update(&payload);
    let hex = hasher.finalize().to_hex().to_string();
    let short = &hex[..min(32, hex.len())];
    format!("{}{}", prefix, short)
}

fn current_timestamp() -> String {
    OffsetDateTime::now_utc()
        .format(&Rfc3339)
        .unwrap_or_else(|_| "1970-01-01T00:00:00Z".into())
}

fn snapshot_key(commit_id: &str) -> String {
    format!("snapshots/{}.bin", sanitize_id(commit_id))
}

fn validate_branch_name(name: &str) -> PraxisResult<()> {
    if name.trim().is_empty() {
        return Err(PraxisError::ValidationFailed {
            message: "branch name cannot be empty".into(),
        });
    }
    for segment in name.split('/') {
        if segment.is_empty() {
            return Err(PraxisError::ValidationFailed {
                message: "branch segments cannot be empty".into(),
            });
        }
        if segment == "." || segment == ".." {
            return Err(PraxisError::ValidationFailed {
                message: "branch segments may not be '.' or '..'".into(),
            });
        }
        if !segment
            .chars()
            .all(|ch| ch.is_ascii_alphanumeric() || matches!(ch, '-' | '_' | '.'))
        {
            return Err(PraxisError::ValidationFailed {
                message: format!("branch segment '{segment}' contains invalid characters"),
            });
        }
    }
    Ok(())
}

fn build_seed_change_set() -> ChangeSet {
    const VALUE_STREAM_ID: &str = "n:valuestream-stage:discover";
    const CAPABILITY_ID: &str = "n:capability:customer-insight";
    const APPLICATION_ID: &str = "n:application:insight-hub";
    const DATA_ENTITY_ID: &str = "n:data-entity:customer-profile";
    const TECHNOLOGY_ID: &str = "n:technology:stream-processor";

    ChangeSet {
        node_creates: vec![
            NodeVersion {
                id: VALUE_STREAM_ID.into(),
                r#type: Some("ValueStreamStage".into()),
                props: Some(json!({
                    "name": "Discover",
                    "purpose": "Identify customer needs",
                })),
            },
            NodeVersion {
                id: CAPABILITY_ID.into(),
                r#type: Some("Capability".into()),
                props: Some(json!({
                    "name": "Customer Insight",
                    "tier": "Strategic",
                })),
            },
            NodeVersion {
                id: APPLICATION_ID.into(),
                r#type: Some("Application".into()),
                props: Some(json!({
                    "name": "Insight Hub",
                    "lifecycle": "Run",
                })),
            },
            NodeVersion {
                id: DATA_ENTITY_ID.into(),
                r#type: Some("DataEntity".into()),
                props: Some(json!({
                    "name": "Customer Profile",
                    "sensitivity": "Internal",
                })),
            },
            NodeVersion {
                id: TECHNOLOGY_ID.into(),
                r#type: Some("TechnologyComponent".into()),
                props: Some(json!({
                    "name": "Stream Processor",
                    "vendor": "Praxis Cloud",
                })),
            },
        ],

        edge_creates: vec![
            EdgeVersion {
                id: Some("e:capability-serves-valuestream".into()),
                from: CAPABILITY_ID.into(),
                to: VALUE_STREAM_ID.into(),
                r#type: Some("serves".into()),
                directed: Some(true),
                props: Some(json!({ "confidence": 0.9 })),
            },
            EdgeVersion {
                id: Some("e:application-supports-capability".into()),
                from: APPLICATION_ID.into(),
                to: CAPABILITY_ID.into(),
                r#type: Some("realises".into()),
                directed: Some(true),
                props: Some(json!({ "criticality": "High" })),
            },
            EdgeVersion {
                id: Some("e:application-uses-data".into()),
                from: APPLICATION_ID.into(),
                to: DATA_ENTITY_ID.into(),
                r#type: Some("accesses".into()),
                directed: Some(true),
                props: Some(json!({ "mode": "readwrite" })),
            },
            EdgeVersion {
                id: Some("e:technology-hosts-application".into()),
                from: TECHNOLOGY_ID.into(),
                to: APPLICATION_ID.into(),
                r#type: Some("hosts".into()),
                directed: Some(true),
                props: Some(json!({ "deployment": "Managed" })),
            },
        ],

        ..Default::default()
    }
}

fn resolve_snapshot(
    inner: &mut Inner,
    reference: &CommitRef,
    scenario_hint: Option<&str>,
) -> PraxisResult<(String, Arc<GraphSnapshot>, String)> {
    let commit_id = resolve_commit_id(inner, reference, scenario_hint)?;
    let record = inner.record_for(&commit_id)?;
    Ok((
        commit_id,
        Arc::clone(&record.snapshot),
        record.summary.branch.clone(),
    ))
}

fn resolve_commit_id(
    inner: &mut Inner,
    reference: &CommitRef,
    scenario_hint: Option<&str>,
) -> PraxisResult<String> {
    match reference {
        CommitRef::Id(value) => {
            if inner.record_for(value).is_ok() {
                Ok(value.clone())
            } else if let Some(branch_state) = inner.branches.get(value.as_str()) {
                branch_state
                    .head
                    .clone()
                    .ok_or_else(|| PraxisError::UnknownCommit {
                        commit: value.clone(),
                    })
            } else if let Some(hint) = scenario_hint {
                let branch =
                    inner
                        .branches
                        .get(hint)
                        .ok_or_else(|| PraxisError::UnknownBranch {
                            branch: hint.into(),
                        })?;
                branch
                    .head
                    .clone()
                    .ok_or_else(|| PraxisError::UnknownCommit {
                        commit: hint.into(),
                    })
            } else {
                Err(PraxisError::UnknownCommit {
                    commit: value.clone(),
                })
            }
        }
        CommitRef::Branch { branch, at } => {
            if let Some(at) = at {
                inner.record_for(at)?;
                return Ok(at.clone());
            }
            let target_branch =
                inner
                    .branches
                    .get(branch)
                    .ok_or_else(|| PraxisError::UnknownBranch {
                        branch: branch.clone(),
                    })?;
            target_branch
                .head
                .clone()
                .ok_or_else(|| PraxisError::UnknownCommit {
                    commit: branch.clone(),
                })
        }
    }
}

fn find_common_ancestor(inner: &mut Inner, a: &str, b: &str) -> PraxisResult<Option<String>> {
    let ancestors_a = collect_ancestors(inner, a)?;
    let mut queue: VecDeque<String> = VecDeque::new();
    queue.push_back(b.to_string());
    let mut visited = HashSet::new();
    while let Some(id) = queue.pop_front() {
        if !visited.insert(id.clone()) {
            continue;
        }
        if ancestors_a.contains(&id) {
            return Ok(Some(id));
        }
        if let Ok(record) = inner.record_for(&id) {
            for parent in &record.summary.parents {
                queue.push_back(parent.clone());
            }
        }
    }
    Ok(None)
}

fn collect_ancestors(inner: &mut Inner, head: &str) -> PraxisResult<HashSet<String>> {
    let mut visited = HashSet::new();
    let mut queue: VecDeque<String> = VecDeque::new();
    queue.push_back(head.to_string());
    while let Some(id) = queue.pop_front() {
        if !visited.insert(id.clone()) {
            continue;
        }
        if let Ok(record) = inner.record_for(&id) {
            for parent in &record.summary.parents {
                queue.push_back(parent.clone());
            }
        }
    }
    Ok(visited)
}

fn detect_conflicts(source: &DiffPatch, target: &DiffPatch) -> Vec<MergeConflict> {
    let mut conflicts = Vec::new();

    let target_mod_nodes: HashSet<&str> = target
        .node_mods
        .iter()
        .map(|node| node.id.as_str())
        .collect();
    let target_del_nodes: HashSet<&str> = target
        .node_dels
        .iter()
        .map(|node| node.id.as_str())
        .collect();
    let target_add_nodes: HashSet<&str> = target
        .node_adds
        .iter()
        .map(|node| node.id.as_str())
        .collect();

    for node in &source.node_mods {
        if target_mod_nodes.contains(node.id.as_str())
            || target_del_nodes.contains(node.id.as_str())
        {
            conflicts.push(MergeConflict {
                reference: node.id.clone(),
                kind: "node".into(),
                message: "both branches modify or delete the node".into(),
            });
        }
    }

    for node in &source.node_dels {
        if target_add_nodes.contains(node.id.as_str())
            || target_mod_nodes.contains(node.id.as_str())
        {
            conflicts.push(MergeConflict {
                reference: node.id.clone(),
                kind: "node".into(),
                message: "delete conflicts with target updates".into(),
            });
        }
    }

    let edge_key = |edge: &EdgeVersion| (edge.from.clone(), edge.to.clone());
    let target_mod_edges: HashSet<(String, String)> =
        target.edge_mods.iter().map(edge_key).collect();
    let target_del_edges: HashSet<(String, String)> = target
        .edge_dels
        .iter()
        .map(|edge| (edge.from.clone(), edge.to.clone()))
        .collect();
    let target_add_edges: HashSet<(String, String)> =
        target.edge_adds.iter().map(edge_key).collect();

    for edge in &source.edge_mods {
        let key = (edge.from.clone(), edge.to.clone());
        if target_mod_edges.contains(&key) || target_del_edges.contains(&key) {
            conflicts.push(MergeConflict {
                reference: format!("{}->{}", edge.from, edge.to),
                kind: "edge".into(),
                message: "both branches modify or delete the edge".into(),
            });
        }
    }

    for edge in &source.edge_dels {
        let key = (edge.from.clone(), edge.to.clone());
        if target_add_edges.contains(&key) || target_mod_edges.contains(&key) {
            conflicts.push(MergeConflict {
                reference: format!("{}->{}", edge.from, edge.to),
                kind: "edge".into(),
                message: "delete conflicts with target updates".into(),
            });
        }
    }

    conflicts
}

fn build_change_set(target_snapshot: &GraphSnapshot, patch: &DiffPatch) -> ChangeSet {
    let mut changes = ChangeSet::default();

    for node in &patch.node_adds {
        if !target_snapshot.has_node(&node.id) {
            changes.node_creates.push(node.clone());
        }
    }

    for node in &patch.node_mods {
        match target_snapshot.node(&node.id) {
            Some(existing) if existing == node => {}
            _ => changes.node_updates.push(node.clone()),
        }
    }

    for tomb in &patch.node_dels {
        if target_snapshot.has_node(&tomb.id) {
            changes.node_deletes.push(NodeTombstone {
                id: tomb.id.clone(),
            });
        }
    }

    for edge in &patch.edge_adds {
        if !target_snapshot.has_edge(edge) {
            changes.edge_creates.push(edge.clone());
        }
    }

    for edge in &patch.edge_mods {
        match target_snapshot.edge(edge) {
            Some(existing) if existing == edge => {}
            _ => changes.edge_updates.push(edge.clone()),
        }
    }

    for tomb in &patch.edge_dels {
        if target_snapshot.has_edge_tombstone(tomb) {
            changes.edge_deletes.push(EdgeTombstone {
                from: tomb.from.clone(),
                to: tomb.to.clone(),
            });
        }
    }

    changes
}

#[cfg(test)]
mod tests {
    use super::PraxisEngine;
    use aideon_mneme::temporal::{
        ChangeSet, CommitChangesRequest, CommitRef, DiffArgs, EdgeTombstone, EdgeVersion,
        MergeRequest, NodeTombstone, NodeVersion, StateAtArgs, TopologyDeltaArgs,
    };
    use serde_json::json;

    fn capability_node(id: &str) -> NodeVersion {
        capability_with_name(id, id)
    }

    fn capability_with_name(id: &str, name: &str) -> NodeVersion {
        NodeVersion {
            id: id.into(),
            r#type: Some("Capability".into()),
            props: Some(json!({
                "name": name,
            })),
        }
    }

    fn stage_node(id: &str) -> NodeVersion {
        NodeVersion {
            id: id.into(),
            r#type: Some("ValueStreamStage".into()),
            props: Some(json!({
                "name": id,
            })),
        }
    }

    fn make_change_set(node_id: &str) -> ChangeSet {
        ChangeSet {
            node_creates: vec![capability_node(node_id)],
            ..ChangeSet::default()
        }
    }

    #[test]
    fn commit_and_state_counts_reflect_changes() {
        let engine = PraxisEngine::new();
        let request = CommitChangesRequest {
            branch: "main".into(),
            parent: None,
            author: Some("tester".into()),
            time: None,
            message: "seed".into(),
            tags: vec![],
            changes: make_change_set("n1"),
        };
        let commit_id = engine.commit(request).expect("commit succeed");
        let result = engine
            .state_at(StateAtArgs {
                as_of: CommitRef::Id(commit_id.clone()),
                scenario: Some("main".into()),
                confidence: None,
            })
            .expect("state ok");
        assert!(result.nodes > 0);
        assert!(result.edges > 0);
    }

    #[test]
    fn ensure_seeded_is_idempotent() {
        let engine = PraxisEngine::new();
        let initial = engine
            .list_commits("main".into())
            .expect("list commits succeeds");
        assert!(!initial.is_empty());

        engine.ensure_seeded().expect("ensure seeded succeeds");

        let after = engine
            .list_commits("main".into())
            .expect("list commits succeeds again");
        assert_eq!(after.len(), initial.len());
        assert_eq!(after.first().map(|c| &c.id), initial.first().map(|c| &c.id));
    }

    #[test]
    fn diff_summary_reports_additions() {
        let engine = PraxisEngine::new();
        let first = engine
            .commit(CommitChangesRequest {
                branch: "main".into(),
                parent: None,
                author: None,
                time: None,
                message: "first".into(),
                tags: vec![],
                changes: make_change_set("n1"),
            })
            .unwrap();
        let second = engine
            .commit(CommitChangesRequest {
                branch: "main".into(),
                parent: Some(first.clone()),
                author: None,
                time: None,
                message: "second".into(),
                tags: vec![],
                changes: make_change_set("n2"),
            })
            .unwrap();

        let summary = engine
            .diff_summary(DiffArgs {
                from: CommitRef::Id(first.clone()),
                to: CommitRef::Id(second.clone()),
                scope: None,
            })
            .unwrap();
        assert_eq!(summary.node_adds, 1);
        assert_eq!(summary.node_mods, 0);
        assert_eq!(summary.node_dels, 0);
    }

    #[test]
    fn concurrency_conflict_detected() {
        let engine = PraxisEngine::new();
        let first = engine
            .commit(CommitChangesRequest {
                branch: "main".into(),
                parent: None,
                author: None,
                time: None,
                message: "first".into(),
                tags: vec![],
                changes: make_change_set("n1"),
            })
            .unwrap();
        let result = engine.commit(CommitChangesRequest {
            branch: "main".into(),
            parent: Some("c999".into()),
            author: None,
            time: None,
            message: "conflict".into(),
            tags: vec![],
            changes: make_change_set("n2"),
        });
        assert!(matches!(
            result,
            Err(super::PraxisError::ConcurrencyConflict { .. })
        ));

        let ok = engine.commit(CommitChangesRequest {
            branch: "main".into(),
            parent: Some(first),
            author: None,
            time: None,
            message: "second".into(),
            tags: vec![],
            changes: make_change_set("n3"),
        });
        assert!(ok.is_ok());
    }

    #[test]
    fn rejects_dangling_edges() {
        let engine = PraxisEngine::new();
        let base = engine
            .commit(CommitChangesRequest {
                branch: "main".into(),
                parent: None,
                author: None,
                time: None,
                message: "nodes".into(),
                tags: vec![],
                changes: ChangeSet {
                    node_creates: vec![capability_node("cap-1"), stage_node("stage-1")],
                    ..ChangeSet::default()
                },
            })
            .unwrap();
        let with_edge = engine
            .commit(CommitChangesRequest {
                branch: "main".into(),
                parent: Some(base.clone()),
                author: None,
                time: None,
                message: "edge".into(),
                tags: vec![],
                changes: {
                    let mut cs = ChangeSet::default();
                    cs.edge_creates.push(EdgeVersion {
                        id: None,
                        from: "cap-1".into(),
                        to: "stage-1".into(),
                        r#type: Some("serves".into()),
                        directed: Some(true),
                        props: None,
                    });
                    cs
                },
            })
            .unwrap();
        let err = engine.commit(CommitChangesRequest {
            branch: "main".into(),
            parent: Some(with_edge),
            author: None,
            time: None,
            message: "dangling".into(),
            tags: vec![],
            changes: {
                let mut cs = ChangeSet::default();
                cs.node_deletes.push(NodeTombstone { id: "cap-1".into() });
                cs
            },
        });
        assert!(matches!(
            err,
            Err(super::PraxisError::IntegrityViolation { .. })
        ));
    }

    #[test]
    fn merge_without_conflicts_commits_changes() {
        let engine = PraxisEngine::new();
        let seed_head = engine
            .list_commits("main".into())
            .expect("seeded commits available")
            .last()
            .map(|commit| commit.id.clone())
            .expect("seed head id");
        let baseline_nodes = engine
            .stats_for_commit(&seed_head)
            .expect("seed stats")
            .node_count;
        let base = engine
            .commit(CommitChangesRequest {
                branch: "main".into(),
                parent: None,
                author: None,
                time: None,
                message: "init".into(),
                tags: vec![],
                changes: make_change_set("root"),
            })
            .unwrap();
        engine
            .create_branch("feature".into(), Some(CommitRef::Id(base.clone())))
            .unwrap();
        engine
            .commit(CommitChangesRequest {
                branch: "feature".into(),
                parent: Some(base.clone()),
                author: None,
                time: None,
                message: "feat".into(),
                tags: vec![],
                changes: make_change_set("feature-node"),
            })
            .unwrap();
        engine
            .commit(CommitChangesRequest {
                branch: "main".into(),
                parent: Some(base.clone()),
                author: None,
                time: None,
                message: "main".into(),
                tags: vec![],
                changes: make_change_set("main-node"),
            })
            .unwrap();

        let response = engine
            .merge(MergeRequest {
                source: "feature".into(),
                target: "main".into(),
                strategy: None,
            })
            .unwrap();

        assert!(response.conflicts.is_none());
        let merge_commit = response.result.expect("merge commit");
        let stats = engine.stats_for_commit(&merge_commit).unwrap();
        assert_eq!(stats.node_count, baseline_nodes + 3);
    }

    #[test]
    fn merge_reports_conflicts_for_overlapping_updates() {
        let engine = PraxisEngine::new();
        let base = engine
            .commit(CommitChangesRequest {
                branch: "main".into(),
                parent: None,
                author: None,
                time: None,
                message: "init".into(),
                tags: vec![],
                changes: make_change_set("shared"),
            })
            .unwrap();
        engine
            .create_branch("feature".into(), Some(CommitRef::Id(base.clone())))
            .unwrap();
        engine
            .commit(CommitChangesRequest {
                branch: "feature".into(),
                parent: Some(base.clone()),
                author: None,
                time: None,
                message: "feat change".into(),
                tags: vec![],
                changes: ChangeSet {
                    node_updates: vec![capability_with_name("shared", "Feature state")],
                    ..ChangeSet::default()
                },
            })
            .unwrap();
        engine
            .commit(CommitChangesRequest {
                branch: "main".into(),
                parent: Some(base),
                author: None,
                time: None,
                message: "main change".into(),
                tags: vec![],
                changes: ChangeSet {
                    node_updates: vec![capability_with_name("shared", "Main state")],
                    ..ChangeSet::default()
                },
            })
            .unwrap();

        let response = engine
            .merge(MergeRequest {
                source: "feature".into(),
                target: "main".into(),
                strategy: None,
            })
            .unwrap();
        assert!(response.result.is_none());
        let conflicts = response.conflicts.expect("conflicts");
        assert!(!conflicts.is_empty());
        assert_eq!(conflicts[0].kind, "node");
    }

    #[test]
    fn merge_errors_when_no_common_ancestor_exists() {
        let engine = PraxisEngine::new();
        let main_commit = engine
            .commit(CommitChangesRequest {
                branch: "main".into(),
                parent: None,
                author: None,
                time: None,
                message: "main-root".into(),
                tags: vec![],
                changes: make_change_set("main-root"),
            })
            .expect("main commit");

        let feature_commit = engine
            .commit(CommitChangesRequest {
                branch: "feature".into(),
                parent: None,
                author: None,
                time: None,
                message: "feature-root".into(),
                tags: vec![],
                changes: make_change_set("feature-root"),
            })
            .expect("feature commit");
        assert_ne!(main_commit, feature_commit);

        let merge = engine.merge(MergeRequest {
            source: "feature".into(),
            target: "main".into(),
            strategy: None,
        });

        assert!(matches!(
            merge,
            Err(super::PraxisError::MergeConflict { .. })
        ));
    }

    #[test]
    fn topology_delta_reports_structural_changes() {
        let engine = PraxisEngine::new();
        let base = engine
            .commit(CommitChangesRequest {
                branch: "main".into(),
                parent: None,
                author: None,
                time: None,
                message: "base".into(),
                tags: vec![],
                changes: make_change_set("cap-root"),
            })
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
            .expect("expanded commit");

        let delta = engine
            .topology_delta(TopologyDeltaArgs {
                from: CommitRef::Id(base.clone()),
                to: CommitRef::Id(expanded.clone()),
            })
            .expect("topology delta");
        assert_eq!(delta.node_adds, 1);
        assert_eq!(delta.node_dels, 0);
        assert_eq!(delta.edge_adds, 1);
        assert_eq!(delta.edge_dels, 0);

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
            .expect("trim commit");

        let delta_trim = engine
            .topology_delta(TopologyDeltaArgs {
                from: CommitRef::Id(expanded),
                to: CommitRef::Id(trimmed),
            })
            .expect("topology delta trim");
        assert_eq!(delta_trim.node_adds, 0);
        assert_eq!(delta_trim.node_dels, 1);
        assert_eq!(delta_trim.edge_adds, 0);
        assert_eq!(delta_trim.edge_dels, 1);
    }
}
