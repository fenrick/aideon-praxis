use sea_orm::ActiveValue::Set;
use serde::Serialize;

use crate::{
    MnemeError, PersistedCommit,
    sqlite::{current_time_ms, metis},
};

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct ChangeBreakdown {
    created: u64,
    updated: u64,
    deleted: u64,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct MetisChangeSummary {
    nodes: ChangeBreakdown,
    edges: ChangeBreakdown,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct MetisEventPayload {
    commit_id: String,
    branch: String,
    message: String,
    author: Option<String>,
    time: Option<String>,
    parents: Vec<String>,
    tags: Vec<String>,
    change_count: u64,
    summary: MetisChangeSummary,
}

pub(super) fn metis_event_model(
    commit: &PersistedCommit,
) -> Result<metis::ActiveModel, MnemeError> {
    let summary = &commit.summary;
    let change_set = &commit.change_set;
    let nodes = ChangeBreakdown {
        created: change_set.node_creates.len() as u64,
        updated: change_set.node_updates.len() as u64,
        deleted: change_set.node_deletes.len() as u64,
    };
    let edges = ChangeBreakdown {
        created: change_set.edge_creates.len() as u64,
        updated: change_set.edge_updates.len() as u64,
        deleted: change_set.edge_deletes.len() as u64,
    };
    let payload = MetisEventPayload {
        commit_id: summary.id.clone(),
        branch: summary.branch.clone(),
        message: summary.message.clone(),
        author: summary.author.clone(),
        time: summary.time.clone(),
        parents: summary.parents.clone(),
        tags: summary.tags.clone(),
        change_count: summary.change_count,
        summary: MetisChangeSummary { nodes, edges },
    };
    let payload_json = serde_json::to_string(&payload)
        .map_err(|err| MnemeError::storage(format!("serialise Metis payload: {err}")))?;

    Ok(metis::ActiveModel {
        event_id: Set(summary.id.clone()),
        commit_id: Set(summary.id.clone()),
        payload: Set(payload_json),
        created_at_ms: Set(current_time_ms()),
    })
}
