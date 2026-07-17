use std::collections::HashMap;
use std::fs;
use std::path::{Path, PathBuf};
use std::sync::Arc;

use aideon_praxis::temporal::{ChangeSet, CommitSummary};
use aideon_praxis::{
    BaselineDataset, GraphSnapshot, MemoryStore, MetaModelRegistry, PersistedCommit, PraxisEngine,
    PraxisEngineConfig, SqliteDb, Store,
};
use anyhow::{Context, Result, anyhow};
use clap::{Parser, Subcommand};
use serde::{Deserialize, Serialize};

mod translation_sync;

#[tokio::main]
async fn main() -> Result<()> {
    let cli = Cli::parse();
    match cli.command {
        Command::MigrateState(args) => migrate_state(args).await,
        Command::ImportDataset(args) => import_dataset(args).await,
        Command::Health(args) => check_health(args).await,
        Command::EventManifest(args) => export_event_manifest(args).await,
        Command::ShellCommandManifest(args) => export_shell_command_manifest(args).await,
        Command::CheckCrateBoundaries => check_crate_boundaries(),
        Command::TranslationSync(args) => translation_sync::run(args).await,
    }
}

#[derive(Parser)]
#[command(
    author,
    version,
    about = "Developer utilities for the Aideon Desktop repo"
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
    /// Validate datastore integrity by scanning commits, heads, and snapshots.
    Health(HealthArgs),
    /// Generate a manifest of host→renderer event names (for contract tests).
    EventManifest(EventManifestArgs),
    /// Generate a manifest of host shell command ids (for contract tests).
    ShellCommandManifest(ShellCommandManifestArgs),
    /// Check Rust crate dependency direction (engines never import Tauri/host; no Praxis↔Metis edge).
    CheckCrateBoundaries,
    /// Translate locales/en.json into target locales via the Lara translation API.
    TranslationSync(translation_sync::TranslationSyncArgs),
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

#[derive(Parser)]
struct HealthArgs {
    /// Directory where the datastore lives (contains datastore.json and sqlite file).
    #[arg(long, default_value = ".praxis")]
    datastore: PathBuf,
    /// Limit the health scan to a single branch.
    #[arg(long)]
    branch: Option<String>,
    /// Reduce output to errors only.
    #[arg(long, default_value_t = false)]
    quiet: bool,
}

#[derive(Parser)]
struct EventManifestArgs {
    /// Path to write the manifest JSON to (relative to repo root by default).
    #[arg(long, default_value = "docs/contracts/event-manifest.json")]
    out: PathBuf,
}

