//! The `manifest.json` root descriptor (format v1) and the refuse-or-degrade
//! version/feature gates ([workspace-integrity-and-recovery], [ADR-0002]).

use std::collections::BTreeMap;

use serde::{Deserialize, Serialize};
use serde_json::Value as JsonValue;

use mneme_core::Id;
use mneme_core::canonical::canonical_json_document;

use crate::atomic::atomic_write;
use crate::error::{Result, StoreError};
use crate::paths::Paths;

/// The highest on-disk layout version this build understands.
pub const MAX_WORKSPACE_FORMAT_VERSION: u32 = 1;
/// The highest authored metamodel package version this build understands.
pub const MAX_METAMODEL_PACKAGE_VERSION: u32 = 1;
/// Default segment size seal threshold (8 MiB).
pub const DEFAULT_SEAL_MAX_BYTES: u64 = 8_388_608;
/// Default segment age seal threshold (24 h).
pub const DEFAULT_SEAL_MAX_AGE_SECS: u64 = 86_400;

/// Required feature for grouped Change Event commit markers.
pub const ATOMIC_CHANGE_EVENT_BATCHES: &str = "atomic_change_event_batches";

/// Features this build implements.
const SUPPORTED_FEATURES: &[&str] = &[ATOMIC_CHANGE_EVENT_BATCHES];

/// The workspace root descriptor.
#[derive(Clone, Debug, PartialEq, Eq, Serialize)]
pub struct Manifest {
    /// On-disk layout version.
    pub workspace_format_version: u32,
    /// The authored metamodel package version in force.
    pub metamodel_package_version: u32,
    /// Stable identity of the portable container.
    pub workspace_id: Id,
    /// The workspace's sole permitted partition (a separate mint).
    pub partition_id: Id,
    /// Wall-clock creation instant (RFC 3339 UTC), informational.
    pub created_at: String,
    /// The logical actor that created the workspace, if recorded.
    pub created_by_actor_id: Option<Id>,
    /// The content-address family under `objects/`.
    pub hash_algorithm: String,
    /// Provisional size seal threshold.
    pub segment_seal_max_bytes: u64,
    /// Provisional age seal threshold.
    pub segment_seal_max_age_secs: u64,
    /// Forward-compatible capability bits an older reader may ignore.
    pub feature_flags: BTreeMap<String, JsonValue>,
    /// Features the reader must support to open read-write.
    pub required_features: Vec<String>,
}

#[derive(Deserialize)]
struct RawManifest {
    workspace_format_version: u32,
    metamodel_package_version: u32,
    workspace_id: Id,
    partition_id: Id,
    created_at: String,
    #[serde(default)]
    created_by_actor_id: Option<Id>,
    #[serde(default)]
    hash_algorithm: Option<String>,
    #[serde(default)]
    segment_seal_max_bytes: Option<u64>,
    #[serde(default)]
    segment_seal_max_age_secs: Option<u64>,
    #[serde(default)]
    feature_flags: Option<BTreeMap<String, JsonValue>>,
    #[serde(default)]
    required_features: Option<Vec<String>>,
}

impl Manifest {
    /// Build a fresh format-v1 manifest for a new workspace, minting a separate
    /// `workspace_id` and `partition_id`.
    #[must_use]
    pub fn new(workspace_id: Id, partition_id: Id, created_by_actor_id: Option<Id>) -> Self {
        Self {
            workspace_format_version: MAX_WORKSPACE_FORMAT_VERSION,
            metamodel_package_version: 1,
            workspace_id,
            partition_id,
            created_at: now_rfc3339(),
            created_by_actor_id,
            hash_algorithm: "sha256".to_string(),
            segment_seal_max_bytes: DEFAULT_SEAL_MAX_BYTES,
            segment_seal_max_age_secs: DEFAULT_SEAL_MAX_AGE_SECS,
            feature_flags: BTreeMap::new(),
            required_features: vec![ATOMIC_CHANGE_EVENT_BATCHES.to_string()],
        }
    }

    /// The canonical whole-file bytes of this manifest (no trailing newline).
    pub fn canonical_bytes(&self) -> Result<Vec<u8>> {
        let value = serde_json::to_value(self)?;
        Ok(canonical_json_document(&value)?)
    }

