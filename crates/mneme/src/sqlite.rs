use std::path::Path;
use std::sync::{Arc, Mutex};

use crate::temporal::CommitSummary;
use aideon_continuum::SnapshotStore as ContinuumSnapshotStore;
use rusqlite::{Connection, OptionalExtension, Transaction, params};
use rusqlite_migration::{M, Migrations};

use crate::{MnemeError, MnemeResult, PersistedCommit, Store};

/// SQLite-backed implementation of the Mneme store.
#[derive(Clone)]
pub struct SqliteDb {
    conn: Arc<Mutex<Connection>>,
}

impl SqliteDb {
    /// Open (or create) a SQLite database at the provided path and apply migrations.
    pub fn open(path: impl AsRef<Path>) -> MnemeResult<Self> {
        let mut conn = Connection::open(path.as_ref()).map_err(|err| {
            MnemeError::storage(format!(
                "open sqlite store '{}': {err}",
                path.as_ref().display()
            ))
        })?;
        conn.pragma_update(None, "journal_mode", "WAL")
            .map_err(|err| MnemeError::storage(format!("journal_mode WAL failed: {err}")))?;
        conn.pragma_update(None, "synchronous", "NORMAL")
            .map_err(|err| MnemeError::storage(format!("set synchronous pragma failed: {err}")))?;
        conn.pragma_update(None, "foreign_keys", "ON")
            .map_err(|err| MnemeError::storage(format!("enable foreign_keys failed: {err}")))?;
        run_migrations(&mut conn)?;
        Ok(Self {
            conn: Arc::new(Mutex::new(conn)),
        })
    }

    fn connection(&self) -> std::sync::MutexGuard<'_, Connection> {
        self.conn.lock().expect("sqlite connection poisoned")
    }

    /// Run a closure inside a SQLite transaction.
    pub fn with_transaction<F, T>(&self, f: F) -> MnemeResult<T>
    where
        F: FnOnce(&Transaction<'_>) -> MnemeResult<T>,
    {
        let mut conn = self.connection();
        let tx = conn
            .transaction()
            .map_err(|err| MnemeError::storage(format!("begin tx: {err}")))?;
        let outcome = f(&tx);
        match outcome {
            Ok(value) => {
                tx.commit()
                    .map_err(|err| MnemeError::storage(format!("commit tx: {err}")))?;
                Ok(value)
            }
            Err(err) => {
                tx.rollback().map_err(|rollback| {
                    MnemeError::storage(format!("rollback failed after error {err:?}: {rollback}"))
                })?;
                Err(err)
            }
        }
    }

    pub fn snapshot_store(&self) -> SqliteSnapshotStore {
        SqliteSnapshotStore {
            conn: Arc::clone(&self.conn),
        }
    }
}

