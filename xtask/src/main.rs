use std::collections::HashMap;
use std::fs;
use std::path::PathBuf;
use std::sync::Arc;

use aideon_continuum::SnapshotStore;
use aideon_mneme::temporal::{ChangeSet, CommitSummary};
use aideon_mneme::{
    MemorySnapshotStore, MemoryStore, PersistedCommit, SqliteDb, Store, create_datastore,
    sanitize_id,
};
use aideon_praxis::{
    BaselineDataset, GraphSnapshot, MetaModelRegistry, PraxisEngine, PraxisEngineConfig,
};
use anyhow::{Context, Result, anyhow};
use bincode::serialize;
use clap::{Parser, Subcommand};

fn main() -> Result<()> {
    let cli = Cli::parse();
    match cli.command {
        Command::MigrateState(args) => migrate_state(args),
        Command::ImportDataset(args) => import_dataset(args),
    }
}

#[derive(Parser)]
#[command(
    author,
    version,
    about = "Developer utilities for the Aideon Praxis repo"
)]
struct Cli {
    #[command(subcommand)]
    command: Command,
}

#[derive(Subcommand)]
enum Command {
    /// Convert a legacy in-memory commit export into the durable file-backed store.
    MigrateState(MigrateStateArgs),
    /// Apply the baseline dataset to a datastore (or dry-run for validation).
    ImportDataset(ImportDatasetArgs),
}

#[derive(Parser)]
struct MigrateStateArgs {
    /// Path to the legacy JSON export containing commits and branches.
    #[arg(long)]
    input: PathBuf,
    /// Destination directory for the new `.praxis` store.
    #[arg(long)]
    output: PathBuf,
    /// Remove any existing data under the output directory before migrating.
    #[arg(long, default_value_t = false)]
    force: bool,
}

#[derive(Parser)]
struct ImportDatasetArgs {
    /// Path to the dataset YAML file (defaults to the checked-in baseline).
    #[arg(long, default_value = "docs/data/base/baseline.yaml")]
    dataset: PathBuf,
    /// Directory where the datastore (sqlite + state file) lives.
    #[arg(long, default_value = ".praxis")]
    datastore: PathBuf,
    /// Validate without writing commits.
    #[arg(long, default_value_t = false)]
    dry_run: bool,
    /// Remove any existing datastore contents before importing.
    #[arg(long, default_value_t = false)]
    force: bool,
}

fn migrate_state(args: MigrateStateArgs) -> Result<()> {
    let raw = fs::read_to_string(&args.input)
        .with_context(|| format!("failed to read {}", args.input.display()))?;
    let legacy: LegacyState = serde_json::from_str(&raw)
        .with_context(|| format!("failed to parse {}", args.input.display()))?;

    if args.output.exists() {
        if args.force {
            fs::remove_dir_all(&args.output)
                .with_context(|| format!("failed to clean {}", args.output.display()))?;
        } else if args.output.join("praxis.sqlite").exists() {
            return Err(anyhow!(
                "output '{}' already contains praxis.sqlite; rerun with --force to overwrite",
                args.output.display()
            ));
        }
    }

    fs::create_dir_all(&args.output)
        .with_context(|| format!("failed to create {}", args.output.display()))?;

    let db_path = args.output.join("praxis.sqlite");
    if db_path.exists() && args.force {
        fs::remove_file(&db_path)
            .with_context(|| format!("failed to remove {}", db_path.display()))?;
    }
    let db = SqliteDb::open(&db_path).map_err(|err| anyhow!(err.to_string()))?;
    let snapshot_store = db.snapshot_store();

    let mut snapshots: HashMap<String, GraphSnapshot> = HashMap::new();
    let mut last_commit_id: Option<String> = None;

    let registry = MetaModelRegistry::embedded().map_err(|err| anyhow!(err.to_string()))?;

    for commit in legacy.commits {
        let base = match commit.summary.parents.first() {
            Some(parent) => snapshots.get(parent).cloned().ok_or_else(|| {
                anyhow!("missing parent '{parent}' for commit {}", commit.summary.id)
            })?,
            None => GraphSnapshot::empty(),
        };
        let next = base
            .apply(&commit.change_set, &registry)
            .map_err(|err| anyhow!("apply commit {} failed: {err}", commit.summary.id))?;

        let persisted = PersistedCommit {
            summary: commit.summary.clone(),
            change_set: commit.change_set.clone(),
        };
        db.put_commit(&persisted)
            .map_err(|err| anyhow!(err.to_string()))?;

        let key = format!("snapshots/{}.bin", sanitize_id(&persisted.summary.id));
        let bytes = serialize(&next).context("serialize snapshot")?;
        snapshot_store
            .put(&key, &bytes)
            .map_err(|err| anyhow!("write snapshot failed: {err}"))?;

        last_commit_id = Some(persisted.summary.id.clone());
        snapshots.insert(persisted.summary.id, next);
    }

    if legacy.branches.is_empty() {
        db.ensure_branch("main")
            .map_err(|err| anyhow!(err.to_string()))?;
        db.compare_and_swap_branch("main", None, last_commit_id.as_deref())
            .map_err(|err| anyhow!(err.to_string()))?;
    } else {
        for branch in legacy.branches {
            db.ensure_branch(&branch.name)
                .map_err(|err| anyhow!(err.to_string()))?;
            db.compare_and_swap_branch(&branch.name, None, branch.head.as_deref())
                .map_err(|err| anyhow!(err.to_string()))?;
        }
    }

    println!(
        "Migrated {} commits into {}",
        snapshots.len(),
        args.output.display()
    );
    Ok(())
}

