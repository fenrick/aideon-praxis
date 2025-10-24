//! Aideon Praxis Tauri host entrypoint and IPC commands.
//!
//! Responsibilities:
//! - Show a splashscreen while performing host/worker setup.
//! - Spawn and health‑check the Python worker over Unix Domain Socket (UDS).
//! - Expose minimal, typed Tauri commands used by the renderer (no backend
//!   logic in the renderer).
//! - Keep boundaries strict: renderer ↔ host via IPC; host ↔ worker via UDS.
//!
//! Notes:
//! - Desktop mode opens no TCP ports; the worker is reachable only through a
//!   filesystem socket path stored in [`WorkerState`].
//! - We prefer simple, testable helpers over complex setup flows to align with
//!   the splashscreen guide and keep startup deterministic.
//!
//! Design Decisions:
//! - Use a single `invoke_handler` listing to avoid command registration
//!   conflicts when adding features like the splashscreen handler.
//! - Inject shared state via `tauri::State` (e.g., [`WorkerState`]) instead of
//!   repeated `AppHandle` lookups to make commands easier to test and reason
//!   about.
//! - Prefer Unix Domain Sockets over TCP for the worker in desktop mode to
//!   preserve the "no open ports" security posture and simplify firewalling.
//! - Poll worker readiness via `/ping` with a short timeout to fail fast during
//!   startup; keep the timeout conservative (5s) so the splashscreen doesn't
//!   appear stuck.
use bytes::Bytes;
use http_body_util::{BodyExt, Empty, Full};
use hyper::{Method, Request, StatusCode};
use hyper_util::client::legacy::Client;
use hyperlocal::{UnixConnector, Uri};
use log::{error, info, warn};
use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use std::time::Duration as StdDuration;
use tauri::menu::{Menu, MenuItem, PredefinedMenuItem, Submenu};
use tauri::{AppHandle, Manager};
use tauri::{WebviewUrl, WebviewWindowBuilder};
use tauri_plugin_shell::ShellExt;

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

// Import functionalities we'll be using
// chrono is used for ISO-8601 timestamps in unified logs
// use std::io::Write; // removed with custom log sink
use std::sync::Mutex;
use tauri::State;
use tauri::async_runtime::spawn;
use tokio::time::sleep;

/// Tracks splashscreen setup progress. The splash closes once both flags are
/// set to true (see [`set_complete`]).
struct SetupState {
    frontend_task: bool,
    backend_task: bool,
}

// unified log state removed; tauri-plugin-log is the sink

