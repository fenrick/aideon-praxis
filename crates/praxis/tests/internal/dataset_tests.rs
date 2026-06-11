use super::*;
use crate::store::{MemoryStore, Store};
use crate::temporal::ChangeSet;
use crate::{PraxisEngine, PraxisEngineConfig};
use std::sync::Arc;

#[test]
fn loads_embedded_dataset() {
    let dataset = BaselineDataset::embedded().expect("dataset");
    assert_eq!(dataset.version, "1.0.0");
    assert!(!dataset.commits().is_empty());
    assert!(matches!(dataset.commits()[0].changes, ChangeSet { .. }));
}

#[tokio::test]
async fn dataset_bootstrap_yields_expected_counts() {
    let dataset = BaselineDataset::embedded().expect("dataset");
    let store: Arc<dyn Store> = Arc::new(MemoryStore::default());
    let engine = PraxisEngine::with_stores_unseeded(PraxisEngineConfig::default(), store)
        .await
        .expect("engine");
    engine
        .bootstrap_with_dataset(&dataset)
        .await
        .expect("bootstrap");

    let commits = engine
        .list_commits("main".into())
        .await
        .expect("list commits");
    assert_eq!(
        commits.len(),
        dataset.commits().len() + 1,
        "meta seed + dataset commits expected",
    );
    let stats = engine
        .stats_for_commit(&commits.last().expect("head").id)
        .await
        .expect("stats");
    assert!(stats.node_count >= 20, "expected rich baseline nodes");
    assert!(stats.edge_count >= 14, "expected baseline edges");
}
