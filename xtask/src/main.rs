use std::collections::HashMap;
use std::fs;
use std::path::PathBuf;

use aideon_continuum::SnapshotStore;
use aideon_mneme::temporal::{ChangeSet, CommitSummary};
use aideon_mneme::{PersistedCommit, SqliteDb, Store, sanitize_id};
use aideon_praxis::{GraphSnapshot, MetaModelRegistry};
use anyhow::{Context, Result, anyhow};
use bincode::serialize;
use clap::{Parser, Subcommand};

fn main() -> Result<()> {
    let cli = Cli::parse();
    match cli.command {
        Command::MigrateState(args) => migrate_state(args),
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
