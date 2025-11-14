//! SeaORM-backed implementation of the Mneme store.

use std::path::Path;
use std::time::{SystemTime, UNIX_EPOCH};

use sea_orm::{
    ActiveModelTrait, ColumnTrait, ConnectionTrait, Database, DatabaseConnection, DbBackend, DbErr,
    EntityTrait, QueryFilter, Set, Statement, TransactionTrait, Value,
};

use async_trait::async_trait;

use crate::{MnemeError, MnemeResult, PersistedCommit, Store};

mod commits;
mod metis;
mod migrations;
mod projections;
mod refs;
mod snapshot_tags;

/// SeaORM-backed implementation of the Mneme store (synonym kept for existing callers).
#[derive(Clone)]
pub struct SqliteDb {
    conn: DatabaseConnection,
}

impl SqliteDb {
    /// Open (or create) a SQLite database using SeaORM, apply migrations, and ensure the main branch exists.
    pub async fn open(path: impl AsRef<Path>) -> MnemeResult<Self> {
        let database_url = format!("sqlite://{}?mode=rwc&cache=shared", path.as_ref().display());
        let conn = Database::connect(&database_url).await.map_err(|err| {
            MnemeError::storage(format!(
                "open sqlite store '{}': {err}",
                path.as_ref().display()
            ))
        })?;
        run_migrations(&conn)
            .await
            .map_err(|err| MnemeError::storage(format!("sqlite migrations: {err}")))?;
        ensure_main_branch(&conn)
            .await
            .map_err(|err| MnemeError::storage(format!("ensure main branch: {err}")))?;
        Ok(Self { conn })
    }

    fn commit_model_from(&self, commit: &PersistedCommit) -> commits::ActiveModel {
        commits::ActiveModel {
            commit_id: Set(commit.summary.id.clone()),
            branch: Set(commit.summary.branch.clone()),
            parents_json: Set(serde_json::to_string(&commit.summary.parents).unwrap_or_default()),
            author: Set(commit.summary.author.clone()),
            time: Set(commit.summary.time.clone()),
            message: Set(commit.summary.message.clone()),
            tags_json: Set(serde_json::to_string(&commit.summary.tags).unwrap_or_default()),
            change_count: Set(commit.summary.change_count as i64),
            summary_json: Set(serde_json::to_string(&commit.summary).unwrap_or_default()),
            changes_json: Set(serde_json::to_string(&commit.change_set).unwrap_or_default()),
        }
    }
}

#[async_trait]
impl Store for SqliteDb {
    async fn put_commit(&self, commit: &PersistedCommit) -> MnemeResult<()> {
        let conn = self.conn.clone();
        let model = self.commit_model_from(commit);
        let metis_model = projections::metis_event_model(commit)?;
        let txn = conn
            .begin()
            .await
            .map_err(|err| MnemeError::storage(format!("SeaORM error: {err}")))?;
        model
            .insert(&txn)
            .await
            .map_err(|err| MnemeError::storage(format!("SeaORM error: {err}")))?;
        metis_model
            .insert(&txn)
            .await
            .map_err(|err| MnemeError::storage(format!("SeaORM error: {err}")))?;
        txn.commit()
            .await
            .map(|_| ())
            .map_err(|err| MnemeError::storage(format!("SeaORM error: {err}")))
    }

    async fn get_commit(&self, id: &str) -> MnemeResult<Option<PersistedCommit>> {
        let conn = self.conn.clone();
        let id = id.to_string();
        let record = commits::Entity::find_by_id(id)
            .one(&conn)
            .await
            .map_err(|err| MnemeError::storage(format!("SeaORM error: {err}")))?;
        if let Some(rec) = record {
            let summary: crate::temporal::CommitSummary =
                serde_json::from_str(&rec.summary_json)
                    .map_err(|err| MnemeError::storage(err.to_string()))?;
            let change_set: crate::temporal::ChangeSet = serde_json::from_str(&rec.changes_json)
                .map_err(|err| MnemeError::storage(err.to_string()))?;
            Ok(Some(PersistedCommit {
                summary,
                change_set,
            }))
        } else {
            Ok(None)
        }
    }

    async fn ensure_branch(&self, branch: &str) -> MnemeResult<()> {
        let conn = self.conn.clone();
        let branch = branch.to_string();
        let insert = refs::ActiveModel {
            branch: Set(branch),
            commit_id: Set(None),
            updated_at_ms: Set(current_time_ms()),
        };
        match insert.insert(&conn).await {
            Ok(_) => Ok(()),
            Err(err) if is_unique_violation(&err) => Ok(()),
            Err(err) => Err(err),
        }
        .map_err(|err| MnemeError::storage(format!("SeaORM error: {err}")))
    }

