pub fn add(a: i32, b: i32) -> i32 {
    a + b
}
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_add() {
        assert_eq!(add(2, 2), 4);
    }

    #[test]
    fn test_stateatpayload_camelcase_roundtrip() {
        // Incoming JSON uses camelCase keys
        let json_in = r#"{
            "asOf": "2025-01-01",
            "scenario": null,
            "confidence": null,
            "nodes": 7,
            "edges": 11
        }"#;
        let v: StateAtPayload = serde_json::from_str(json_in).expect("deserialize");
        assert_eq!(v.as_of, "2025-01-01");
        assert_eq!(v.nodes, 7);
        assert_eq!(v.edges, 11);

        // Outgoing JSON must keep camelCase
        let out = serde_json::to_string(&v).expect("serialize");
        assert!(out.contains("\"asOf\""), "must serialize camelCase asOf");
        assert!(out.contains("\"nodes\":7"));
        assert!(out.contains("\"edges\":11"));
    }
}

use bytes::Bytes;
use http_body_util::{BodyExt, Empty, Full};
use hyper::{Method, Request, StatusCode};
use hyper_util::client::legacy::Client;
use hyperlocal::{UnixConnector, Uri};
use log::{error, info, warn};
use serde::{Deserialize, Serialize};
use std::time::Duration;
use std::{
    path::PathBuf,
    process::{Command, Stdio},
};
use tauri::{AppHandle, Manager};

#[derive(Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct StateAtPayload {
    as_of: String,
    scenario: Option<String>,
    confidence: Option<f64>,
    nodes: u64,
    edges: u64,
}

#[tauri::command]
async fn temporal_state_at(
    app: AppHandle,
    as_of: String,
    scenario: Option<String>,
    confidence: Option<f64>,
) -> Result<StateAtPayload, String> {
    info!(
        "host: temporal_state_at as_of={} scenario={:?}",
        as_of, scenario
    );
    let state: &WorkerState = app.state::<WorkerState>().inner();
    // Create hyper client over UDS (request body type: Full<Bytes>)
    let client: Client<UnixConnector, Full<Bytes>> =
        Client::builder(hyper_util::rt::TokioExecutor::new()).build(UnixConnector);
    let payload = StateAtPayload {
        as_of,
        scenario,
        confidence,
        nodes: 0,
        edges: 0,
    };
    let json = serde_json::to_vec(&payload).map_err(|e| e.to_string())?;
    let uri: hyper::Uri = Uri::new(&state.sock_path, "/state_at").into();
    let req = Request::builder()
        .method(Method::POST)
        .uri(uri)
        .header("content-type", "application/json")
        .body(Full::<Bytes>::from(json))
        .map_err(|e| e.to_string())?;
    let resp = client.request(req).await.map_err(|e| {
        error!("host: worker request failed: {}", e);
        format!("worker request failed: {e}")
    })?;
    if resp.status() != StatusCode::OK {
        warn!("host: worker returned status {}", resp.status());
        return Err(format!("worker returned HTTP {}", resp.status()));
    }
    let collected = resp
        .into_body()
        .collect()
        .await
        .map_err(|e| e.to_string())?;
    let bytes = collected.to_bytes();
    let out = serde_json::from_slice::<StateAtPayload>(&bytes)
        .map_err(|e| format!("invalid worker response: {e}"))?;
    info!(
        "host: temporal_state_at ok nodes={} edges={}",
        out.nodes, out.edges
    );
    Ok(out)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            info!("host: setup starting worker");
            let sock = prepare_worker_and_spawn()?;
            info!("host: worker sock at {}", sock.display());
            app.manage(WorkerState { sock_path: sock });
            Ok(())
        })
        .plugin(tauri_plugin_opener::init())
        .plugin(
            tauri_plugin_log::Builder::default()
                .level(log::LevelFilter::Info)
                .build(),
        )
        .invoke_handler(tauri::generate_handler![temporal_state_at])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

struct WorkerState {
    sock_path: PathBuf,
}

fn prepare_worker_and_spawn() -> Result<PathBuf, String> {
    // Resolve repo root from crate dir: packages/host/ -> repo root
    let host_dir = PathBuf::from(env!("CARGO_MANIFEST_DIR"));
    let repo_root = host_dir
        .parent()
        .and_then(|p| p.parent())
        .ok_or("failed to resolve repo root")?
        .to_path_buf();
    let aideon_dir = repo_root.join(".aideon");
    std::fs::create_dir_all(&aideon_dir).map_err(|e| format!("mkdir .aideon failed: {e}"))?;
    let sock_path = aideon_dir.join("worker.sock");

    // Spawn the Python worker via scripts/uvpy to ensure deps
    let uvpy = repo_root.join("scripts").join("uvpy");
    if !uvpy.exists() {
        error!("host: uvpy helper not found at {}", uvpy.display());
        return Err(format!("uvpy helper not found at {}", uvpy.display()));
    }
    let worker_dir = repo_root.join("packages").join("worker");
    let mut cmd = Command::new(uvpy);
    // Ensure Python can import our package from src/ without installing
    let py_path = worker_dir.join("src");
    let existing_py = std::env::var("PYTHONPATH").unwrap_or_default();
    let combined_py = if existing_py.is_empty() {
        py_path.display().to_string()
    } else {
        format!("{}:{}", py_path.display(), existing_py)
    };
    cmd.env("PYTHONPATH", combined_py)
        .env("AIDEON_WORKER_SOCK", &sock_path)
        .env("AIDEON_WORKER_LOG", "INFO")
        .arg("python")
        .arg("-m")
        .arg("aideon_worker.server")
        .current_dir(&worker_dir)
        .stdout(Stdio::inherit())
        .stderr(Stdio::inherit());
    // Run from repo root so `uv run --with packages/worker` resolves correctly via uvpy
    cmd.current_dir(&repo_root);
    cmd.spawn().map_err(|e| {
        error!("host: spawn worker failed: {}", e);
        format!("spawn worker failed: {e}")
    })?;

    // Poll for readiness on /ping over UDS
    let rt = tokio::runtime::Runtime::new().map_err(|e| {
        error!("host: tokio runtime init failed: {}", e);
        e.to_string()
    })?;
    rt.block_on(async {
        let client: Client<UnixConnector, Empty<Bytes>> =
            Client::builder(hyper_util::rt::TokioExecutor::new()).build(UnixConnector);
        let start = std::time::Instant::now();
        loop {
            let uri: hyper::Uri = Uri::new(&sock_path, "/ping").into();
            let req = Request::builder()
                .method(Method::GET)
                .uri(uri)
                .body(Empty::<Bytes>::new())
                .map_err(|e| e.to_string())?;
            match client.request(req).await {
                Ok(r) if r.status() == StatusCode::OK => break,
                _ => {
                    if start.elapsed() > Duration::from_secs(5) {
                        error!("host: worker did not become ready in time");
                        return Err("worker did not become ready".to_string());
                    }
                    tokio::time::sleep(Duration::from_millis(100)).await;
                }
            }
        }
        Ok::<(), String>(())
    })?;

    Ok(sock_path)
}
