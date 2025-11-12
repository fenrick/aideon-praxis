//! SeaORM-backed implementation of the Mneme store.

use std::path::Path;
use std::sync::Arc;
use std::time::{SystemTime, UNIX_EPOCH};

use sea_orm::{
    ActiveModelTrait, ColumnTrait, ConnectionTrait, Database, DatabaseConnection, DbBackend, DbErr,
    EntityTrait, QueryFilter, Schema, Set, Statement, TransactionTrait, Value,
};
use sea_query::SqliteQueryBuilder;
use serde_json;
use tokio::runtime::{Builder, Runtime};

use crate::{MnemeError, MnemeResult, PersistedCommit, Store};

mod commits;
mod metis;
mod refs;
mod snapshot_tags;

/// SeaORM-backed implementation of the Mneme store (synonym kept for existing callers).
#[derive(Clone)]
pub struct SqliteDb {
    conn: DatabaseConnection,
    runtime: Arc<Runtime>,
}

impl SqliteDb {
    /// Open (or create) a SQLite database using SeaORM, apply migrations, and ensure the main branch exists.
    pub fn open(path: impl AsRef<Path>) -> MnemeResult<Self> {
        let runtime = Builder::new_current_thread()
            .enable_all()
            .build()
            .map_err(|err| MnemeError::storage(format!("tokio runtime: {err}")))?;
        let database_url = format!("sqlite://{}?mode=rwc&cache=shared", path.as_ref().display());
        let conn = runtime
            .block_on(Database::connect(&database_url))
            .map_err(|err| {
                MnemeError::storage(format!(
                    "open sqlite store '{}': {err}",
                    path.as_ref().display()
                ))
            })?;
        runtime
            .block_on(run_migrations(&conn))
            .map_err(|err| MnemeError::storage(format!("sqlite migrations: {err}")))?;
        runtime
            .block_on(ensure_main_branch(&conn))
            .map_err(|err| MnemeError::storage(format!("ensure main branch: {err}")))?;
        Ok(Self {
            conn,
            runtime: Arc::new(runtime),
        })
    }

    fn block_on<F, T>(&self, fut: F) -> MnemeResult<T>
    where
        F: std::future::Future<Output = Result<T, DbErr>> + Send + 'static,
        T: Send + 'static,
    {
        self.runtime
            .block_on(fut)
            .map_err(|err| MnemeError::storage(format!("SeaORM error: {err}")))
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

impl Store for SqliteDb {
    fn put_commit(&self, commit: &PersistedCommit) -> MnemeResult<()> {
        let conn = self.conn.clone();
        let model = self.commit_model_from(commit);
        self.block_on(async move { model.insert(&conn).await.map(|_| ()) })
    }

    fn get_commit(&self, id: &str) -> MnemeResult<Option<PersistedCommit>> {
        let conn = self.conn.clone();
        let id = id.to_string();
        self.block_on(async move {
            let record = commits::Entity::find_by_id(id).one(&conn).await?;
            if let Some(rec) = record {
                let summary: crate::temporal::CommitSummary =
                    serde_json::from_str(&rec.summary_json)
                        .map_err(|err| DbErr::Custom(err.to_string()))?;
                let change_set: crate::temporal::ChangeSet =
                    serde_json::from_str(&rec.changes_json)
                        .map_err(|err| DbErr::Custom(err.to_string()))?;
                Ok(Some(PersistedCommit {
                    summary,
                    change_set,
                }))
            } else {
                Ok(None)
            }
        })
    }

    fn ensure_branch(&self, branch: &str) -> MnemeResult<()> {
        let conn = self.conn.clone();
        let branch = branch.to_string();
        self.block_on(async move {
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
        })
    }

    fn compare_and_swap_branch(
        &self,
        branch: &str,
        expected: Option<&str>,
        next: Option<&str>,
    ) -> MnemeResult<()> {
        let conn = self.conn.clone();
        let branch = branch.to_string();
        let expected = expected.map(|s| s.to_string());
        let next_commit = next.map(|s| s.to_string());
        self.block_on(async move {
            let txn = conn.begin().await?;
            let current = refs::Entity::find_by_id(branch.clone()).one(&txn).await?;
            let current_head = current.as_ref().and_then(|row| row.commit_id.clone());
            if current_head.as_deref() != expected.as_deref() {
                txn.rollback().await?;
                return Err(DbErr::Custom("concurrency conflict".into()));
            }
            refs::Entity::update(refs::ActiveModel {
                branch: Set(branch.clone()),
                commit_id: Set(next_commit.clone()),
                updated_at_ms: Set(current_time_ms()),
            })
            .filter(refs::Column::Branch.eq(branch.clone()))
            .exec(&txn)
            .await?;
            txn.commit().await
        })
    }

    fn get_branch_head(&self, branch: &str) -> MnemeResult<Option<String>> {
        let conn = self.conn.clone();
        let branch = branch.to_string();
        self.block_on(async move {
            let head = refs::Entity::find_by_id(branch).one(&conn).await?;
            Ok(head.and_then(|row| row.commit_id))
        })
    }

    fn list_branches(&self) -> MnemeResult<Vec<(String, Option<String>)>> {
        let conn = self.conn.clone();
        self.block_on(async move {
            let rows = refs::Entity::find().all(&conn).await?;
            Ok(rows
                .into_iter()
                .map(|row| (row.branch, row.commit_id))
                .collect())
        })
    }

    fn put_tag(&self, tag: &str, commit_id: &str) -> MnemeResult<()> {
        let conn = self.conn.clone();
        let tag = tag.to_string();
        let commit = commit_id.to_string();
        let timestamp = current_time_ms();
        self.block_on(async move {
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
            conn.execute(statement).await.map(|_| ())
        })
    }

    fn get_tag(&self, tag: &str) -> MnemeResult<Option<String>> {
        let conn = self.conn.clone();
        let tag = tag.to_string();
        self.block_on(async move {
            let record = snapshot_tags::Entity::find_by_id(tag).one(&conn).await?;
            Ok(record.map(|row| row.commit_id))
        })
    }

    fn list_tags(&self) -> MnemeResult<Vec<(String, String)>> {
        let conn = self.conn.clone();
        self.block_on(async move {
            let rows = snapshot_tags::Entity::find().all(&conn).await?;
            Ok(rows
                .into_iter()
                .map(|row| (row.tag, row.commit_id))
                .collect())
        })
    }
}

fn current_time_ms() -> i64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis() as i64
}

fn is_unique_violation(err: &DbErr) -> bool {
    err.to_string().to_lowercase().contains("unique")
}

async fn run_migrations(conn: &DatabaseConnection) -> Result<(), DbErr> {
    let backend = DbBackend::Sqlite;
    let schema = Schema::new(backend);
    let commits_sql = schema
        .create_table_from_entity(commits::Entity)
        .if_not_exists()
        .to_string(SqliteQueryBuilder);
    let refs_sql = schema
        .create_table_from_entity(refs::Entity)
        .if_not_exists()
        .to_string(SqliteQueryBuilder);
    let tags_sql = schema
        .create_table_from_entity(snapshot_tags::Entity)
        .if_not_exists()
        .to_string(SqliteQueryBuilder);
    let metis_sql = schema
        .create_table_from_entity(metis::Entity)
        .if_not_exists()
        .to_string(SqliteQueryBuilder);
    for statement in [commits_sql, refs_sql, tags_sql, metis_sql] {
        conn.execute(Statement::from_string(backend, statement))
            .await?;
    }
    Ok(())
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