    /// Write the manifest atomically (temp file + rename + directory fsync).
    pub fn write(&self, paths: &Paths) -> Result<()> {
        atomic_write(&paths.manifest(), &self.canonical_bytes()?)
    }

    /// Read and parse the manifest, applying format-v1 defaults for omitted
    /// optional fields. Unknown top-level keys are ignored (forward tolerance).
    pub fn read(paths: &Paths) -> Result<Self> {
        let bytes = std::fs::read(paths.manifest())?;
        let raw: RawManifest = serde_json::from_slice(&bytes)?;
        Ok(Self {
            workspace_format_version: raw.workspace_format_version,
            metamodel_package_version: raw.metamodel_package_version,
            workspace_id: raw.workspace_id,
            partition_id: raw.partition_id,
            created_at: raw.created_at,
            created_by_actor_id: raw.created_by_actor_id,
            hash_algorithm: raw.hash_algorithm.unwrap_or_else(|| "sha256".to_string()),
            segment_seal_max_bytes: raw.segment_seal_max_bytes.unwrap_or(DEFAULT_SEAL_MAX_BYTES),
            segment_seal_max_age_secs: raw
                .segment_seal_max_age_secs
                .unwrap_or(DEFAULT_SEAL_MAX_AGE_SECS),
            feature_flags: raw.feature_flags.unwrap_or_default(),
            required_features: raw.required_features.unwrap_or_default(),
        })
    }

    /// Enforce the refuse-or-degrade gates before opening read-write: format
    /// version, schema version, and required-feature support.
    pub fn check_supported_for_write(&self) -> Result<()> {
        if self.workspace_format_version > MAX_WORKSPACE_FORMAT_VERSION {
            return Err(StoreError::WorkspaceFormatTooNew {
                found: self.workspace_format_version,
                max: MAX_WORKSPACE_FORMAT_VERSION,
            });
        }
        if self.metamodel_package_version > MAX_METAMODEL_PACKAGE_VERSION {
            return Err(StoreError::SchemaTooNew {
                found: self.metamodel_package_version,
                max: MAX_METAMODEL_PACKAGE_VERSION,
            });
        }
        let unsupported: Vec<&str> = self
            .required_features
            .iter()
            .map(String::as_str)
            .filter(|f| !SUPPORTED_FEATURES.contains(f))
            .collect();
        if !unsupported.is_empty() {
            return Err(StoreError::UnsupportedFeature(unsupported.join(", ")));
        }
        Ok(())
    }
}

fn now_rfc3339() -> String {
    time::OffsetDateTime::now_utc()
        .format(&time::format_description::well_known::Rfc3339)
        .unwrap_or_else(|_| "1970-01-01T00:00:00Z".to_string())
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::str::FromStr;

    fn ids() -> (Id, Id) {
        (
            Id::from_str("00000000-0000-4000-8000-0000000000aa").unwrap(),
            Id::from_str("00000000-0000-4000-8000-000000000001").unwrap(),
        )
    }

    #[test]
    fn workspace_and_partition_ids_are_distinct() {
        let (w, p) = ids();
        let m = Manifest::new(w, p, None);
        assert_ne!(m.workspace_id, m.partition_id);
    }

    #[test]
    fn future_format_version_is_refused() {
        let (w, p) = ids();
        let mut m = Manifest::new(w, p, None);
        m.workspace_format_version = 99;
        assert!(matches!(
            m.check_supported_for_write(),
            Err(StoreError::WorkspaceFormatTooNew { found: 99, max: 1 })
        ));
    }

    #[test]
    fn required_feature_is_refused() {
        let (w, p) = ids();
        let mut m = Manifest::new(w, p, None);
        m.required_features = vec!["themis-access-policy-v1".into()];
        assert!(matches!(
            m.check_supported_for_write(),
            Err(StoreError::UnsupportedFeature(_))
        ));
    }

    #[test]
    fn canonical_bytes_have_no_trailing_newline() {
        let (w, p) = ids();
        let bytes = Manifest::new(w, p, None).canonical_bytes().unwrap();
        assert_ne!(bytes.last(), Some(&b'\n'));
    }
}
