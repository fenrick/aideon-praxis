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
