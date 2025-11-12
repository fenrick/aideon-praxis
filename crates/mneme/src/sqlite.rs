use std::path::Path;
use std::sync::Arc;
use std::time::{SystemTime, UNIX_EPOCH};

use aideon_continuum::SnapshotStore as ContinuumSnapshotStore;
use sea_orm::{
    ActiveModelTrait, ColumnTrait, ConnectionTrait, Database, DatabaseConnection, DbBackend, DbErr,
    EntityTrait, QueryFilter, Schema, Set, Statement, TransactionTrait,
};
use sea_query::SqliteQueryBuilder;
use serde_json;
use tokio::runtime::{Builder, Runtime};

use crate::{MnemeError, MnemeResult, PersistedCommit, Store};

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

    pub fn snapshot_store(&self) -> SqliteSnapshotStore {
        SqliteSnapshotStore {
            conn: self.conn.clone(),
            runtime: Arc::clone(&self.runtime),
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
}

/// SeaORM-backed snapshot store.
pub struct SqliteSnapshotStore {
    conn: DatabaseConnection,
    runtime: Arc<Runtime>,
}

impl ContinuumSnapshotStore for SqliteSnapshotStore {
    fn put(&self, key: &str, bytes: &[u8]) -> Result<(), String> {
        let conn = self.conn.clone();
        let key = key.to_string();
        let payload = bytes.to_vec();
        self.runtime
            .block_on(async move {
                let insert = snapshots::ActiveModel {
                    snapshot_key: Set(key.clone()),
                    bytes: Set(payload.clone()),
                };
                match insert.insert(&conn).await {
                    Ok(_) => Ok(()),
                    Err(err) if is_unique_violation(&err) => {
                        snapshots::Entity::update(snapshots::ActiveModel {
                            snapshot_key: Set(key.clone()),
                            bytes: Set(payload.clone()),
                        })
                        .filter(snapshots::Column::SnapshotKey.eq(key.clone()))
                        .exec(&conn)
                        .await
                        .map(|_| ())
                    }
                    Err(err) => Err(err),
                }
            })
            .map_err(|err| err.to_string())
    }

    fn get(&self, key: &str) -> Result<Vec<u8>, String> {
        let conn = self.conn.clone();
        let key = key.to_string();
        self.runtime
            .block_on(async move {
                let record = snapshots::Entity::find_by_id(key).one(&conn).await?;
                record
                    .ok_or_else(|| DbErr::Custom("snapshot not found".into()))
                    .map(|row| row.bytes)
            })
            .map_err(|err| err.to_string())
    }
}

pub fn sanitize_id(id: &str) -> String {
    id.chars()
        .map(|ch| match ch {
            'a'..='z' | 'A'..='Z' | '0'..='9' | '-' | '_' => ch,
            _ => '_',
        })
        .collect()
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
    let snapshots_sql = schema
        .create_table_from_entity(snapshots::Entity)
        .if_not_exists()
        .to_string(SqliteQueryBuilder);
    let metis_sql = schema
        .create_table_from_entity(metis::Entity)
        .if_not_exists()
        .to_string(SqliteQueryBuilder);
    for statement in [commits_sql, refs_sql, snapshots_sql, metis_sql] {
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

mod commits {
    use sea_orm::entity::prelude::*;

    #[derive(Clone, Debug, DeriveEntityModel)]
    #[sea_orm(table_name = "commits")]
    pub struct Model {
        #[sea_orm(primary_key)]
        pub commit_id: String,
        pub branch: String,
        pub parents_json: String,
        pub author: Option<String>,
        pub time: Option<String>,
        pub message: String,
        pub tags_json: String,
        pub change_count: i64,
        pub summary_json: String,
        pub changes_json: String,
    }

    #[derive(Copy, Clone, Debug, EnumIter)]
    pub enum Relation {}

    impl RelationTrait for Relation {
        fn def(&self) -> RelationDef {
            panic!("No relations")
        }
    }

    impl ActiveModelBehavior for ActiveModel {}
}

mod refs {
    use sea_orm::entity::prelude::*;

    #[derive(Clone, Debug, DeriveEntityModel)]
    #[sea_orm(table_name = "refs")]
    pub struct Model {
        #[sea_orm(primary_key)]
        pub branch: String,
        pub commit_id: Option<String>,
        pub updated_at_ms: i64,
    }

    #[derive(Copy, Clone, Debug, EnumIter)]
    pub enum Relation {}

    impl RelationTrait for Relation {
        fn def(&self) -> RelationDef {
            panic!("No relations")
        }
    }

    impl ActiveModelBehavior for ActiveModel {}
}

mod snapshots {
    use sea_orm::entity::prelude::*;

    #[derive(Clone, Debug, DeriveEntityModel)]
    #[sea_orm(table_name = "snapshots")]
    pub struct Model {
        #[sea_orm(primary_key)]
        pub snapshot_key: String,
        pub bytes: Vec<u8>,
    }

    #[derive(Copy, Clone, Debug, EnumIter)]
    pub enum Relation {}

    impl RelationTrait for Relation {
        fn def(&self) -> RelationDef {
            panic!("No relations")
        }
    }

    impl ActiveModelBehavior for ActiveModel {}
}

mod metis {
    use sea_orm::entity::prelude::*;

    #[derive(Clone, Debug, DeriveEntityModel)]
    #[sea_orm(table_name = "metis_events")]
    pub struct Model {
        #[sea_orm(primary_key)]
        pub event_id: String,
        pub commit_id: String,
        pub payload: String,
        pub created_at_ms: i64,
    }

    #[derive(Copy, Clone, Debug, EnumIter)]
    pub enum Relation {}

    impl RelationTrait for Relation {
        fn def(&self) -> RelationDef {
            panic!("No relations")
        }
    }

    impl ActiveModelBehavior for ActiveModel {}
}