/// Tauri command: proxy a temporal `state_at` request to the worker over UDS.
///
/// Errors are surfaced as strings suitable for the renderer to display.
///
/// Design:
/// - Use `hyper` client with `hyperlocal` so we can keep a single code path for
///   HTTP/1 over UDS (desktop) and optionally HTTP/1 over TCP (server mode) in
///   the future without changing the renderer contract.
/// - Serialize with stable camelCase keys to match external API and tests.
#[tauri::command]
async fn temporal_state_at(
    state: State<'_, WorkerState>,
    as_of: String,
    scenario: Option<String>,
    confidence: Option<f64>,
) -> Result<StateAtPayload, String> {
    info!(
        "host: temporal_state_at as_of={} scenario={:?}",
        as_of, scenario
    );
    let state: &WorkerState = state.inner();
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
    // Builder uses the setup hook; we create windows and menu inside setup
    // We keep commands minimal and avoid duplicate invoke_handler calls.
    //
    // Design: execute setup asynchronously so the windows can be constructed
    // early and the splashscreen remains responsive.
    tauri::Builder::default()
        .plugin(
            tauri_plugin_log::Builder::new()
                .clear_targets()
                .target(tauri_plugin_log::Target::new(
                    tauri_plugin_log::TargetKind::Stdout,
                ))
                .level(tauri_plugin_log::log::LevelFilter::Info)
                .build(),
        )
        // Register a `State` to be managed by Tauri
        // We need write access to it so we wrap it in a `Mutex`
        .manage(Mutex::new(SetupState {
            frontend_task: false,
            backend_task: false,
        }))
        // Use the setup hook to execute setup related tasks
        // Runs before the main loop, so no windows are yet created
        .setup(|app| {
            // Build native menu per-platform (best-effort)
            let _ = build_menu(app);
            // Dispatch menu events to commands
            app.on_menu_event(|app, e| match e.id().as_ref() {
                "about" => {
                    let _ = open_about(app.clone());
                }
                "preferences" => {
                    let _ = open_settings(app.clone());
                }
                "help.about" => {
                    let _ = open_about(app.clone());
                }
                _ => {}
            });

            // Create splash and main windows with platform-specific chrome
            create_windows(app)?;

            // (logging handled by tauri-plugin-log)

            // Spawn async backend setup, keep UI responsive
            spawn(setup(app.handle().clone()));
            Ok(())
        })
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_shell::init())
        // One invoke_handler listing all commands to avoid conflicts
        .invoke_handler(tauri::generate_handler![
            greet,
            set_complete,
            temporal_state_at,
            open_about,
            open_settings,
            open_status,
            get_setup_state
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

fn build_menu(app: &tauri::App) -> Result<(), String> {
    let menu = Menu::new(app).map_err(|e| e.to_string())?;
    #[cfg(target_os = "macos")]
    {
        let about = PredefinedMenuItem::about(app, None, None).map_err(|e| e.to_string())?;
        let prefs =
            MenuItem::new(app, "preferences", true, None::<&str>).map_err(|e| e.to_string())?;
        let quit = PredefinedMenuItem::quit(app, None).map_err(|e| e.to_string())?;
        let app_sub = Submenu::new(app, "Aideon Praxis", true).map_err(|e| e.to_string())?;
        app_sub.append(&about).map_err(|e| e.to_string())?;
        app_sub.append(&prefs).map_err(|e| e.to_string())?;
        app_sub.append(&quit).map_err(|e| e.to_string())?;
        menu.append(&app_sub).map_err(|e| e.to_string())?;

        // Edit menu (standard items)
        let edit = Submenu::new(app, "Edit", true).map_err(|e| e.to_string())?;
        edit.append(&PredefinedMenuItem::undo(app, None).map_err(|e| e.to_string())?)
            .map_err(|e| e.to_string())?;
        edit.append(&PredefinedMenuItem::redo(app, None).map_err(|e| e.to_string())?)
            .map_err(|e| e.to_string())?;
        edit.append(&PredefinedMenuItem::cut(app, None).map_err(|e| e.to_string())?)
            .map_err(|e| e.to_string())?;
        edit.append(&PredefinedMenuItem::copy(app, None).map_err(|e| e.to_string())?)
            .map_err(|e| e.to_string())?;
        edit.append(&PredefinedMenuItem::paste(app, None).map_err(|e| e.to_string())?)
            .map_err(|e| e.to_string())?;
        edit.append(&PredefinedMenuItem::select_all(app, None).map_err(|e| e.to_string())?)
            .map_err(|e| e.to_string())?;
        menu.append(&edit).map_err(|e| e.to_string())?;

        // Window menu
        let window_m = Submenu::new(app, "Window", true).map_err(|e| e.to_string())?;
        window_m
            .append(&PredefinedMenuItem::minimize(app, None).map_err(|e| e.to_string())?)
            .map_err(|e| e.to_string())?;
        window_m
            .append(&PredefinedMenuItem::fullscreen(app, None).map_err(|e| e.to_string())?)
            .map_err(|e| e.to_string())?;
        // macOS-specific window/application visibility
        window_m
            .append(&PredefinedMenuItem::hide(app, None).map_err(|e| e.to_string())?)
            .map_err(|e| e.to_string())?;
        window_m
            .append(&PredefinedMenuItem::hide_others(app, None).map_err(|e| e.to_string())?)
            .map_err(|e| e.to_string())?;
        window_m
            .append(&PredefinedMenuItem::show_all(app, None).map_err(|e| e.to_string())?)
            .map_err(|e| e.to_string())?;
        window_m
            .append(&PredefinedMenuItem::close_window(app, None).map_err(|e| e.to_string())?)
            .map_err(|e| e.to_string())?;
        menu.append(&window_m).map_err(|e| e.to_string())?;

        // Help menu (About appears under app menu on macOS so omit here)
        let help = Submenu::new(app, "Help", true).map_err(|e| e.to_string())?;
        menu.append(&help).map_err(|e| e.to_string())?;
    }
    #[cfg(not(target_os = "macos"))]
    {
        let file = Submenu::new(app, "File", false).map_err(|e| e.to_string())?;
        let quit =
            MenuItem::new(app, "file.quit", true, None::<&str>).map_err(|e| e.to_string())?;
        file.append(&quit).map_err(|e| e.to_string())?;
        menu.append(&file).map_err(|e| e.to_string())?;

        let settings = Submenu::new(app, "Settings", false).map_err(|e| e.to_string())?;
        let prefs =
            MenuItem::new(app, "preferences", true, None::<&str>).map_err(|e| e.to_string())?;
        settings.append(&prefs).map_err(|e| e.to_string())?;
        menu.append(&settings).map_err(|e| e.to_string())?;

        // Edit menu (standard items)
        let edit = Submenu::new(app, "Edit", false).map_err(|e| e.to_string())?;
        edit.append(&PredefinedMenuItem::undo(app, None).map_err(|e| e.to_string())?)
            .map_err(|e| e.to_string())?;
        edit.append(&PredefinedMenuItem::redo(app, None).map_err(|e| e.to_string())?)
            .map_err(|e| e.to_string())?;
        edit.append(&PredefinedMenuItem::cut(app, None).map_err(|e| e.to_string())?)
            .map_err(|e| e.to_string())?;
        edit.append(&PredefinedMenuItem::copy(app, None).map_err(|e| e.to_string())?)
            .map_err(|e| e.to_string())?;
        edit.append(&PredefinedMenuItem::paste(app, None).map_err(|e| e.to_string())?)
            .map_err(|e| e.to_string())?;
        edit.append(&PredefinedMenuItem::select_all(app, None).map_err(|e| e.to_string())?)
            .map_err(|e| e.to_string())?;
        menu.append(&edit).map_err(|e| e.to_string())?;

        // Window menu (subset on non-macOS)
        let window_m = Submenu::new(app, "Window", false).map_err(|e| e.to_string())?;
        window_m
            .append(&PredefinedMenuItem::minimize(app, None).map_err(|e| e.to_string())?)
            .map_err(|e| e.to_string())?;
        // maximize/fullscreen availability may vary; include fullscreen toggle
        window_m
            .append(&PredefinedMenuItem::fullscreen(app, None).map_err(|e| e.to_string())?)
            .map_err(|e| e.to_string())?;
        window_m
            .append(&PredefinedMenuItem::close_window(app, None).map_err(|e| e.to_string())?)
            .map_err(|e| e.to_string())?;
        menu.append(&window_m).map_err(|e| e.to_string())?;

        // Help menu with About
        let help = Submenu::new(app, "Help", false).map_err(|e| e.to_string())?;
        let about_open =
            MenuItem::new(app, "help.about", true, Some("About")).map_err(|e| e.to_string())?;
        help.append(&about_open).map_err(|e| e.to_string())?;
        menu.append(&help).map_err(|e| e.to_string())?;
    }
    app.set_menu(menu).map_err(|e| e.to_string())?;
    Ok(())
}

fn create_windows(app: &tauri::App) -> Result<(), String> {
    // Splash window (shown during initialisation)
    WebviewWindowBuilder::new(app, "splash", WebviewUrl::App("splash.html".into()))
        .title("Aideon Praxis — Loading")
        .resizable(false)
        .decorations(false)
        .inner_size(520.0, 320.0)
        .center()
        .build()
        .map_err(|e| e.to_string())?;

    // Main window (hidden until setup completes)
    let main = WebviewWindowBuilder::new(app, "main", WebviewUrl::default())
        .title("Aideon Praxis")
        .visible(false)
        .inner_size(1060.0, 720.0)
        .center();

    // Use native decorations for the main window across platforms.
    #[cfg(target_os = "windows")]
    let main_w = main.build().map_err(|e| e.to_string())?;
    #[cfg(not(target_os = "windows"))]
    {
        let _ = main.build().map_err(|e| e.to_string())?;
    }

    #[cfg(target_os = "windows")]
    {
        if let Err(e) = window_vibrancy::apply_mica(&main_w, Some(true)) {
            warn!("host: failed to apply mica: {}", e);
        }
    }

    Ok(())
}

// custom log sink removed

#[tauri::command]
fn open_settings(app: AppHandle) -> Result<(), String> {
    if let Some(win) = app.get_webview_window("settings") {
        let _ = win.set_focus();
        return Ok(());
    }
    WebviewWindowBuilder::new(&app, "settings", WebviewUrl::App("settings.html".into()))
        .title("Preferences")
        .resizable(false)
        .inner_size(520.0, 440.0)
        .center()
        .build()
        .map(|_| ())
        .map_err(|e| e.to_string())
}

/// Simple sample command used by tests and smoke checks.
#[tauri::command]
fn greet(name: String) -> String {
    format!("Hello {name} from Rust!")
}

/// Mark a setup task as complete ("frontend" or "backend"). When both are
/// finished, closes the splashscreen and shows the main window.
///
/// Design:
/// - We gate window visibility on both phases to avoid rendering the main UI
///   before the worker is ready; this prevents early IPC failures.
#[tauri::command]
async fn set_complete(
    app: AppHandle,
    state: State<'_, Mutex<SetupState>>,
    task: String,
) -> Result<(), String> {
    // Lock the state without write access
    let mut state_lock = state.lock().unwrap();
    match task.as_str() {
        "frontend" => {
            info!("host: set_complete(frontend)");
            state_lock.frontend_task = true
        }
        "backend" => {
            info!("host: set_complete(backend)");
            state_lock.backend_task = true
        }
        other => {
            warn!("host: set_complete called with invalid task '{}'", other);
            return Err("invalid task".into());
        }
    }
    // Check if both tasks are completed
    if state_lock.backend_task && state_lock.frontend_task {
        info!("host: setup complete; closing splash and showing main window");
        // Close splash, then show main window
        if let Some(splash) = app.get_webview_window("splash") {
            let _ = splash.close();
        }
        // Show main window (idempotent)
        if let Some(main_window) = app.get_webview_window("main") {
            if let Err(e) = main_window.show() {
                warn!("host: failed showing main window: {}", e);
            }
            let _ = main_window.set_focus();
        } else {
            warn!("host: main window not found when completing setup");
        }
    }
    Ok(())
}

#[derive(Serialize)]
struct SetupFlags {
    frontend: bool,
    backend: bool,
}

#[tauri::command]
fn get_setup_state(state: State<'_, Mutex<SetupState>>) -> Result<SetupFlags, String> {
    let s = state.lock().unwrap();
    Ok(SetupFlags {
        frontend: s.frontend_task,
        backend: s.backend_task,
    })
}

/// Async setup routine executed during the splashscreen phase.
///
/// - Starts the worker and registers its socket path in [`WorkerState`].
/// - Simulates additional backend work and then marks the backend phase done.
///
/// Design:
/// - Keep setup side-effects isolated to this function and helpers; avoid
///   scattering spawn logic across the codebase.
async fn setup(app: AppHandle) -> Result<(), ()> {
    // Initialize temporal worker and app state (moved into a helper)
    init_temporal(&app).await.map_err(|_| ())?;

    // Fake performing some heavy action for 3 seconds
    info!("Performing really heavy backend setup task...");
    sleep(StdDuration::from_secs(3)).await;
    info!("Backend setup task completed!");

    // Set the backend task as being completed
    set_complete(
        app.clone(),
        app.state::<Mutex<SetupState>>(),
        "backend".to_string(),
    )
    .await
    .map_err(|e| {
        error!("host: set_complete backend failed: {}", e);
    })?;
    Ok(())
}

/// Global application state for the worker socket path. This is read by
/// commands that proxy requests to the worker.
///
/// Design:
/// - Limit host-global state to the minimal data needed (socket path). This
///   reduces coupling and makes commands straightforward to unit test.
struct WorkerState {
    sock_path: PathBuf,
}

/// Initialize the temporal worker and register the [`WorkerState`] so commands
/// can reach it over UDS.
///
/// Design:
/// - Resolve paths relative to the repo root to keep dev and packaged builds
///   consistent when launching the Python worker via `scripts/uvpy`.
async fn init_temporal(app: &AppHandle) -> Result<(), String> {
    info!("host: setup starting worker");
    let sock = prepare_worker_and_spawn(app).await?;
    info!("host: worker sock at {}", sock.display());
    app.manage(WorkerState { sock_path: sock });
    Ok(())
}

/// Spawn the Python worker process via the `scripts/uvpy` helper, then wait
/// until it responds `200 OK` on `/ping` over UDS.
///
/// Returns the resolved socket path once the worker is ready.
///
/// Design:
/// - Use `uvpy` to ensure a hermetic Python environment without involving
///   network during startup; inherit stdio for transparent logging.
/// - Avoid creating our own Tokio runtime; reuse the ambient runtime provided
///   by Tauri to reduce complexity.
async fn prepare_worker_and_spawn(app: &AppHandle) -> Result<PathBuf, String> {
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
    // Ensure Python can import our package from src/ without installing
    let py_path = worker_dir.join("src");
    let existing_py = std::env::var("PYTHONPATH").unwrap_or_default();
    let combined_py = if existing_py.is_empty() {
        py_path.display().to_string()
    } else {
        format!("{}:{}", py_path.display(), existing_py)
    };
    // Preferred: launch packaged sidecar if available; fallback to uvpy for dev.
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
            Err(e) => {
                warn!("host: sidecar launch failed, falling back to uvpy: {}", e);
            }
        }
    }

    if !worker_started {
        // Use tauri-plugin-shell to launch the uvpy helper with an allowlisted command (dev)
        let shell_cmd = app
            .shell()
            .command(uvpy)
            .env("PYTHONPATH", combined_py)
            .env("AIDEON_WORKER_SOCK", sock_path.display().to_string())
            .env("AIDEON_WORKER_LOG", "INFO")
            .arg("python")
            .arg("-m")
            .arg("aideon_worker.server")
            .current_dir(worker_dir.clone());
        shell_cmd
            .spawn()
            .map_err(|e| format!("spawn worker (uvpy) failed: {e}"))?;
    }

    // Poll for readiness on /ping over UDS using the ambient runtime (Tokio
    // provided by Tauri). Avoid spawning a separate runtime to keep startup
    // simple and resource usage low.
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

/// Open or focus the About window rendered from a static HTML page.
///
/// Design:
/// - Use a static HTML asset (served by dev server or bundled) to avoid
///   external requests and keep CSP strict.
#[tauri::command]
fn open_about(app: AppHandle) -> Result<(), String> {
    if let Some(win) = app.get_webview_window("about") {
        let _ = win.set_focus();
        return Ok(());
    }
    // Use static about page served by Vite/dev or dist (public/about.html)
    WebviewWindowBuilder::new(&app, "about", WebviewUrl::App("about.html".into()))
        .title("About Aideon Praxis")
        .resizable(false)
        .inner_size(420.0, 300.0)
        .center()
        .build()
        .map(|_| ())
        .map_err(|e| e.to_string())
}

/// Open or focus a compact Status window rendered from a static HTML page.
#[tauri::command]
fn open_status(app: AppHandle) -> Result<(), String> {
    if let Some(win) = app.get_webview_window("status") {
        let _ = win.set_focus();
        return Ok(());
    }
    WebviewWindowBuilder::new(&app, "status", WebviewUrl::App("status.html".into()))
        .title("Status")
        .resizable(false)
        .always_on_top(true)
        .inner_size(360.0, 140.0)
        .center()
        .build()
        .map(|_| ())
        .map_err(|e| e.to_string())
}