#[derive(Parser)]
struct ShellCommandManifestArgs {
    /// Path to write the manifest JSON to (relative to repo root by default).
    #[arg(long, default_value = "docs/contracts/shell-command-manifest.json")]
    out: PathBuf,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
struct EventManifest {
    schema_version: u32,
    events: Vec<EventSpec>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
struct EventSpec {
    name: String,
    payload_keys: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
struct ShellCommandManifest {
    schema_version: u32,
    commands: Vec<ShellCommandSpec>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
struct ShellCommandSpec {
    id: String,
    payload_keys: Vec<String>,
}

fn repo_root() -> PathBuf {
    PathBuf::from(env!("CARGO_MANIFEST_DIR"))
        .parent()
        .expect("repo root")
        .to_path_buf()
}

/// Scan `source` for `pub const <PREFIX>… = "value";` declarations and return the
/// first double-quoted `value` from each matching line that `accept` approves.
fn extract_quoted_constants(
    source: &str,
    prefix: &str,
    accept: impl Fn(&str) -> bool,
) -> Vec<String> {
    source
        .lines()
        .filter_map(|line| {
            let trimmed = line.trim();
            if !trimmed.starts_with(prefix) {
                return None;
            }
            let (_, rest) = trimmed.split_once('"')?;
            let (value, _) = rest.split_once('"')?;
            accept(value).then(|| value.to_string())
        })
        .collect()
}

fn extract_event_names_from_source(source: &str) -> Vec<String> {
    extract_quoted_constants(source, "pub const EVENT_", |event| {
        !event.is_empty()
            && event
                .chars()
                .all(|c| c.is_ascii_lowercase() || c.is_ascii_digit() || c == '_' || c == ':')
    })
}

fn payload_keys_for_event(name: &str) -> Vec<String> {
    match name {
        "shell_command" => vec!["command", "payload"]
            .into_iter()
            .map(String::from)
            .collect(),
        "mneme_change_event" => vec![
            "partition",
            "sequence",
            "op_id",
            "asserted_at",
            "entity_id",
            "change_kind",
            "payload",
        ]
        .into_iter()
        .map(String::from)
        .collect(),
        "setup_backend_ready" | "setup_frontend_ready_ack" => Vec::new(),
        "setup_progress" => vec!["phase"].into_iter().map(String::from).collect(),
        "setup_failed" => vec!["code", "message"]
            .into_iter()
            .map(String::from)
            .collect(),
        "setup_seed_summary" => vec!["datasetVersion", "metamodelVersion"]
            .into_iter()
            .map(String::from)
            .collect(),
        "workspace:lifecycle_changed" => vec![
            "workspaceId",
            "state",
            "jobId",
            "errorCode",
            "correlationId",
        ]
        .into_iter()
        .map(String::from)
        .collect(),
        "workspace:ready_read_write" => vec![
            "workspaceId",
            "jobId",
            "readiness",
            "foundationRebuildHash",
            "runtimeGeneration",
            "correlationId",
        ]
        .into_iter()
        .map(String::from)
        .collect(),
        _ => Vec::new(),
    }
}

fn build_event_manifest() -> Result<EventManifest> {
    let repo = repo_root();

    // Scan all source files that declare `pub const EVENT_` constants.
    let source_files = [
        repo.join("src-tauri/src/contracts.rs"),
        repo.join("src-tauri/src/jobs.rs"),
    ];

    let mut events = std::collections::BTreeSet::<String>::new();
    for path in &source_files {
        if let Ok(raw) = fs::read_to_string(path) {
            for name in extract_event_names_from_source(&raw) {
                events.insert(name);
            }
        }
    }

    let events = events
        .into_iter()
        .map(|name| EventSpec {
            payload_keys: payload_keys_for_event(&name),
            name,
        })
        .collect();

    Ok(EventManifest {
        schema_version: 1,
        events,
    })
}

/// Resolve a manifest output path against the repo root unless it is absolute.
fn resolve_out_path(out: PathBuf) -> PathBuf {
    if out.is_absolute() {
        out
    } else {
        repo_root().join(out)
    }
}

/// Serialize `manifest` as pretty JSON (with a trailing newline) to `out`,
/// creating parent directories as needed, then report the written path.
fn write_manifest_json<T: Serialize>(out: PathBuf, manifest: &T, label: &str) -> Result<()> {
    let out = resolve_out_path(out);
    if let Some(parent) = out.parent() {
        fs::create_dir_all(parent)
            .with_context(|| format!("create_dir_all {}", parent.display()))?;
    }
    let json = serde_json::to_string_pretty(manifest)?;
    fs::write(&out, format!("{json}\n")).with_context(|| format!("write {}", out.display()))?;
    println!("Wrote {label} to {}", out.display());
    Ok(())
}

async fn export_event_manifest(args: EventManifestArgs) -> Result<()> {
    write_manifest_json(args.out, &build_event_manifest()?, "event manifest")
}

fn extract_shell_command_ids_from_source(source: &str) -> Vec<String> {
    extract_quoted_constants(source, "pub const SHELL_COMMAND_", |id| {
        id.chars()
            .all(|c| c.is_ascii_lowercase() || c.is_ascii_digit() || c == '_')
    })
}

fn payload_keys_for_shell_command(id: &str) -> Vec<String> {
    match id {
        "file_open" | "file_save_as" => vec!["path".to_string()],
        _ => Vec::new(),
    }
}

fn build_shell_command_manifest() -> Result<ShellCommandManifest> {
    let repo = repo_root();
    let src = repo.join("src-tauri/src/shell_commands.rs");
    let raw = fs::read_to_string(&src).with_context(|| format!("read {}", src.display()))?;

    let mut ids = std::collections::BTreeSet::<String>::new();
    for id in extract_shell_command_ids_from_source(&raw) {
        ids.insert(id);
    }

    let commands = ids
        .into_iter()
        .map(|id| ShellCommandSpec {
            payload_keys: payload_keys_for_shell_command(&id),
            id,
        })
        .collect();

    Ok(ShellCommandManifest {
        schema_version: 1,
        commands,
    })
}

async fn export_shell_command_manifest(args: ShellCommandManifestArgs) -> Result<()> {
    write_manifest_json(
        args.out,
        &build_shell_command_manifest()?,
        "shell command manifest",
    )
}

/// Prepare the migration output directory and open a fresh sqlite store,
/// honouring `--force` (clears an existing store) and refusing to clobber an
/// existing `praxis.sqlite` otherwise.
/// Clear an existing output directory when `--force` is set, or refuse to
/// proceed when it already holds a `praxis.sqlite` store.
fn clear_or_guard_output(output: &Path, force: bool) -> Result<()> {
    if !output.exists() {
        return Ok(());
    }
    if force {
        return fs::remove_dir_all(output)
            .with_context(|| format!("failed to clean {}", output.display()));
    }
    if output.join("praxis.sqlite").exists() {
        return Err(anyhow!(
            "output '{}' already contains praxis.sqlite; rerun with --force to overwrite",
            output.display()
        ));
    }
    Ok(())
}

async fn open_migration_db(output: &Path, force: bool) -> Result<SqliteDb> {
    clear_or_guard_output(output, force)?;

    fs::create_dir_all(output).with_context(|| format!("failed to create {}", output.display()))?;

    let db_path = output.join("praxis.sqlite");
    if db_path.exists() && force {
        fs::remove_file(&db_path)
            .with_context(|| format!("failed to remove {}", db_path.display()))?;
    }
    SqliteDb::open(&db_path)
        .await
        .map_err(|err| anyhow!(err.to_string()))
}

/// Replay legacy commits into `db`, returning the accumulated snapshots and the
/// id of the last commit written.
async fn apply_legacy_commits(
    db: &SqliteDb,
    commits: Vec<LegacyCommit>,
) -> Result<(HashMap<String, GraphSnapshot>, Option<String>)> {
    let registry = MetaModelRegistry::embedded().map_err(|err| anyhow!(err.to_string()))?;
    let mut snapshots: HashMap<String, GraphSnapshot> = HashMap::new();
    let mut last_commit_id: Option<String> = None;

    for commit in commits {
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
            .await
            .map_err(|err| anyhow!(err.to_string()))?;

        last_commit_id = Some(persisted.summary.id.clone());
        snapshots.insert(persisted.summary.id, next);
    }

    Ok((snapshots, last_commit_id))
}

/// Recreate branch heads after migration: default to a single `main` head at the
/// last commit, or reproduce the explicit branches from the legacy export.
async fn set_migrated_branches(
    db: &SqliteDb,
    branches: Vec<LegacyBranch>,
    last_commit_id: Option<&str>,
) -> Result<()> {
    if branches.is_empty() {
        db.ensure_branch("main")
            .await
            .map_err(|err| anyhow!(err.to_string()))?;
        db.compare_and_swap_branch("main", None, last_commit_id)
            .await
            .map_err(|err| anyhow!(err.to_string()))?;
        return Ok(());
    }

    for branch in branches {
        db.ensure_branch(&branch.name)
            .await
            .map_err(|err| anyhow!(err.to_string()))?;
        db.compare_and_swap_branch(&branch.name, None, branch.head.as_deref())
            .await
            .map_err(|err| anyhow!(err.to_string()))?;
    }
    Ok(())
}

async fn migrate_state(args: MigrateStateArgs) -> Result<()> {
    let raw = fs::read_to_string(&args.input)
        .with_context(|| format!("failed to read {}", args.input.display()))?;
    let legacy: LegacyState = serde_json::from_str(&raw)
        .with_context(|| format!("failed to parse {}", args.input.display()))?;

    let db = open_migration_db(&args.output, args.force).await?;
    let (snapshots, last_commit_id) = apply_legacy_commits(&db, legacy.commits).await?;
    set_migrated_branches(&db, legacy.branches, last_commit_id.as_deref()).await?;

    println!(
        "Migrated {} commits into {}",
        snapshots.len(),
        args.output.display()
    );
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::tempdir;

    /// Assert a freshly built `manifest` matches the checked-in JSON at `rel_path`.
    fn assert_manifest_checked_in<T>(manifest: T, rel_path: &str, regen_cmd: &str)
    where
        T: serde::de::DeserializeOwned + PartialEq + std::fmt::Debug,
    {
        let path = repo_root().join(rel_path);
        let raw = fs::read_to_string(&path).unwrap_or_else(|_| {
            panic!(
                "missing {}; run `{}` to generate it",
                path.display(),
                regen_cmd
            )
        });
        let on_disk: T = serde_json::from_str(&raw).unwrap_or_else(|_| panic!("parse {rel_path}"));
        assert_eq!(on_disk, manifest, "{rel_path} drifted; rerun `{regen_cmd}`");
    }

    /// Run an export closure against a temp `filename` and return the file body.
    async fn export_to_temp<Fut>(filename: &str, run: impl FnOnce(PathBuf) -> Fut) -> String
    where
        Fut: std::future::Future<Output = Result<()>>,
    {
        let dir = tempdir().expect("tempdir");
        let out = dir.path().join(filename);
        run(out.clone()).await.expect("export manifest");
        fs::read_to_string(&out).expect("read manifest")
    }

    /// Collect boundary violations for a single-package workspace.
    fn violations_for(pkg: CargoPackage) -> Vec<String> {
        violations_for_packages(vec![pkg])
    }

    /// Collect boundary violations for a workspace of the given packages.
    fn violations_for_packages(packages: Vec<CargoPackage>) -> Vec<String> {
        collect_boundary_violations(&CargoMetadata { packages })
    }

    #[test]
    fn cli_parses_health_defaults() {
        let cli = Cli::parse_from(["xtask", "health"]);
        match cli.command {
            Command::Health(args) => {
                assert_eq!(args.datastore, PathBuf::from(".praxis"));
                assert!(args.branch.is_none());
                assert!(!args.quiet);
            }
            _ => panic!("expected health command"),
        }
    }

    #[test]
    fn cli_parses_import_dataset_flags() {
        let cli = Cli::parse_from([
            "xtask",
            "import-dataset",
            "--dataset",
            "path/to/data.yaml",
            "--datastore",
            "/tmp/praxis",
            "--dry-run",
            "--force",
        ]);
        match cli.command {
            Command::ImportDataset(args) => {
                assert_eq!(args.dataset, PathBuf::from("path/to/data.yaml"));
                assert_eq!(args.datastore, PathBuf::from("/tmp/praxis"));
                assert!(args.dry_run);
                assert!(args.force);
            }
            _ => panic!("expected import-dataset command"),
        }
    }

    // ipc-manifest.json is now generated from the Rust commands by the host
    // bindings test (ADR-0039); xtask no longer owns it, so there is no xtask
    // drift check for it here.

    #[test]
    fn event_manifest_is_deterministic_and_checked_in() {
        assert_manifest_checked_in(
            build_event_manifest().expect("build manifest"),
            "docs/contracts/event-manifest.json",
            "cargo run -p aideon_xtask -- event-manifest",
        );
    }

    #[test]
    fn shell_command_manifest_is_deterministic_and_checked_in() {
        assert_manifest_checked_in(
            build_shell_command_manifest().expect("build manifest"),
            "docs/contracts/shell-command-manifest.json",
            "cargo run -p aideon_xtask -- shell-command-manifest",
        );
    }

    #[tokio::test]
    async fn export_event_manifest_writes_json_file() {
        let raw = export_to_temp("event-manifest.json", |out| {
            export_event_manifest(EventManifestArgs { out })
        })
        .await;
        let manifest: EventManifest = serde_json::from_str(&raw).expect("parse manifest");
        assert_eq!(manifest.schema_version, 1);
        assert!(!manifest.events.is_empty());
    }

    #[tokio::test]
    async fn export_shell_command_manifest_writes_json_file() {
        let raw = export_to_temp("shell-command-manifest.json", |out| {
            export_shell_command_manifest(ShellCommandManifestArgs { out })
        })
        .await;
        let manifest: ShellCommandManifest = serde_json::from_str(&raw).expect("parse manifest");
        assert_eq!(manifest.schema_version, 1);
        assert!(!manifest.commands.is_empty());
    }

    #[tokio::test]
    async fn migrate_state_creates_sqlite_store_and_sets_main_head() {
        let dir = tempdir().expect("tempdir");
        let input = dir.path().join("legacy.json");
        let output = dir.path().join("out");

        let legacy = serde_json::json!({
            "commits": [
                {
                    "summary": {
                        "id": "c1",
                        "parents": [],
                        "branch": "main",
                        "author": null,
                        "time": null,
                        "message": "init",
                        "tags": [],
                        "changeCount": 0
                    },
                    "change_set": {
                        "nodeCreates": [],
                        "nodeUpdates": [],
                        "nodeDeletes": [],
                        "edgeCreates": [],
                        "edgeUpdates": [],
                        "edgeDeletes": []
                    }
                }
            ],
            "branches": []
        });
        fs::write(&input, serde_json::to_vec_pretty(&legacy).expect("encode"))
            .expect("write legacy");

        migrate_state(MigrateStateArgs {
            input,
            output: output.clone(),
            force: false,
        })
        .await
        .expect("migrate state");

        let db_path = output.join("praxis.sqlite");
        assert!(db_path.exists());
    }

    #[tokio::test]
    async fn migrate_state_rejects_existing_output_without_force() {
        let dir = tempdir().expect("tempdir");
        let input = dir.path().join("legacy.json");
        fs::write(&input, "{\"commits\":[],\"branches\":[]}").expect("write legacy");

        let output = dir.path().join("out");
        fs::create_dir_all(&output).expect("mkdir");
        fs::write(output.join("praxis.sqlite"), "").expect("touch sqlite");

        let err = migrate_state(MigrateStateArgs {
            input,
            output,
            force: false,
        })
        .await
        .expect_err("should error");
        assert!(err.to_string().contains("rerun with --force"));
    }

    #[tokio::test]
    async fn import_dataset_dry_run_uses_embedded_dataset_when_missing() {
        let dir = tempdir().expect("tempdir");
        let datastore = dir.path().join(".praxis");
        import_dataset(ImportDatasetArgs {
            dataset: dir.path().join("missing.yaml"),
            datastore: datastore.clone(),
            dry_run: true,
            force: false,
        })
        .await
        .expect("dry-run import");
        assert!(!datastore.exists());
    }

    #[tokio::test]
    async fn health_check_errors_when_branch_filter_matches_none() {
        let dir = tempdir().expect("tempdir");
        let err = check_health(HealthArgs {
            datastore: dir.path().join(".praxis"),
            branch: Some("does-not-exist".to_string()),
            quiet: true,
        })
        .await
        .expect_err("missing datastore");
        assert!(!err.to_string().is_empty());
    }

    // ---- check-crate-boundaries tests (ADR-0011 / D9 / D21) ----

    fn pkg(name: &str, path: &str, deps: &[&str]) -> CargoPackage {
        CargoPackage {
            name: name.into(),
            manifest_path: path.into(),
            dependencies: deps
                .iter()
                .map(|d| CargoDependency { name: (*d).into() })
                .collect(),
        }
    }

    #[test]
    fn boundaries_clean_on_current_workspace() {
        check_crate_boundaries()
            .expect("crate dependency direction violation(s) found in the current workspace");
    }

    #[test]
    fn boundaries_rejects_engine_depending_on_tauri() {
        let v = violations_for(pkg(
            "aideon_praxis",
            "/workspace/crates/praxis/Cargo.toml",
            &["tauri"],
        ));
        assert!(
            !v.is_empty(),
            "should flag tauri import from an engine crate"
        );
        assert!(
            v[0].contains("tauri"),
            "violation message should name tauri"
        );
    }

    #[test]
    fn boundaries_rejects_engine_depending_on_host() {
        let v = violations_for_packages(vec![
            pkg("aideon_desktop", "/workspace/src-tauri/Cargo.toml", &[]),
            pkg(
                "aideon_praxis",
                "/workspace/crates/praxis/Cargo.toml",
                &["aideon_desktop"],
            ),
        ]);
        assert!(
            !v.is_empty(),
            "should flag engine depending on host (aideon_desktop)"
        );
    }

    #[test]
    fn boundaries_rejects_praxis_depending_on_metis() {
        let v = violations_for(pkg(
            "aideon_praxis",
            "/workspace/crates/praxis/Cargo.toml",
            &["aideon_metis"],
        ));
        assert!(!v.is_empty(), "praxis must not depend on metis (D9)");
        assert!(
            v[0].contains("lateral"),
            "violation message should say 'lateral'"
        );
    }

    #[test]
    fn boundaries_rejects_metis_depending_on_chrona() {
        let v = violations_for(pkg(
            "aideon_metis",
            "/workspace/crates/metis/Cargo.toml",
            &["aideon_chrona"],
        ));
        assert!(!v.is_empty(), "metis must not depend on chrona");
    }

    #[test]
    fn boundaries_allows_mneme_store_depending_on_mneme_core() {
        let v = violations_for(pkg(
            "aideon_mneme_store",
            "/workspace/crates/mneme_store/Cargo.toml",
            &["aideon_mneme_core"],
        ));
        assert!(
            v.is_empty(),
            "mneme_store → mneme_core is an allowed storage-layer edge"
        );
    }

    #[test]
    fn boundaries_allows_chrona_depending_on_praxis() {
        // chrona→praxis is a contract-only dependency; allowed at the crate level
        // (neutral contracts crate not yet extracted — D21).
        let v = violations_for(pkg(
            "aideon_chrona",
            "/workspace/crates/chrona/Cargo.toml",
            &["aideon_praxis"],
        ));
        assert!(
            v.is_empty(),
            "chrona → praxis is the allowed contract-only edge"
        );
    }

    #[test]
    fn boundaries_engine_harness_is_exempt() {
        // aideon_engine is the composition harness; it may depend on every engine.
        let v = violations_for_packages(vec![
            pkg("aideon_desktop", "/workspace/src-tauri/Cargo.toml", &[]),
            pkg(
                "aideon_engine",
                "/workspace/crates/engine/Cargo.toml",
                &["aideon_praxis", "aideon_metis", "aideon_chrona"],
            ),
        ]);
        assert!(
            v.is_empty(),
            "the engine harness is exempt from lateral checks"
        );
    }
}

/// True when `main` already carries commits (an existing, populated datastore).
async fn main_has_commits(engine: &PraxisEngine) -> bool {
    engine
        .list_branches()
        .await
        .into_iter()
        .any(|branch| branch.name == "main" && branch.head.is_some())
}

/// Report the outcome of an import: the last commit's stats, or that no commits
/// were produced.
async fn report_import_result(
    engine: &PraxisEngine,
    dataset: &BaselineDataset,
    db_path: &Path,
) -> Result<()> {
    let commits = engine
        .list_commits("main".into())
        .await
        .map_err(|err| anyhow!(err.to_string()))?;
    let Some(last) = commits.last() else {
        println!(
            "imported dataset {} (no commits reported) into {}",
            dataset.version,
            db_path.display()
        );
        return Ok(());
    };

    let stats = engine
        .stats_for_commit(&last.id)
        .await
        .map_err(|err| anyhow!(err.to_string()))?;
    println!(
        "imported dataset {} (commits={} nodes={} edges={}) into {}",
        dataset.version,
        commits.len(),
        stats.node_count,
        stats.edge_count,
        db_path.display()
    );
    Ok(())
}

async fn import_dataset(args: ImportDatasetArgs) -> Result<()> {
    let dataset = BaselineDataset::from_path(&args.dataset)
        .or_else(|_| BaselineDataset::embedded())
        .map_err(|err| anyhow!(err.to_string()))?;

    if args.dry_run {
        dry_run_dataset(&dataset).await?;
        return Ok(());
    }

    if args.force && args.datastore.exists() {
        fs::remove_dir_all(&args.datastore)
            .with_context(|| format!("failed to clean {}", args.datastore.display()))?;
    }

    fs::create_dir_all(&args.datastore)
        .with_context(|| format!("failed to create {}", args.datastore.display()))?;
    let db_path = args.datastore.join("praxis.sqlite");
    let (_storage, engine) = open_sqlite_engine(&db_path).await?;

    if main_has_commits(&engine).await {
        return Err(anyhow!(
            "datastore '{}' already contains commits; rerun with --force",
            args.datastore.display()
        ));
    }

    engine
        .bootstrap_with_dataset(&dataset)
        .await
        .map_err(|err| anyhow!(err.to_string()))?;

    report_import_result(&engine, &dataset, &db_path).await
}

/// Open the sqlite store at `db_path` and build an unseeded engine over it,
/// returning both so callers can query the engine and the raw store.
async fn open_sqlite_engine(db_path: &Path) -> Result<(SqliteDb, PraxisEngine)> {
    let storage = SqliteDb::open(db_path)
        .await
        .map_err(|err| anyhow!(err.to_string()))?;
    let engine = PraxisEngine::with_stores_unseeded(
        PraxisEngineConfig::default(),
        Arc::new(storage.clone()),
    )
    .await
    .map_err(|err| anyhow!(err.to_string()))?;
    Ok((storage, engine))
}

/// A single integrity observation from a health scan.
struct Finding {
    kind: &'static str,
    message: String,
}

impl Finding {
    fn error(message: String) -> Self {
        Self {
            kind: "error",
            message,
        }
    }