fn import_dataset(args: ImportDatasetArgs) -> Result<()> {
    let dataset = BaselineDataset::from_path(&args.dataset)
        .or_else(|_| BaselineDataset::embedded())
        .map_err(|err| anyhow!(err.to_string()))?;

    if args.dry_run {
        dry_run_dataset(&dataset)?;
        return Ok(());
    }

    if args.force && args.datastore.exists() {
        fs::remove_dir_all(&args.datastore)
            .with_context(|| format!("failed to clean {}", args.datastore.display()))?;
    }

    let db_path =
        create_datastore(&args.datastore, None).map_err(|err| anyhow!(err.to_string()))?;
    let storage = SqliteDb::open(&db_path).map_err(|err| anyhow!(err.to_string()))?;
    let snapshot = storage.snapshot_store();
    let engine = PraxisEngine::with_stores_unseeded(
        PraxisEngineConfig::default(),
        Arc::new(storage.clone()),
        Arc::new(snapshot),
    )
    .map_err(|err| anyhow!(err.to_string()))?;

    let has_commits = engine
        .list_branches()
        .into_iter()
        .any(|branch| branch.name == "main" && branch.head.is_some());
    if has_commits {
        return Err(anyhow!(
            "datastore '{}' already contains commits; rerun with --force",
            args.datastore.display()
        ));
    }

    engine
        .bootstrap_with_dataset(&dataset)
        .map_err(|err| anyhow!(err.to_string()))?;

    let commits = engine
        .list_commits("main".into())
        .map_err(|err| anyhow!(err.to_string()))?;
    if let Some(last) = commits.last() {
        let stats = engine
            .stats_for_commit(&last.id)
            .map_err(|err| anyhow!(err.to_string()))?;
        println!(
            "imported dataset {} (commits={} nodes={} edges={}) into {}",
            dataset.version,
            commits.len(),
            stats.node_count,
            stats.edge_count,
            db_path.display()
        );
    } else {
        println!(
            "imported dataset {} (no commits reported) into {}",
            dataset.version,
            db_path.display()
        );
    }

    Ok(())
}

fn dry_run_dataset(dataset: &BaselineDataset) -> Result<()> {
    let store: Arc<dyn Store> = Arc::new(MemoryStore::default());
    let snapshots: Arc<dyn SnapshotStore> = Arc::new(MemorySnapshotStore::default());
    let engine =
        PraxisEngine::with_stores_unseeded(PraxisEngineConfig::default(), store, snapshots)
            .map_err(|err| anyhow!(err.to_string()))?;
    engine
        .bootstrap_with_dataset(dataset)
        .map_err(|err| anyhow!(err.to_string()))?;

    let commits = engine
        .list_commits("main".into())
        .map_err(|err| anyhow!(err.to_string()))?;
    let stats = commits
        .last()
        .map(|summary| engine.stats_for_commit(&summary.id))
        .transpose()
        .map_err(|err| anyhow!(err.to_string()))?
        .unwrap_or_default();
    println!(
        "dry-run ok: dataset {} commits={} nodes={} edges={}",
        dataset.version,
        commits.len(),
        stats.node_count,
        stats.edge_count
    );
    Ok(())
}

#[derive(serde::Deserialize)]
struct LegacyState {
    commits: Vec<LegacyCommit>,
    #[serde(default)]
    branches: Vec<LegacyBranch>,
}

#[derive(serde::Deserialize)]
struct LegacyCommit {
    summary: CommitSummary,
    #[serde(default)]
    change_set: ChangeSet,
}

#[derive(serde::Deserialize)]
struct LegacyBranch {
    name: String,
    #[serde(default)]
    head: Option<String>,
}
