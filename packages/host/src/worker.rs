use std::path::{Path, PathBuf};
use std::time::Duration as StdDuration;

use bytes::Bytes;
use http_body_util::Empty;
use hyper::{Method, Request, StatusCode};
use hyper_util::client::legacy::Client;
use hyperlocal::{UnixConnector, Uri};
use log::{error, info, warn};
use tauri::{AppHandle, Manager, Wry};
use tauri_plugin_shell::ShellExt;

pub struct WorkerState {
    sock_path: PathBuf,
}

impl WorkerState {
    pub fn new(sock_path: PathBuf) -> Self {
        Self { sock_path }
    }

    pub fn socket_path(&self) -> &Path {
        &self.sock_path
    }
}

pub async fn init_temporal(app: &AppHandle<Wry>) -> Result<(), String> {
    info!("host: setup starting worker");
    let sock = prepare_worker_and_spawn(app).await?;
    info!("host: worker sock at {}", sock.display());
    app.manage(WorkerState::new(sock));
    Ok(())
}

async fn prepare_worker_and_spawn(app: &AppHandle<Wry>) -> Result<PathBuf, String> {
    let host_dir = PathBuf::from(env!("CARGO_MANIFEST_DIR"));
    let repo_root = host_dir
        .parent()
        .and_then(|parent| parent.parent())
        .ok_or("failed to resolve repo root")?
        .to_path_buf();
    let aideon_dir = repo_root.join(".aideon");
    std::fs::create_dir_all(&aideon_dir)
        .map_err(|error| format!("mkdir .aideon failed: {error}"))?;
    let sock_path = aideon_dir.join("worker.sock");

    let uvpy = repo_root.join("scripts").join("uvpy");
    if !uvpy.exists() {
        error!("host: uvpy helper not found at {}", uvpy.display());
        return Err(format!("uvpy helper not found at {}", uvpy.display()));
    }

    let worker_dir = repo_root.join("packages").join("worker");
    let py_path = worker_dir.join("src");
    let existing_py = std::env::var("PYTHONPATH").unwrap_or_default();
    let combined_py = if existing_py.is_empty() {
        py_path.display().to_string()
    } else {
        format!("{}:{}", py_path.display(), existing_py)
    };

    let mut worker_started = false;
    {
        let sidecar_cmd = app
            .shell()
            .command("sidecar://aideon-worker")
            .env("AIDEON_WORKER_SOCK", sock_path.display().to_string())
            .env("AIDEON_WORKER_LOG", "INFO");
        match sidecar_cmd.spawn() {
            Ok(_) => {
                info!("host: launched worker via sidecar");
                worker_started = true;
            }
            Err(error) => {
                warn!("host: sidecar launch failed, falling back to uvpy: {error}");
            }
        }
    }

    if !worker_started {
        app.shell()
            .command(uvpy)
            .env("PYTHONPATH", combined_py)
            .env("AIDEON_WORKER_SOCK", sock_path.display().to_string())
            .env("AIDEON_WORKER_LOG", "INFO")
            .arg("python")
            .arg("-m")
            .arg("aideon_worker.server")
            .current_dir(worker_dir.clone())
            .spawn()
            .map_err(|error| format!("spawn worker (uvpy) failed: {error}"))?;
    }

    let client: Client<UnixConnector, Empty<Bytes>> =
        Client::builder(hyper_util::rt::TokioExecutor::new()).build(UnixConnector);
    let start = std::time::Instant::now();
    loop {
        let uri: hyper::Uri = Uri::new(&sock_path, "/ping").into();
        let request = Request::builder()
            .method(Method::GET)
            .uri(uri)
            .body(Empty::<Bytes>::new())
            .map_err(|error| error.to_string())?;
        match client.request(request).await {
            Ok(response) if response.status() == StatusCode::OK => break,
            _ => {
                if start.elapsed() > StdDuration::from_secs(5) {
                    error!("host: worker did not become ready in time");
                    return Err("worker did not become ready".to_string());
                }
                tokio::time::sleep(StdDuration::from_millis(100)).await;
            }
        }
    }

    Ok(sock_path)
}
