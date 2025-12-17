use std::fs;
use std::path::{Path, PathBuf};

use serde::{Deserialize, Serialize};

use crate::{MnemeError, MnemeResult};

const DEFAULT_DB_NAME: &str = "praxis.sqlite";
const STATE_FILE: &str = "datastore.json";

#[derive(Serialize, Deserialize)]
struct DatastoreState {
    name: String,
}

pub fn create_datastore(base: &Path, preferred_name: Option<&str>) -> MnemeResult<PathBuf> {
    fs::create_dir_all(base)
        .map_err(|err| MnemeError::storage(format!("create base dir: {err}")))?;
    let name = preferred_name
        .map(|value| value.to_string())
        .or_else(|| read_state(base))
        .unwrap_or_else(|| DEFAULT_DB_NAME.to_string());
    let path = base.join(&name);
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent)
            .map_err(|err| MnemeError::storage(format!("create parent: {err}")))?;
    }
    if !path.exists() {
        fs::File::create(&path)
            .map_err(|err| MnemeError::storage(format!("create db file: {err}")))?;
    }
    write_state(base, &name)?;
    Ok(path)
}

/// Resolve the datastore path without mutating the filesystem.
///
/// This helper first consults the persisted `datastore.json` metadata written by
/// `create_datastore`. If that file is missing, the default `praxis.sqlite`
/// name is used as long as the file already exists on disk. Callers that expect
/// the datastore to be provisioned ahead of time can rely on this function to
/// fail fast instead of accidentally creating a new, empty database.
pub fn datastore_path(base: &Path) -> MnemeResult<PathBuf> {
    if let Some(name) = read_state(base) {
        let candidate = base.join(&name);
        if candidate.exists() {
            return Ok(candidate);
        }
    }

    let default_path = base.join(DEFAULT_DB_NAME);
    if default_path.exists() {
        return Ok(default_path);
    }

    Err(MnemeError::storage(format!(
        "datastore missing under '{}'; run create_datastore first",
        base.display()
    )))
}

fn read_state(base: &Path) -> Option<String> {
    let state_path = base.join(STATE_FILE);
    let data = fs::read_to_string(state_path).ok()?;
    let state: DatastoreState = serde_json::from_str(&data).ok()?;
    Some(state.name)
}

fn write_state(base: &Path, name: &str) -> MnemeResult<()> {
    let state = DatastoreState {
        name: name.to_string(),
    };
    let path = base.join(STATE_FILE);
    fs::write(
        &path,
        serde_json::to_string_pretty(&state)
            .map_err(|err| MnemeError::storage(format!("serialize state: {err}")))?,
    )
    .map_err(|err| MnemeError::storage(format!("write state file: {err}")))
}

#[cfg(test)]
mod tests {
    use super::{DEFAULT_DB_NAME, create_datastore, datastore_path};
    use std::fs;
    use tempfile::tempdir;

    #[test]
    fn resolves_path_from_state_file() {
        let dir = tempdir().expect("tempdir");
        let base = dir.path();
        let custom = "custom.sqlite";
        let path = create_datastore(base, Some(custom)).expect("create ok");
        assert!(path.exists());

        let resolved = datastore_path(base).expect("resolve path");
        assert_eq!(resolved, base.join(custom));
    }

    #[test]
    fn falls_back_to_default_when_state_missing() {
        let dir = tempdir().expect("tempdir");
        let base = dir.path();
        let default = base.join(DEFAULT_DB_NAME);
        fs::create_dir_all(base).expect("mkdir");
        fs::write(&default, b"sqlite").expect("touch db");

        let resolved = datastore_path(base).expect("resolve default");
        assert_eq!(resolved, default);
    }

    #[test]
    fn errors_when_no_datastore_present() {
        let dir = tempdir().expect("tempdir");
        let base = dir.path();
        let err = datastore_path(base).expect_err("should fail");
        assert!(err.to_string().contains("datastore"));
    }
}