    fn warning(message: String) -> Self {
        Self {
            kind: "warning",
            message,
        }
    }
}

/// Check a branch's recorded head against its commit list and its head's
/// timestamp metadata, appending any findings.
fn collect_branch_findings(
    branch_name: &str,
    head: Option<&String>,
    commits: &[CommitSummary],
    findings: &mut Vec<Finding>,
) {
    match (head, commits.last()) {
        (Some(head), Some(last)) if head != &last.id => {
            findings.push(Finding::error(format!(
                "branch '{}' head {} mismatches latest commit {}",
                branch_name, head, last.id
            )));
        }
        (Some(head), None) => findings.push(Finding::error(format!(
            "branch '{}' records head {} but has no commits",
            branch_name, head
        ))),
        (None, Some(last)) => findings.push(Finding::warning(format!(
            "branch '{}' has {} commits but no recorded head (latest {})",
            branch_name,
            commits.len(),
            last.id
        ))),
        (None, None) => findings.push(Finding::warning(format!(
            "branch '{}' is empty",
            branch_name
        ))),
        _ => {}
    }

    if let Some(last) = commits.last()
        && last.time.is_none()
    {
        findings.push(Finding::warning(format!(
            "branch '{}' head {} missing timestamp metadata",
            branch_name, last.id
        )));
    }
}

/// Record a finding if the commit's snapshot cannot be read back.
async fn check_commit_snapshot(
    engine: &PraxisEngine,
    commit_id: &str,
    findings: &mut Vec<Finding>,
) {
    if let Err(err) = engine.stats_for_commit(commit_id).await {
        findings.push(Finding::error(format!(
            "snapshot for commit {} unreadable: {}",
            commit_id, err
        )));
    }
}

/// Record a finding if the commit's snapshot tag is missing, unreadable, or
/// resolves to a different commit.
async fn check_snapshot_tag(storage: &SqliteDb, commit_id: &str, findings: &mut Vec<Finding>) {
    let tag_key = format!("snapshot/{}", commit_id);
    match storage.get_tag(&tag_key).await {
        Ok(Some(resolved)) if resolved == commit_id => {}
        Ok(Some(resolved)) => findings.push(Finding::error(format!(
            "snapshot tag {} points to {} instead of {}",
            tag_key, resolved, commit_id
        ))),
        Ok(None) => findings.push(Finding::warning(format!(
            "snapshot tag missing for commit {}",
            commit_id
        ))),
        Err(err) => findings.push(Finding::error(format!(
            "snapshot tag lookup failed for {}: {}",
            commit_id, err
        ))),
    }
}

/// Verify that every commit's snapshot is readable and its snapshot tag resolves
/// to itself, appending any findings.
async fn collect_commit_findings(
    engine: &PraxisEngine,
    storage: &SqliteDb,
    commits: &[CommitSummary],
    findings: &mut Vec<Finding>,
) {
    for commit in commits {
        check_commit_snapshot(engine, &commit.id, findings).await;
        check_snapshot_tag(storage, &commit.id, findings).await;
    }
}

/// The accumulated result of a datastore health scan.
struct HealthScan {
    db_path: PathBuf,
    branches_scanned: usize,
    commit_total: usize,
    findings: Vec<Finding>,
}

/// Print the scan summary and any warnings.
fn print_health_summary(scan: &HealthScan, warnings: &[&Finding]) {
    println!("Datastore: {}", scan.db_path.display());
    println!("Branches scanned: {}", scan.branches_scanned);
    println!("Commits scanned: {}", scan.commit_total);
    for warn in warnings {
        println!("warning: {}", warn.message);
    }
}

/// Print the scan summary and findings, returning an error if any finding is an
/// error-level observation.
fn report_health(scan: &HealthScan, quiet: bool) -> Result<()> {
    let errors: Vec<&Finding> = scan.findings.iter().filter(|f| f.kind == "error").collect();
    let warnings: Vec<&Finding> = scan
        .findings
        .iter()
        .filter(|f| f.kind == "warning")
        .collect();

    if !quiet {
        print_health_summary(scan, &warnings);
    }

    if !errors.is_empty() {
        for err in &errors {
            eprintln!("error: {}", err.message);
        }
        return Err(anyhow!(
            "health check failed ({} errors, {} warnings)",
            errors.len(),
            warnings.len()
        ));
    }

    if !quiet {
        println!("health check passed with {} warnings", warnings.len());
    }
    Ok(())
}

async fn check_health(args: HealthArgs) -> Result<()> {
    let db_path = args.datastore.join("praxis.sqlite");
    let (storage, engine) = open_sqlite_engine(&db_path).await?;

    let branches = engine.list_branches().await;
    let filtered: Vec<_> = branches
        .into_iter()
        .filter(|branch| match &args.branch {
            Some(target) => &branch.name == target,
            None => true,
        })
        .collect();

    if filtered.is_empty() {
        return Err(anyhow!("no branches found (filter={:?})", args.branch));
    }

    let mut findings: Vec<Finding> = Vec::new();
    let mut commit_total: usize = 0;

    for branch in &filtered {
        let commits = engine
            .list_commits(branch.name.clone())
            .await
            .map_err(|err| anyhow!(err.to_string()))?;
        commit_total += commits.len();

        collect_branch_findings(&branch.name, branch.head.as_ref(), &commits, &mut findings);
        collect_commit_findings(&engine, &storage, &commits, &mut findings).await;
    }

    let scan = HealthScan {
        db_path,
        branches_scanned: filtered.len(),
        commit_total,
        findings,
    };
    report_health(&scan, args.quiet)
}

async fn dry_run_dataset(dataset: &BaselineDataset) -> Result<()> {
    let store: Arc<dyn Store> = Arc::new(MemoryStore::default());
    let engine = PraxisEngine::with_stores_unseeded(PraxisEngineConfig::default(), store)
        .await
        .map_err(|err| anyhow!(err.to_string()))?;
    engine
        .bootstrap_with_dataset(dataset)
        .await
        .map_err(|err| anyhow!(err.to_string()))?;

    let commits = engine
        .list_commits("main".into())
        .await
        .map_err(|err| anyhow!(err.to_string()))?;
    let stats = if let Some(summary) = commits.last() {
        engine
            .stats_for_commit(&summary.id)
            .await
            .map_err(|err| anyhow!(err.to_string()))?
    } else {
        Default::default()
    };
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

// ---- check-crate-boundaries: architecture fitness function (ADR-0011, ADR-0040; D9/D21) ----

#[derive(Deserialize)]
struct CargoMetadata {
    packages: Vec<CargoPackage>,
}

#[derive(Deserialize)]
struct CargoPackage {
    name: String,
    manifest_path: String,
    dependencies: Vec<CargoDependency>,
}

#[derive(Deserialize)]
struct CargoDependency {
    name: String,
}

/// Pure check logic over a parsed `CargoMetadata` graph — extracted for unit testing.
///
/// Returns the list of violations (empty = clean). The caller decides whether to
/// print/exit with an error.
/// Flat-forbidden lateral engine→engine targets for a given engine crate
/// (MODULE-DEPENDENCY-MAP.md). The "contracts allowed / internals forbidden"
/// edges (metis→praxis, chrona→praxis, continuum→*) are NOT crate-level
/// enforceable until a neutral contracts crate exists (D21), so they are
/// intentionally omitted here rather than risk false positives.
fn forbidden_lateral_targets(pkg_lower: &str) -> &'static [&'static str] {
    if pkg_lower.contains("praxis") {
        &["metis", "chrona", "continuum"]
    } else if pkg_lower.contains("metis") {
        &["chrona", "continuum"]
    } else if pkg_lower.contains("chrona") {
        &["metis", "continuum"]
    } else {
        &[]
    }
}

/// True when `dep_name` is an upward dependency an engine must never take:
/// Tauri, the host crate, or the composition harness.
fn is_forbidden_upward_dep(
    dep_name: &str,
    host_pkg: Option<&str>,
    harness_pkg: Option<&str>,
) -> bool {
    dep_name == "tauri"
        || dep_name == "tauri-build"
        || host_pkg == Some(dep_name)
        || harness_pkg == Some(dep_name)
}

/// Append any dependency-direction violations for a single engine `pkg`.
fn collect_pkg_violations(
    pkg: &CargoPackage,
    host_pkg: Option<&str>,
    harness_pkg: Option<&str>,
    violations: &mut Vec<String>,
) {
    let forbidden_lateral = forbidden_lateral_targets(&pkg.name.to_lowercase());

    for dep in &pkg.dependencies {
        let dep_name = dep.name.as_str();
        if is_forbidden_upward_dep(dep_name, host_pkg, harness_pkg) {
            violations.push(format!(
                "engine `{}` depends on `{dep_name}` — engines must never import Tauri, the host, or the composition harness",
                pkg.name
            ));
        }
        let dep_lower = dep_name.to_lowercase();
        if forbidden_lateral.iter().any(|t| dep_lower.contains(t)) {
            violations.push(format!(
                "forbidden lateral edge: `{}` depends on `{dep_name}` — no lateral engine dependency; composition routes through the host (MODULE-DEPENDENCY-MAP.md)",
                pkg.name
            ));
        }
    }
}

fn collect_boundary_violations(metadata: &CargoMetadata) -> Vec<String> {
    let pkg_at = |needle: &str| {
        metadata
            .packages
            .iter()
            .find(|p| p.manifest_path.replace('\\', "/").contains(needle))
            .map(|p| p.name.clone())
    };
    let host_pkg = pkg_at("/src-tauri/"); // composition root
    let harness_pkg = pkg_at("/crates/engine/"); // `aideon_engine` — composes engines, exempt

    let mut violations: Vec<String> = Vec::new();

    for pkg in &metadata.packages {
        // Domain engines live under crates/*; the host and xtask are exempt, and
        // the `aideon_engine` harness is allowed to depend on every engine.
        if !pkg.manifest_path.replace('\\', "/").contains("/crates/") {
            continue;
        }
        if harness_pkg.as_deref() == Some(pkg.name.as_str()) {
            continue;
        }
        collect_pkg_violations(
            pkg,
            host_pkg.as_deref(),
            harness_pkg.as_deref(),
            &mut violations,
        );
    }

    violations
}

/// Enforce the allowed crate-dependency direction so architectural drift is a
/// failing check, not a reviewer-memory item: engine crates (`crates/*`) never
/// depend on Tauri or the host crate, and there is no Praxis↔Metis
/// implementation edge. Exits non-zero on violation so CI can gate it.
/// See ADR-0011 (module taxonomy) and defect-register D9/D21.
fn check_crate_boundaries() -> Result<()> {
    let cargo = std::env::var("CARGO").unwrap_or_else(|_| "cargo".to_owned());
    let output = std::process::Command::new(cargo)
        .args(["metadata", "--no-deps", "--format-version", "1"])
        .output()
        .context("running `cargo metadata`")?;
    if !output.status.success() {
        return Err(anyhow!(
            "`cargo metadata` failed: {}",
            String::from_utf8_lossy(&output.stderr)
        ));
    }
    let metadata: CargoMetadata =
        serde_json::from_slice(&output.stdout).context("parsing cargo metadata JSON")?;

    let violations = collect_boundary_violations(&metadata);
    let checked = metadata
        .packages
        .iter()
        .filter(|p| {
            p.manifest_path.replace('\\', "/").contains("/crates/")
                && p.name
                    != metadata
                        .packages
                        .iter()
                        .find(|q| {
                            q.manifest_path
                                .replace('\\', "/")
                                .contains("/crates/engine/")
                        })
                        .map(|q| q.name.as_str())
                        .unwrap_or("")
        })
        .count();

    if violations.is_empty() {
        println!(
            "crate boundaries OK: {checked} engine crate(s) checked, dependency direction holds"
        );
        Ok(())
    } else {
        for v in &violations {
            eprintln!("crate-boundary violation: {v}");
        }
        Err(anyhow!(
            "{} crate-dependency-direction violation(s)",
            violations.len()
        ))
    }
}
