use sea_orm::ActiveValue::Set;
use serde::Serialize;

use crate::{
    MnemeError, PersistedCommit,
    sqlite::{current_time_ms, metis_edge_changes, metis_events, metis_node_changes},
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

pub(super) struct MetisProjections {
    pub event: metis_events::ActiveModel,
    pub node_changes: Vec<metis_node_changes::ActiveModel>,
    pub edge_changes: Vec<metis_edge_changes::ActiveModel>,
}

pub(super) fn project_commit(commit: &PersistedCommit) -> Result<MetisProjections, MnemeError> {
    let summary = &commit.summary;
    let change_set = &commit.change_set;
    let timestamp = current_time_ms();
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
    let payload_json = serialize_json(&payload, "Metis payload")?;

    let event = metis_events::ActiveModel {
        event_id: Set(summary.id.clone()),
        commit_id: Set(summary.id.clone()),
        payload: Set(payload_json),
        created_at_ms: Set(timestamp),
    };

    let node_changes = project_node_changes(commit, timestamp)?;
    let edge_changes = project_edge_changes(commit, timestamp)?;

    Ok(MetisProjections {
        event,
        node_changes,
        edge_changes,
    })
}

fn project_node_changes(
    commit: &PersistedCommit,
    recorded_at_ms: i64,
) -> Result<Vec<metis_node_changes::ActiveModel>, MnemeError> {
    let summary = &commit.summary;
    let mut rows = Vec::new();
    for node in &commit.change_set.node_creates {
        rows.push(build_node_change(summary, recorded_at_ms, node, "create")?);
    }
    for node in &commit.change_set.node_updates {
        rows.push(build_node_change(summary, recorded_at_ms, node, "update")?);
    }
    for tombstone in &commit.change_set.node_deletes {
        rows.push(metis_node_changes::ActiveModel {
            id: Default::default(),
            event_id: Set(summary.id.clone()),
            commit_id: Set(summary.id.clone()),
            node_id: Set(tombstone.id.clone()),
            operation: Set(String::from("delete")),
            node_type: Set(None),
            props_json: Set(None),
            recorded_at_ms: Set(recorded_at_ms),
        });
    }
    Ok(rows)
}

fn project_edge_changes(
    commit: &PersistedCommit,
    recorded_at_ms: i64,
) -> Result<Vec<metis_edge_changes::ActiveModel>, MnemeError> {
    let summary = &commit.summary;
    let mut rows = Vec::new();
    for edge in &commit.change_set.edge_creates {
        rows.push(build_edge_change(summary, recorded_at_ms, edge, "create")?);
    }
    for edge in &commit.change_set.edge_updates {
        rows.push(build_edge_change(summary, recorded_at_ms, edge, "update")?);
    }
    for tombstone in &commit.change_set.edge_deletes {
        rows.push(metis_edge_changes::ActiveModel {
            id: Default::default(),
            event_id: Set(summary.id.clone()),
            commit_id: Set(summary.id.clone()),
            edge_id: Set(None),
            from_node: Set(tombstone.from.clone()),
            to_node: Set(tombstone.to.clone()),
            operation: Set(String::from("delete")),
            edge_type: Set(None),
            directed: Set(None),
            props_json: Set(None),
            recorded_at_ms: Set(recorded_at_ms),
        });
    }
    Ok(rows)
}

fn build_node_change(
    summary: &crate::temporal::CommitSummary,
    recorded_at_ms: i64,
    node: &crate::temporal::NodeVersion,
    operation: &str,
) -> Result<metis_node_changes::ActiveModel, MnemeError> {
    let props_json = serialize_option_json(&node.props, "node props")?;
    Ok(metis_node_changes::ActiveModel {
        id: Default::default(),
        event_id: Set(summary.id.clone()),
        commit_id: Set(summary.id.clone()),
        node_id: Set(node.id.clone()),
        operation: Set(operation.to_string()),
        node_type: Set(node.r#type.clone()),
        props_json: Set(props_json),
        recorded_at_ms: Set(recorded_at_ms),
    })
}

fn build_edge_change(
    summary: &crate::temporal::CommitSummary,
    recorded_at_ms: i64,
    edge: &crate::temporal::EdgeVersion,
    operation: &str,
) -> Result<metis_edge_changes::ActiveModel, MnemeError> {
    let props_json = serialize_option_json(&edge.props, "edge props")?;
    Ok(metis_edge_changes::ActiveModel {
        id: Default::default(),
        event_id: Set(summary.id.clone()),
        commit_id: Set(summary.id.clone()),
        edge_id: Set(edge.id.clone()),
        from_node: Set(edge.from.clone()),
        to_node: Set(edge.to.clone()),
        operation: Set(operation.to_string()),
        edge_type: Set(edge.r#type.clone()),
        directed: Set(edge.directed),
        props_json: Set(props_json),
        recorded_at_ms: Set(recorded_at_ms),
    })
}

fn serialize_json<T: Serialize>(value: &T, label: &str) -> Result<String, MnemeError> {
    serde_json::to_string(value)
        .map_err(|err| MnemeError::storage(format!("serialise {label}: {err}")))
}

fn serialize_option_json(
    value: &Option<serde_json::Value>,
    label: &str,
) -> Result<Option<String>, MnemeError> {
    value
        .as_ref()
        .map(|inner| serialize_json(inner, label))
        .transpose()
}