impl Store for SqliteDb {
    fn put_commit(&self, commit: &PersistedCommit) -> MnemeResult<()> {
        let conn = self.connection();
        let summary = serde_json::to_string(&commit.summary).map_err(|err| {
            MnemeError::storage(format!(
                "serialize commit summary '{}': {err}",
                commit.summary.id
            ))
        })?;
        let change_set = serde_json::to_string(&commit.change_set).map_err(|err| {
            MnemeError::storage(format!(
                "serialize changeset '{}': {err}",
                commit.summary.id
            ))
        })?;
        let tags = serde_json::to_string(&commit.summary.tags).map_err(|err| {
            MnemeError::storage(format!("serialize tags '{}': {err}", commit.summary.id))
        })?;
        let parents = serde_json::to_string(&commit.summary.parents).map_err(|err| {
            MnemeError::storage(format!("serialize parents '{}': {err}", commit.summary.id))
        })?;
        conn.execute(
            "INSERT INTO commits (
                commit_id,
                branch,
                parents_json,
                author,
                time,
                message,
                tags_json,
                change_count,
                summary_json,
                changes_json
            ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)",
            params![
                &commit.summary.id,
                &commit.summary.branch,
                parents,
                &commit.summary.author,
                &commit.summary.time,
                &commit.summary.message,
                tags,
                commit.summary.change_count as i64,
                summary,
                change_set,
            ],
        )
        .map_err(|err| {
            MnemeError::storage(format!("insert commit '{}': {err}", commit.summary.id))
        })?;
        Ok(())
    }

    fn get_commit(&self, id: &str) -> MnemeResult<Option<PersistedCommit>> {
        let conn = self.connection();
        let row = conn
            .query_row(
                "SELECT summary_json, changes_json FROM commits WHERE commit_id = ?1",
                [id],
                |row| {
                    let summary_json: String = row.get(0)?;
                    let changes_json: String = row.get(1)?;
                    Ok((summary_json, changes_json))
                },
            )
            .optional()
            .map_err(|err| MnemeError::storage(format!("select commit '{id}': {err}")))?;
        if let Some((summary_json, changes_json)) = row {
            let summary: CommitSummary = serde_json::from_str(&summary_json)
                .map_err(|err| MnemeError::storage(format!("parse summary '{id}': {err}")))?;
            let change_set = serde_json::from_str(&changes_json)
                .map_err(|err| MnemeError::storage(format!("parse changeset '{id}': {err}")))?;
            Ok(Some(PersistedCommit {
                summary,
                change_set,
            }))
        } else {
            Ok(None)
        }
    }

    fn ensure_branch(&self, branch: &str) -> MnemeResult<()> {
        let conn = self.connection();
        conn.execute(
            "INSERT INTO refs (branch, commit_id, updated_at_ms) VALUES (?1, NULL, strftime('%s','now') * 1000)
             ON CONFLICT(branch) DO NOTHING",
            [branch],
        )
        .map_err(|err| MnemeError::storage(format!("ensure branch '{branch}': {err}")))?;
        Ok(())
    }

    fn compare_and_swap_branch(
        &self,
        branch: &str,
        expected: Option<&str>,
        next: Option<&str>,
    ) -> MnemeResult<()> {
        let mut conn = self.connection();
        let tx = conn
            .transaction()
            .map_err(|err| MnemeError::storage(format!("branch '{branch}' begin tx: {err}")))?;
        let current = tx
            .query_row(
                "SELECT commit_id FROM refs WHERE branch = ?1",
                [branch],
                |row| row.get::<_, Option<String>>(0),
            )
            .optional()
            .map_err(|err| MnemeError::storage(format!("select branch '{branch}': {err}")))?
            .flatten();
        if current.as_deref() != expected {
            return Err(MnemeError::ConcurrencyConflict {
                branch: branch.into(),
                expected: expected.map(|s| s.to_string()),
                actual: current,
            });
        }
        tx.execute(
            "INSERT INTO refs (branch, commit_id, updated_at_ms) VALUES (?1, ?2, strftime('%s','now') * 1000)
             ON CONFLICT(branch) DO UPDATE SET commit_id = excluded.commit_id, updated_at_ms = excluded.updated_at_ms",
            params![branch, next],
        )
        .map_err(|err| MnemeError::storage(format!("update branch '{branch}': {err}")))?;
        tx.commit()
            .map_err(|err| MnemeError::storage(format!("commit branch tx '{branch}': {err}")))
    }

    fn get_branch_head(&self, branch: &str) -> MnemeResult<Option<String>> {
        let conn = self.connection();
        let head = conn
            .query_row(
                "SELECT commit_id FROM refs WHERE branch = ?1",
                [branch],
                |row| row.get::<_, Option<String>>(0),
            )
            .optional()
            .map_err(|err| MnemeError::storage(format!("fetch branch '{branch}': {err}")))?
            .flatten();
        Ok(head)
    }

    fn list_branches(&self) -> MnemeResult<Vec<(String, Option<String>)>> {
        let conn = self.connection();
        let mut stmt = conn
            .prepare("SELECT branch, commit_id FROM refs ORDER BY branch")
            .map_err(|err| MnemeError::storage(format!("prepare branch list: {err}")))?;
        let rows = stmt
            .query_map([], |row| {
                let name: String = row.get(0)?;
                let head: Option<String> = row.get(1)?;
                Ok((name, head))
            })
            .map_err(|err| MnemeError::storage(format!("query branch list: {err}")))?;
        let mut branches = Vec::new();
        for row in rows {
            branches.push(
                row.map_err(|err| MnemeError::storage(format!("iterate branch list: {err}")))?,
            );
        }
        Ok(branches)
    }
}

#[derive(Clone)]
pub struct SqliteSnapshotStore {
    conn: Arc<Mutex<Connection>>,
}

