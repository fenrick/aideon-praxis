use bytes::Bytes;
use http_body_util::{BodyExt, Full};
use hyper::{Method, Request, StatusCode};
use hyper_util::client::legacy::Client;
use hyperlocal::{UnixConnector, Uri};
use log::{error, info, warn};
use serde::{Deserialize, Serialize};
use tauri::State;

use crate::worker::WorkerState;

/// Payload for temporal `state_at` requests and responses. Field names are
/// serialized in camelCase to match the public API contract.
#[derive(Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct StateAtPayload {
    as_of: String,
    scenario: Option<String>,
    confidence: Option<f64>,
    nodes: u64,
    edges: u64,
}

#[tauri::command]
pub async fn temporal_state_at(
    state: State<'_, WorkerState>,
    as_of: String,
    scenario: Option<String>,
    confidence: Option<f64>,
) -> Result<StateAtPayload, String> {
    info!(
        "host: temporal_state_at as_of={} scenario={:?}",
        as_of, scenario
    );
    let worker_state = state.inner();

    let client: Client<UnixConnector, Full<Bytes>> =
        Client::builder(hyper_util::rt::TokioExecutor::new()).build(UnixConnector);
    let payload = StateAtPayload {
        as_of,
        scenario,
        confidence,
        nodes: 0,
        edges: 0,
    };
    let json = serde_json::to_vec(&payload).map_err(|error| error.to_string())?;
    let uri: hyper::Uri = Uri::new(worker_state.socket_path(), "/state_at").into();
    let request = Request::builder()
        .method(Method::POST)
        .uri(uri)
        .header("content-type", "application/json")
        .body(Full::<Bytes>::from(json))
        .map_err(|error| error.to_string())?;
    let response = client.request(request).await.map_err(|error| {
        error!("host: worker request failed: {error}");
        format!("worker request failed: {error}")
    })?;

    if response.status() != StatusCode::OK {
        warn!("host: worker returned status {}", response.status());
        return Err(format!("worker returned HTTP {}", response.status()));
    }

    let collected = response
        .into_body()
        .collect()
        .await
        .map_err(|error| error.to_string())?;
    let bytes = collected.to_bytes();
    let output = serde_json::from_slice::<StateAtPayload>(&bytes)
        .map_err(|error| format!("invalid worker response: {error}"))?;
    info!(
        "host: temporal_state_at ok nodes={} edges={}",
        output.nodes, output.edges
    );
    Ok(output)
}
