use std::collections::BTreeMap;

use aideon_mneme::temporal::{
    ChangeSet, DiffPatch, EdgeTombstone, EdgeVersion, NodeTombstone, NodeVersion,
};
use serde::{Deserialize, Serialize};

use crate::error::{PraxisError, PraxisResult};

/// Deterministic key for edges stored inside a graph snapshot.
#[derive(Clone, Debug, PartialEq, Eq, PartialOrd, Ord, Hash, Serialize, Deserialize)]
struct EdgeKey {
    id: Option<String>,
    from: String,
    to: String,
}

impl EdgeKey {
    fn new(version: &EdgeVersion) -> Self {
        Self {
            id: version.id.clone(),
            from: version.from.clone(),
            to: version.to.clone(),
        }
    }

    fn matches_tombstone(&self, tombstone: &EdgeTombstone) -> bool {
        self.from == tombstone.from && self.to == tombstone.to
    }
}

/// Aggregated metrics for a snapshot.
#[derive(Clone, Copy, Debug, PartialEq, Eq, Default)]
pub struct SnapshotStats {
    pub node_count: usize,
    pub edge_count: usize,
}

/// Immutable graph snapshot used when materialising commits.
#[derive(Clone, Debug, Default, Serialize, Deserialize)]
pub struct GraphSnapshot {
    nodes: BTreeMap<String, NodeVersion>,
    edges: BTreeMap<EdgeKey, EdgeVersion>,
}

impl GraphSnapshot {
    pub fn empty() -> Self {
        Self::default()
    }

    pub fn stats(&self) -> SnapshotStats {
        SnapshotStats {
            node_count: self.nodes.len(),
            edge_count: self.edges.len(),
        }
    }

    pub fn apply(&self, change: &ChangeSet) -> PraxisResult<GraphSnapshot> {
        let mut next = self.clone();

        // Node deletes first — we will validate edges afterwards to forbid dangling refs.
        for tombstone in &change.node_deletes {
            if next.nodes.remove(&tombstone.id).is_none() {
                return Err(PraxisError::ValidationFailed {
                    message: format!("node '{}' does not exist for delete", tombstone.id),
                });
            }
        }

        // Node creates
        for node in &change.node_creates {
            if next.nodes.contains_key(&node.id) {
                return Err(PraxisError::ValidationFailed {
                    message: format!("node '{}' already exists", node.id),
                });
            }
            next.nodes.insert(node.id.clone(), sanitize_node(node));
        }

        // Node updates are replace-by-id for now (TODO: support partial updates with schema merge).
        for node in &change.node_updates {
            if !next.nodes.contains_key(&node.id) {
                return Err(PraxisError::ValidationFailed {
                    message: format!("node '{}' missing for update", node.id),
                });
            }
            next.nodes.insert(node.id.clone(), sanitize_node(node));
        }

        // Edge deletes
        for tombstone in &change.edge_deletes {
            remove_edges_matching(&mut next.edges, tombstone)?;
        }

        // Edge creates
        for edge in &change.edge_creates {
            ensure_endpoints_exist(&next.nodes, edge)?;
            let key = EdgeKey::new(edge);
            if next.edges.contains_key(&key) {
                return Err(PraxisError::ValidationFailed {
                    message: format!(
                        "edge '{}' already exists",
                        edge.id
                            .clone()
                            .unwrap_or_else(|| format!("{}->{}", edge.from, edge.to))
                    ),
                });
            }
            next.edges.insert(key, sanitize_edge(edge));
        }

        // Edge updates — replace existing entry by id when present, otherwise resolve by endpoints.
        for edge in &change.edge_updates {
            ensure_endpoints_exist(&next.nodes, edge)?;
            let key = if let Some(id) = &edge.id {
                next.edges
                    .keys()
                    .find(|k| k.id.as_deref() == Some(id.as_str()))
                    .cloned()
                    .ok_or_else(|| PraxisError::ValidationFailed {
                        message: format!("edge '{}' missing for update", id),
                    })?
            } else {
                // Resolve by endpoints; require a single match to maintain determinism.
                let mut matches: Vec<EdgeKey> = next
                    .edges
                    .keys()
                    .filter(|k| k.from == edge.from && k.to == edge.to)
                    .cloned()
                    .collect();
                if matches.is_empty() {
                    return Err(PraxisError::ValidationFailed {
                        message: format!("edge '{}->{}' missing for update", edge.from, edge.to),
                    });
                }
                if matches.len() > 1 {
                    return Err(PraxisError::ValidationFailed {
                        message: format!(
                            "edge '{}->{}' update is ambiguous ({} matches)",
                            edge.from,
                            edge.to,
                            matches.len()
                        ),
                    });
                }
                matches.pop().expect("single match")
            };
            next.edges.remove(&key);
            next.edges.insert(EdgeKey::new(edge), sanitize_edge(edge));
        }

        next.validate()?;
        Ok(next)
    }

