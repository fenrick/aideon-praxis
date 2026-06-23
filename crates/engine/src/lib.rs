//! `aideon_engine` — the in-process execution seam the host calls.
//!
//! The host ([`src-tauri`](../../src-tauri)) never touches the storage layer
//! directly; it calls this engine façade, which owns the open [`Workspace`] and
//! returns host-facing DTOs ([M0 build contract], "Module ownership"). Keeping
//! the seam here means desktop mode runs the engine in-process behind one trait
//! surface, with no sockets and no Tauri types leaking into storage.
#![forbid(unsafe_code)]

use serde::Serialize;
use specta::Type;

pub use mneme_core::ops::{OpEnvelope, OpPayload, Origin};
pub use mneme_core::{Id, Value};
pub use mneme_store::error::{Result, StoreError};
pub use mneme_store::{FoundationProjectionSnapshot, Manifest, Workspace};

use std::path::Path;

/// A host-facing summary of an open workspace's foundation state.
#[derive(Clone, Debug, PartialEq, Eq, Serialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct WorkspaceStatus {
    /// The portable container identity.
    pub workspace_id: String,
    /// The workspace's sole partition.
    pub partition_id: String,
    /// On-disk format version.
    pub workspace_format_version: u32,
    /// Count of applied canonical operations.
    pub applied_op_count: u64,
    /// The structural foundation-rebuild hash over the current state.
    pub foundation_rebuild_hash: String,
}

/// The in-process engine handle wrapping one open workspace.
pub struct Engine {
    workspace: Workspace,
}

impl Engine {
    /// Create a new workspace and open it for writing.
    pub fn create(root: impl AsRef<Path>, created_by_actor_id: Option<Id>) -> Result<Self> {
        Ok(Self {
            workspace: Workspace::create(root, created_by_actor_id)?,
        })
    }

    /// Open an existing workspace for writing (rebuilding the runtime as needed).
    pub fn open(root: impl AsRef<Path>) -> Result<Self> {
        Ok(Self {
            workspace: Workspace::open(root)?,
        })
    }

    /// Author one operation through the canonical write path.
    pub fn author(
        &mut self,
        actor_id: Id,
        origin: Origin,
        payload: OpPayload,
    ) -> Result<OpEnvelope> {
        self.workspace.author(actor_id, origin, payload)
    }

    /// The host-facing workspace status DTO.
    pub fn status(&self) -> Result<WorkspaceStatus> {
        let manifest = self.workspace.manifest();
        let snapshot = self.workspace.snapshot()?;
        let applied_op_count = snapshot
            .partitions
            .iter()
            .map(|p| p.applied_ops.len() as u64)
            .sum();
        Ok(WorkspaceStatus {
            workspace_id: manifest.workspace_id.to_canonical_string(),
            partition_id: manifest.partition_id.to_canonical_string(),
            workspace_format_version: manifest.workspace_format_version,
            applied_op_count,
            foundation_rebuild_hash: snapshot.foundation_rebuild_hash()?,
        })
    }

    /// The underlying workspace, for direct foundation operations.
    pub fn workspace(&self) -> &Workspace {
        &self.workspace
    }

    /// The underlying workspace, mutably.
    pub fn workspace_mut(&mut self) -> &mut Workspace {
        &mut self.workspace
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use mneme_core::ops::{ActorDeclare, ActorKind};
    use tempfile::TempDir;

    #[test]
    fn create_author_status_round_trip() {
        let dir = TempDir::new().unwrap();
        let actor = Id::new_v4();
        let mut engine = Engine::create(dir.path(), Some(actor)).unwrap();
        engine
            .author(
                actor,
                Origin::manual(),
                OpPayload::ActorDeclare(ActorDeclare {
                    declared_actor_id: actor,
                    actor_kind: ActorKind::Person,
                    display_name: "Architect".into(),
                }),
            )
            .unwrap();
        let status = engine.status().unwrap();
        assert_eq!(status.applied_op_count, 1);
        assert_eq!(status.workspace_format_version, 1);
        assert_eq!(status.foundation_rebuild_hash.len(), 64);
        drop(engine);

        // Reopen through the seam and confirm the state survives.
        let reopened = Engine::open(dir.path()).unwrap();
        assert_eq!(reopened.status().unwrap().applied_op_count, 1);
    }
}
