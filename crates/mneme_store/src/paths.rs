//! The on-disk workspace layout (format v1).
//!
//! Canonical material lives under the workspace root (`manifest.json`,
//! `model/ops/`, `model/schema/authored/`, `objects/sha256/`). All derived,
//! host-local state lives under `.aideon/runtime/` — never copied, zipped, or
//! synced — so deleting that subtree wipes only derived state.

use std::path::{Path, PathBuf};

/// Resolves the canonical and derived paths of a workspace from its root.
#[derive(Clone, Debug)]
pub struct Paths {
    root: PathBuf,
}

impl Paths {
    /// Build path helpers rooted at `root`.
    pub fn new(root: impl Into<PathBuf>) -> Self {
        Self { root: root.into() }
    }

    /// The workspace root directory.
    #[must_use]
    pub fn root(&self) -> &Path {
        &self.root
    }

    /// `manifest.json` — the root descriptor.
    #[must_use]
    pub fn manifest(&self) -> PathBuf {
        self.root.join("manifest.json")
    }

    /// `model/ops/` — the canonical operation segments.
    #[must_use]
    pub fn ops_dir(&self) -> PathBuf {
        self.root.join("model").join("ops")
    }

    /// The growing loose segment `current.ops.jsonl`.
    #[must_use]
    pub fn current_segment(&self) -> PathBuf {
        self.ops_dir().join("current.ops.jsonl")
    }

    /// A sealed segment by its six-digit sequence number.
    #[must_use]
    pub fn sealed_segment(&self, seqno: u32) -> PathBuf {
        self.ops_dir().join(format!("{seqno:06}.ops.jsonl"))
    }

    /// `model/schema/authored/` — the authored-source projection.
    #[must_use]
    pub fn schema_authored_dir(&self) -> PathBuf {
        self.root.join("model").join("schema").join("authored")
    }

    /// `model/schema/index.json` — the deterministic schema file inventory.
    #[must_use]
    pub fn schema_index(&self) -> PathBuf {
        self.root.join("model").join("schema").join("index.json")
    }

    /// `objects/sha256/` — the content-addressed object root.
    #[must_use]
    pub fn objects_dir(&self) -> PathBuf {
        self.root.join("objects").join("sha256")
    }

    /// The path of a blob object by its 64-hex digest
    /// (`objects/sha256/<aa>/<bb>/<digest>`).
    #[must_use]
    pub fn object_path(&self, digest: &str) -> PathBuf {
        let aa = &digest[0..2];
        let bb = &digest[2..4];
        self.objects_dir().join(aa).join(bb).join(digest)
    }

    /// `.aideon/runtime/` — the disposable derived-state root.
    #[must_use]
    pub fn runtime_dir(&self) -> PathBuf {
        self.root.join(".aideon").join("runtime")
    }

    /// The derived SQLite projection database.
    #[must_use]
    pub fn runtime_db(&self) -> PathBuf {
        self.runtime_dir().join("runtime.sqlite3")
    }

    /// The writer lock file (host-local).
    #[must_use]
    pub fn lock_file(&self) -> PathBuf {
        self.runtime_dir().join("locks").join("workspace.lock")
    }

    /// The blob staging directory (host-local; shares a filesystem with
    /// `objects/`).
    #[must_use]
    pub fn staging_blobs_dir(&self) -> PathBuf {
        self.runtime_dir().join("staging").join("blobs")
    }
}