    pub fn diff(&self, other: &GraphSnapshot) -> DiffPatch {
        let mut patch = DiffPatch::default();

        for (id, node) in other.nodes.iter() {
            if !self.nodes.contains_key(id) {
                patch.node_adds.push(node.clone());
            } else if self.nodes.get(id) != Some(node) {
                patch.node_mods.push(node.clone());
            }
        }
        for id in self.nodes.keys() {
            if !other.nodes.contains_key(id) {
                patch.node_dels.push(NodeTombstone { id: id.clone() });
            }
        }

        for (key, edge) in other.edges.iter() {
            if !self.edges.contains_key(key) {
                patch.edge_adds.push(edge.clone());
            } else if self.edges.get(key) != Some(edge) {
                patch.edge_mods.push(edge.clone());
            }
        }
        for key in self.edges.keys() {
            if !other.edges.contains_key(key) {
                patch.edge_dels.push(EdgeTombstone {
                    from: key.from.clone(),
                    to: key.to.clone(),
                });
            }
        }

        patch
    }

    fn validate(&self) -> PraxisResult<()> {
        for edge in self.edges.values() {
            if !self.nodes.contains_key(&edge.from) || !self.nodes.contains_key(&edge.to) {
                return Err(PraxisError::IntegrityViolation {
                    message: format!(
                        "edge '{}' references missing endpoint(s)",
                        edge.id
                            .clone()
                            .unwrap_or_else(|| format!("{}->{}", edge.from, edge.to))
                    ),
                });
            }
        }
        Ok(())
    }

    pub(crate) fn node(&self, id: &str) -> Option<&NodeVersion> {
        self.nodes.get(id)
    }

    pub(crate) fn has_node(&self, id: &str) -> bool {
        self.nodes.contains_key(id)
    }

    pub(crate) fn edge(&self, edge: &EdgeVersion) -> Option<&EdgeVersion> {
        self.edges.get(&EdgeKey::new(edge))
    }

    pub(crate) fn has_edge(&self, edge: &EdgeVersion) -> bool {
        self.edge(edge).is_some()
    }

    pub(crate) fn has_edge_tombstone(&self, tombstone: &EdgeTombstone) -> bool {
        self.edges
            .keys()
            .any(|key| key.matches_tombstone(tombstone))
    }
}

fn sanitize_node(node: &NodeVersion) -> NodeVersion {
    let mut copy = NodeVersion {
        id: node.id.clone(),
        r#type: node.r#type.clone(),
        props: node.props.clone(),
    };
    // To-do: validate props against schema once meta-model solidifies.
    if let Some(props) = &copy.props
        && props.is_null()
    {
        copy.props = None;
    }
    copy
}

fn sanitize_edge(edge: &EdgeVersion) -> EdgeVersion {
    let mut copy = EdgeVersion {
        id: edge.id.clone(),
        from: edge.from.clone(),
        to: edge.to.clone(),
        r#type: edge.r#type.clone(),
        directed: edge.directed,
        props: edge.props.clone(),
    };
    if let Some(props) = &copy.props
        && props.is_null()
    {
        copy.props = None;
    }
    copy
}

fn ensure_endpoints_exist(
    nodes: &BTreeMap<String, NodeVersion>,
    edge: &EdgeVersion,
) -> PraxisResult<()> {
    if !nodes.contains_key(&edge.from) || !nodes.contains_key(&edge.to) {
        return Err(PraxisError::ValidationFailed {
            message: format!(
                "edge '{}' references missing node(s)",
                edge.id
                    .clone()
                    .unwrap_or_else(|| format!("{}->{}", edge.from, edge.to))
            ),
        });
    }
    Ok(())
}

fn remove_edges_matching(
    edges: &mut BTreeMap<EdgeKey, EdgeVersion>,
    tombstone: &EdgeTombstone,
) -> PraxisResult<()> {
    let keys: Vec<EdgeKey> = edges
        .keys()
        .filter(|k| k.matches_tombstone(tombstone))
        .cloned()
        .collect();
    if keys.is_empty() {
        return Err(PraxisError::ValidationFailed {
            message: format!(
                "edge '{}->{}' does not exist for delete",
                tombstone.from, tombstone.to
            ),
        });
    }
    for key in keys {
        edges.remove(&key);
    }
    Ok(())
}
