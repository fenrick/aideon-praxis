//! Schema migration tracking for the SeaORM-backed SQLite store.

use sea_orm::entity::prelude::*;
use sea_orm::{
    DatabaseConnection, DbBackend, DbErr, EntityTrait, QueryOrder, Schema, Set, Statement,
    TransactionTrait,
};
use sea_query::SqliteQueryBuilder;

use super::{
    commits, current_time_ms, metis_edge_changes, metis_events, metis_node_changes, refs,
    snapshot_tags,
};

struct Migration {
    id: &'static str,
    build_statements: fn() -> Vec<String>,
}

const MIGRATIONS: &[Migration] = &[Migration {
    id: "0001_init_schema",
    build_statements: build_initial_schema_statements,
}];

pub(super) async fn apply(conn: &DatabaseConnection) -> Result<(), DbErr> {
    ensure_history_table(conn).await?;
    let applied = applied_migrations(conn).await?;
    for migration in MIGRATIONS {
        if applied.contains(&migration.id.to_string()) {
            continue;
        }
        apply_migration(conn, migration).await?;
    }
    Ok(())
}

async fn ensure_history_table(conn: &DatabaseConnection) -> Result<(), DbErr> {
    let backend = DbBackend::Sqlite;
    let schema = Schema::new(backend);
    let history_sql = schema
        .create_table_from_entity(history::Entity)
        .if_not_exists()
        .to_string(SqliteQueryBuilder);
    conn.execute(Statement::from_string(backend, history_sql))
        .await
        .map(|_| ())
}

async fn applied_migrations(conn: &DatabaseConnection) -> Result<Vec<String>, DbErr> {
    let rows = history::Entity::find()
        .order_by_asc(history::Column::MigrationId)
        .all(conn)
        .await?;
    Ok(rows.into_iter().map(|row| row.migration_id).collect())
}

async fn apply_migration(conn: &DatabaseConnection, migration: &Migration) -> Result<(), DbErr> {
    let backend = DbBackend::Sqlite;
    let statements = (migration.build_statements)();
    let txn = conn.begin().await?;
    for statement in statements {
        txn.execute(Statement::from_string(backend, statement))
            .await?;
    }
    history::ActiveModel {
        migration_id: Set(migration.id.to_string()),
        applied_at_ms: Set(current_time_ms()),
    }
    .insert(&txn)
    .await?;
    txn.commit().await
}

fn build_initial_schema_statements() -> Vec<String> {
    let backend = DbBackend::Sqlite;
    let schema = Schema::new(backend);
    let mut statements = vec![
        schema
            .create_table_from_entity(commits::Entity)
            .if_not_exists()
            .to_string(SqliteQueryBuilder),
        schema
            .create_table_from_entity(refs::Entity)
            .if_not_exists()
            .to_string(SqliteQueryBuilder),
        schema
            .create_table_from_entity(snapshot_tags::Entity)
            .if_not_exists()
            .to_string(SqliteQueryBuilder),
        schema
            .create_table_from_entity(metis_events::Entity)
            .if_not_exists()
            .to_string(SqliteQueryBuilder),
        schema
            .create_table_from_entity(metis_node_changes::Entity)
            .if_not_exists()
            .to_string(SqliteQueryBuilder),
        schema
            .create_table_from_entity(metis_edge_changes::Entity)
            .if_not_exists()
            .to_string(SqliteQueryBuilder),
    ];

    statements.extend([
        String::from(
            "CREATE INDEX IF NOT EXISTS idx_metis_events_commit ON metis_events(commit_id)",
        ),
        String::from(
            "CREATE INDEX IF NOT EXISTS idx_metis_nodes_commit ON metis_commit_nodes(commit_id)",
        ),
        String::from(
            "CREATE INDEX IF NOT EXISTS idx_metis_nodes_event ON metis_commit_nodes(event_id)",
        ),
        String::from(
            "CREATE INDEX IF NOT EXISTS idx_metis_edges_commit ON metis_commit_edges(commit_id)",
        ),
        String::from(
            "CREATE INDEX IF NOT EXISTS idx_metis_edges_event ON metis_commit_edges(event_id)",
        ),
    ]);

    statements
}

mod history {
    use sea_orm::entity::prelude::*;

    #[derive(Clone, Debug, DeriveEntityModel)]
    #[sea_orm(table_name = "mneme_migrations")]
    pub struct Model {
        #[sea_orm(primary_key, auto_increment = false)]
        pub migration_id: String,
        pub applied_at_ms: i64,
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
