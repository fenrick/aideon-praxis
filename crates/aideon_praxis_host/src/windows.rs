#[cfg(target_os = "windows")]
use log::warn;
use tauri::{App, AppHandle, Manager, WebviewUrl, WebviewWindowBuilder, Wry};

pub fn create_windows(app: &App<Wry>) -> Result<(), String> {
    WebviewWindowBuilder::new(app, "splash", WebviewUrl::App("splash".into()))
        .title("Aideon Praxis — Loading")
        .resizable(false)
        .decorations(false)
        .inner_size(520.0, 320.0)
        .center()
        .build()
        .map_err(to_string)?;

    let main = WebviewWindowBuilder::new(app, "main", WebviewUrl::App("".into()))
        .title("Aideon Praxis")
        .visible(false)
        .inner_size(1060.0, 720.0)
        .center();

    #[cfg(target_os = "windows")]
    let main_window = main.build().map_err(to_string)?;
    #[cfg(not(target_os = "windows"))]
    {
        main.build().map_err(to_string)?;
    }

    #[cfg(target_os = "windows")]
    {
        if let Err(error) = window_vibrancy::apply_mica(&main_window, Some(true)) {
            warn!("host: failed to apply mica: {error}");
        }
    }

    Ok(())
}

#[tauri::command]
pub fn open_settings(app: AppHandle<Wry>) -> Result<(), String> {
    if let Some(window) = app.get_webview_window("settings") {
        let _ = window.set_focus();
        return Ok(());
    }

    WebviewWindowBuilder::new(&app, "settings", WebviewUrl::App("settings".into()))
        .title("Preferences")
        .resizable(false)
        .inner_size(520.0, 440.0)
        .center()
        .build()
        .map(|_| ())
        .map_err(to_string)
}

#[tauri::command]
pub fn open_about(app: AppHandle<Wry>) -> Result<(), String> {
    if let Some(window) = app.get_webview_window("about") {
        let _ = window.set_focus();
        return Ok(());
    }

    WebviewWindowBuilder::new(&app, "about", WebviewUrl::App("about".into()))
        .title("About Aideon Praxis")
        .resizable(false)
        .inner_size(420.0, 300.0)
        .center()
        .build()
        .map(|_| ())
        .map_err(to_string)
}

#[tauri::command]
pub fn open_status(app: AppHandle<Wry>) -> Result<(), String> {
    if let Some(window) = app.get_webview_window("status") {
        let _ = window.set_focus();
        return Ok(());
    }

    WebviewWindowBuilder::new(&app, "status", WebviewUrl::App("status".into()))
        .title("Status")
        .resizable(false)
        .always_on_top(true)
        .inner_size(360.0, 140.0)
        .center()
        .build()
        .map(|_| ())
        .map_err(to_string)
}

#[tauri::command]
pub fn open_styleguide(app: AppHandle<Wry>) -> Result<(), String> {
    log::info!("host: open_styleguide requested");
    if let Some(window) = app.get_webview_window("styleguide") {
        let _ = window.set_focus();
        return Ok(());
    }

    WebviewWindowBuilder::new(&app, "styleguide", WebviewUrl::App("styleguide".into()))
        .title("UI Style Guide")
        .resizable(true)
        .inner_size(900.0, 700.0)
        .center()
        .build()
        .map(|_| ())
        .map_err(to_string)
}

fn to_string<E: std::fmt::Display>(error: E) -> String {
    error.to_string()
}
