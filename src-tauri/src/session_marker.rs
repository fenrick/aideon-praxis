use serde::{Deserialize, Serialize};
use serde_json::to_string_pretty;
use std::{
    fs, io,
    path::{Path, PathBuf},
};
use time::{OffsetDateTime, format_description::well_known::Rfc3339};

#[derive(Debug, Serialize, Deserialize, PartialEq, Eq)]
pub struct SessionMarker {
    pub session_id: String,
    pub timestamp: String,
}

impl SessionMarker {
    fn new(session_id: String) -> Self {
        Self {
            session_id,
            timestamp: now_timestamp(),
        }
    }
}

fn now_timestamp() -> String {
    OffsetDateTime::now_utc()
        .format(&Rfc3339)
        .unwrap_or_else(|_| {
            OffsetDateTime::now_utc()
                .format(&Rfc3339)
                .unwrap_or_default()
        })
}

pub fn path_for_log_dir(log_dir: &Path) -> PathBuf {
    log_dir.join("session_in_progress.json")
}

pub fn previous_marker(path: &Path) -> Option<SessionMarker> {
    if !path.exists() {
        return None;
    }
    let contents = fs::read_to_string(path).ok();
    let marker = contents
        .as_deref()
        .and_then(|text| serde_json::from_str::<SessionMarker>(text).ok());
    let _ = fs::remove_file(path);
    marker
}

pub fn persist_marker(path: &Path, session_id: &str) -> io::Result<()> {
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent)?;
    }
    let marker = SessionMarker::new(session_id.to_string());
    let payload = to_string_pretty(&marker)?;
    fs::write(path, payload)?;
    Ok(())
}

pub fn clear_marker(path: &Path) -> io::Result<()> {
    if path.exists() {
        fs::remove_file(path)?;
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::tempdir;

    #[test]
    fn roundtrip_marker_storage() {
        let dir = tempdir().unwrap();
        let path = path_for_log_dir(dir.path());
        persist_marker(&path, "test-session").unwrap();
        assert!(path.exists());

        let recovered = previous_marker(&path).expect("should recover marker");
        assert_eq!(recovered.session_id, "test-session");
        assert!(!path.exists());
    }

    #[test]
    fn clearing_absent_marker_is_ok() {
        let dir = tempdir().unwrap();
        let path = path_for_log_dir(dir.path());
        assert!(clear_marker(&path).is_ok());
    }
}