    async fn compare_and_swap_branch(
        &self,
        branch: &str,
        expected: Option<&str>,
        next: Option<&str>,
    ) -> MnemeResult<()> {
        let conn = self.conn.clone();
        let branch = branch.to_string();
        let expected = expected.map(|s| s.to_string());
        let next_commit = next.map(|s| s.to_string());
        let txn = conn
            .begin()
            .await
            .map_err(|err| MnemeError::storage(format!("SeaORM error: {err}")))?;
        let current = refs::Entity::find_by_id(branch.clone())
            .one(&txn)
            .await
            .map_err(|err| MnemeError::storage(format!("SeaORM error: {err}")))?;
        let current_head = current.as_ref().and_then(|row| row.commit_id.clone());
        if current_head.as_deref() != expected.as_deref() {
            txn.rollback()
                .await
                .map_err(|err| MnemeError::storage(format!("SeaORM error: {err}")))?;
            return Err(MnemeError::ConcurrencyConflict {
                branch: branch.clone(),
                expected,
                actual: current_head,
            });
        }
        refs::Entity::update(refs::ActiveModel {
            branch: Set(branch.clone()),
            commit_id: Set(next_commit.clone()),
            updated_at_ms: Set(current_time_ms()),
        })
        .filter(refs::Column::Branch.eq(branch.clone()))
        .exec(&txn)
        .await
        .map_err(|err| MnemeError::storage(format!("SeaORM error: {err}")))?;
        txn.commit()
            .await
            .map_err(|err| MnemeError::storage(format!("SeaORM error: {err}")))
    }

    async fn get_branch_head(&self, branch: &str) -> MnemeResult<Option<String>> {
        let conn = self.conn.clone();
        let branch = branch.to_string();
        let head = refs::Entity::find_by_id(branch)
            .one(&conn)
            .await
            .map_err(|err| MnemeError::storage(format!("SeaORM error: {err}")))?;
        Ok(head.and_then(|row| row.commit_id))
    }

    async fn list_branches(&self) -> MnemeResult<Vec<(String, Option<String>)>> {
        let conn = self.conn.clone();
        let rows = refs::Entity::find()
            .all(&conn)
            .await
            .map_err(|err| MnemeError::storage(format!("SeaORM error: {err}")))?;
        Ok(rows
            .into_iter()
            .map(|row| (row.branch, row.commit_id))
            .collect())
    }

    async fn put_tag(&self, tag: &str, commit_id: &str) -> MnemeResult<()> {
        let conn = self.conn.clone();
        let tag = tag.to_string();
        let commit = commit_id.to_string();
        let timestamp = current_time_ms();
        let statement = Statement::from_sql_and_values(
            DbBackend::Sqlite,
            "INSERT INTO snapshot_tags (tag, commit_id, created_at_ms) VALUES (?, ?, ?)\
             ON CONFLICT(tag) DO UPDATE SET commit_id=excluded.commit_id, created_at_ms=excluded.created_at_ms",
            vec![
                Value::from(tag.clone()),
                Value::from(commit.clone()),
                Value::from(timestamp),
            ],
        );
        conn.execute(statement)
            .await
            .map(|_| ())
            .map_err(|err| MnemeError::storage(format!("SeaORM error: {err}")))
    }

    async fn get_tag(&self, tag: &str) -> MnemeResult<Option<String>> {
        let conn = self.conn.clone();
        let tag = tag.to_string();
        let record = snapshot_tags::Entity::find_by_id(tag)
            .one(&conn)
            .await
            .map_err(|err| MnemeError::storage(format!("SeaORM error: {err}")))?;
        Ok(record.map(|row| row.commit_id))
    }

    async fn list_tags(&self) -> MnemeResult<Vec<(String, String)>> {
        let conn = self.conn.clone();
        let rows = snapshot_tags::Entity::find()
            .all(&conn)
            .await
            .map_err(|err| MnemeError::storage(format!("SeaORM error: {err}")))?;
        Ok(rows
            .into_iter()
            .map(|row| (row.tag, row.commit_id))
            .collect())
    }
}

pub(super) fn current_time_ms() -> i64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis() as i64
}

fn is_unique_violation(err: &DbErr) -> bool {
    err.to_string().to_lowercase().contains("unique")
}

async fn run_migrations(conn: &DatabaseConnection) -> Result<(), DbErr> {
    migrations::apply(conn).await
}

async fn ensure_main_branch(conn: &DatabaseConnection) -> Result<(), DbErr> {
    let insert = refs::ActiveModel {
        branch: Set("main".into()),
        commit_id: Set(None),
        updated_at_ms: Set(current_time_ms()),
    };
    match insert.insert(conn).await {
        Ok(_) => Ok(()),
        Err(err) if is_unique_violation(&err) => Ok(()),
        Err(err) => Err(err),
    }
}