impl ContinuumSnapshotStore for SqliteSnapshotStore {
    fn put(&self, key: &str, bytes: &[u8]) -> Result<(), String> {
        let conn = self
            .conn
            .lock()
            .map_err(|_| "sqlite snapshot lock poisoned".to_string())?;
        conn.execute(
            "INSERT INTO snapshots (snapshot_key, bytes) VALUES (?1, ?2)
             ON CONFLICT(snapshot_key) DO UPDATE SET bytes = excluded.bytes",
            params![key, bytes],
        )
        .map_err(|err| format!("write snapshot '{key}': {err}"))?;
        Ok(())
    }

    fn get(&self, key: &str) -> Result<Vec<u8>, String> {
        let conn = self
            .conn
            .lock()
            .map_err(|_| "sqlite snapshot lock poisoned".to_string())?;
        let blob: Option<Vec<u8>> = conn
            .query_row(
                "SELECT bytes FROM snapshots WHERE snapshot_key = ?1",
                [key],
                |row| row.get(0),
            )
            .optional()
            .map_err(|err| format!("read snapshot '{key}': {err}"))?;
        blob.ok_or_else(|| format!("snapshot '{key}' not found"))
    }
}

fn run_migrations(conn: &mut Connection) -> MnemeResult<()> {
    let migrations = Migrations::new(vec![M::up(
        "CREATE TABLE IF NOT EXISTS commits (
            commit_id TEXT PRIMARY KEY,
            branch TEXT NOT NULL,
            parents_json TEXT NOT NULL,
            author TEXT,
            time TEXT,
            message TEXT NOT NULL,
            tags_json TEXT NOT NULL,
            change_count INTEGER NOT NULL,
            summary_json TEXT NOT NULL,
            changes_json TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS refs (
            branch TEXT PRIMARY KEY,
            commit_id TEXT,
            updated_at_ms INTEGER NOT NULL
        );
        CREATE TABLE IF NOT EXISTS snapshots (
            snapshot_key TEXT PRIMARY KEY,
            bytes BLOB NOT NULL
        );
        CREATE INDEX IF NOT EXISTS commits_branch_idx ON commits(branch);
        CREATE INDEX IF NOT EXISTS commits_time_idx ON commits(time);
        CREATE INDEX IF NOT EXISTS commits_parent_idx ON commits(parents_json);
    ",
    )]);
    migrations
        .to_latest(conn)
        .map_err(|err| MnemeError::storage(format!("apply sqlite migrations: {err}")))
}

pub fn sanitize_id(id: &str) -> String {
    id.chars()
        .map(|ch| match ch {
            'a'..='z' | 'A'..='Z' | '0'..='9' | '-' | '_' => ch,
            _ => '_',
        })
        .collect()
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::temporal::ChangeSet;
    use std::fs;
    use std::time::{SystemTime, UNIX_EPOCH};

    #[test]
    fn sqlite_roundtrip() {
        let path = temp_path("mneme-sqlite");
        let db = SqliteDb::open(&path).expect("open sqlite");
        let commit = PersistedCommit {
            summary: CommitSummary {
                id: "c_sqlite".into(),
                parents: vec![],
                branch: "main".into(),
                author: Some("tester".into()),
                time: Some("2025-11-10T00:00:00Z".into()),
                message: "seed".into(),
                tags: vec!["seed".into()],
                change_count: 0,
            },
            change_set: ChangeSet::default(),
        };
        db.put_commit(&commit).expect("put commit");
        db.ensure_branch("main").expect("ensure branch");
        db.compare_and_swap_branch("main", None, Some(&commit.summary.id))
            .expect("swap branch");
        let fetched = db
            .get_commit(&commit.summary.id)
            .expect("get commit")
            .expect("exists");
        assert_eq!(fetched.summary.id, commit.summary.id);
        assert_eq!(
            db.get_branch_head("main").expect("head").as_deref(),
            Some(commit.summary.id.as_str())
        );
        let snapshot = db.snapshot_store();
        snapshot
            .put("snapshots/c_sqlite.bin", b"bytes")
            .expect("put snapshot");
        let bytes = snapshot
            .get("snapshots/c_sqlite.bin")
            .expect("get snapshot");
        assert_eq!(bytes, b"bytes");
        let _ = fs::remove_file(path);
    }

    fn temp_path(label: &str) -> std::path::PathBuf {
        std::env::temp_dir().join(format!(
            "mneme-{label}-{}",
            SystemTime::now()
                .duration_since(UNIX_EPOCH)
                .unwrap()
                .as_nanos()
        ))
    }
}
