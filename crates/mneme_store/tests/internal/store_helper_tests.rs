use super::*;
use crate::DatabaseConfig;
use crate::LimitsConfig;
use crate::MnemeConfig;
use aideon_mneme_core::ops::WriteOptions;

#[test]
fn valid_bucket_divides_by_days() {
    assert_eq!(valid_bucket(ValidTime(0)), 0);
    assert_eq!(valid_bucket(ValidTime(MICROS_PER_DAY)), 1);
    assert_eq!(valid_bucket(ValidTime(MICROS_PER_DAY * 3)), 3);
}

#[test]
fn retention_cutoff_is_not_future() {
    let cutoff = retention_cutoff_hlc(1);
    let now = Hlc::now().as_i64();
    assert!(cutoff <= now);
}

#[test]
fn job_backoff_clamps_to_max() {
    assert_eq!(job_backoff_millis(0), JOB_BACKOFF_BASE_MS);
    assert_eq!(job_backoff_millis(1), JOB_BACKOFF_BASE_MS);
    assert_eq!(job_backoff_millis(2), JOB_BACKOFF_BASE_MS * 2);
    assert_eq!(job_backoff_millis(20), JOB_BACKOFF_MAX_MS);
}

#[test]
fn normalize_index_text_trims_and_lowercases() {
    let normalized = normalize_index_text("  FoO Bar  ");
    assert_eq!(normalized, "foo bar");
}

#[test]
fn check_value_limits_rejects_oversized_blob() {
    let limits = MnemeLimits {
        max_op_payload_bytes: 16,
        max_blob_bytes: 1,
        max_mv_values: 1,
        max_pending_jobs: 1,
        max_ingest_batch: 1,
    };
    let ok = check_value_limits(&Value::Blob(vec![1]), &limits);
    assert!(ok.is_ok());
    let err = check_value_limits(&Value::Blob(vec![1, 2]), &limits);
    assert!(err.is_err());
}

#[test]
fn build_connection_url_supports_sqlite_and_postgres() {
    let base = Path::new("/tmp");
    let sqlite = MnemeConfig::default_sqlite("praxis.sqlite");
    let sqlite_url = build_connection_url(&sqlite, base).expect("sqlite url");
    assert!(sqlite_url.starts_with("sqlite://"));

    let postgres = MnemeConfig {
        database: DatabaseConfig::Postgres {
            url: "postgres://localhost:5432/praxis".to_string(),
        },
        pool: None,
        limits: Some(LimitsConfig::with_defaults()),
        integrity: None,
        validation_mode: None,
        failpoints: None,
    };
    let pg_url = build_connection_url(&postgres, base).expect("pg url");
    assert_eq!(pg_url, "postgres://localhost:5432/praxis");
}

#[test]
fn payload_helpers_resolve_scenario_and_bulk_mode() {
    let scenario = ScenarioId(Id::new());
    let payload = OpPayload::CreateNode(CreateNodeInput {
        partition: PartitionId(Id::new()),
        scenario_id: Some(scenario),
        actor: ActorId(Id::new()),
        asserted_at: Hlc::now(),
        node_id: Id::new(),
        type_id: None,
        acl_group_id: None,
        owner_actor_id: None,
        visibility: None,
        write_options: Some(WriteOptions { bulk_mode: true }),
    });
    let encoded = serde_json::to_vec(&payload).expect("payload");
    let parsed = scenario_id_from_payload(&encoded).expect("scenario");
    assert_eq!(parsed, Some(scenario));
    assert_eq!(payload_scenario_id(&payload), Some(scenario));
    assert!(payload_bulk_mode(&payload));
}

#[test]
fn change_feed_payload_tracks_entity_kinds() {
    let payload = OpPayload::TombstoneEntity {
        partition: PartitionId(Id::new()),
        scenario_id: None,
        actor: ActorId(Id::new()),
        asserted_at: Hlc::now(),
        entity_id: Id::new(),
    };
    let (kind, entity_id, extra) = change_feed_payload(&payload).expect("payload");
    assert_eq!(kind, CHANGE_KIND_ENTITY);
    assert!(entity_id.is_some());
    assert!(extra.is_none());
}
