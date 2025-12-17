use aideon_mneme::SqliteDb;
use sea_orm::{ConnectionTrait, Database, DbBackend, Statement};
use tempfile::tempdir;

#[tokio::test]
async fn applies_initial_migration_once() {
    let dir = tempdir().expect("tempdir");
    let path = dir.path().join("mneme.sqlite");

    // first open should apply migrations
    SqliteDb::open(&path).await.expect("initial open");

    // reopen should be idempotent
    SqliteDb::open(&path).await.expect("reopen");

    let database_url = format!("sqlite://{}?mode=rwc&cache=shared", path.display());
    let conn = Database::connect(&database_url).await.expect("connect");
    let rows = conn
        .query_all(Statement::from_string(
            DbBackend::Sqlite,
            String::from("SELECT migration_id FROM mneme_migrations ORDER BY migration_id"),
        ))
        .await
        .expect("query");
    assert_eq!(rows.len(), 1);
    let id: String = rows[0].try_get("", "migration_id").expect("migration id");
    assert_eq!(id, "0001_init_schema");
}
