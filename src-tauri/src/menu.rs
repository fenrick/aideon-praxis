use serde::Serialize;
use serde_json::json;
use tauri::{
    App, AppHandle, Emitter, Manager, Runtime,
    menu::{Menu, MenuEvent, MenuItem, MenuItemBuilder, PredefinedMenuItem, Submenu},
};
use tauri_plugin_dialog::DialogExt;

use crate::contracts::EVENT_SHELL_COMMAND;
use crate::shell_commands::{
    SHELL_COMMAND_FILE_OPEN, SHELL_COMMAND_FILE_PRINT, SHELL_COMMAND_FILE_SAVE_AS,
    SHELL_COMMAND_OPEN_COMMAND_PALETTE, SHELL_COMMAND_TOGGLE_INSPECTOR,
    SHELL_COMMAND_TOGGLE_NAVIGATION,
};
use crate::windows::{open_about, open_settings, open_styleguide};

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "snake_case")]
struct ShellCommandPayload {
    command: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    payload: Option<serde_json::Value>,
}

#[derive(Clone, Debug, Default)]
pub struct MenuIds {
    pub styleguide: String,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
enum MenuAction {
    OpenAbout,
    OpenSettings,
    OpenStyleguide,
    EmitShellCommand(&'static str),
    PickOpenFile,
    PickSaveFile,
    Quit,
    Noop,
}

fn classify_menu_event(event_id: &str, styleguide_id: &str) -> MenuAction {
    match event_id {
        "about" | "help_about" => MenuAction::OpenAbout,
        "preferences" => MenuAction::OpenSettings,
        "view_toggle_navigation" => MenuAction::EmitShellCommand(SHELL_COMMAND_TOGGLE_NAVIGATION),
        "view_toggle_inspector" => MenuAction::EmitShellCommand(SHELL_COMMAND_TOGGLE_INSPECTOR),
        "view_command_palette" => MenuAction::EmitShellCommand(SHELL_COMMAND_OPEN_COMMAND_PALETTE),
        "file_open" => MenuAction::PickOpenFile,
        "file_save_as" => MenuAction::PickSaveFile,
        "file_print" => MenuAction::EmitShellCommand(SHELL_COMMAND_FILE_PRINT),
        "file_quit" => MenuAction::Quit,
        _ if !styleguide_id.is_empty() && event_id == styleguide_id => MenuAction::OpenStyleguide,
        _ => MenuAction::Noop,
    }
}

pub fn build_menu<R: Runtime>(app: &App<R>) -> Result<(), String> {
    let menu = Menu::new(app).map_err(to_string)?;
    let mut ids = MenuIds::default();

    #[cfg(target_os = "macos")]
    {
        mac::install(app, &menu, &mut ids)?;
    }

    #[cfg(not(target_os = "macos"))]
    {
        desktop::install(app, &menu, &mut ids)?;
    }

    app.set_menu(menu).map_err(to_string)?;
    app.manage(ids);
    Ok(())
}

pub fn handle_menu_event<R: Runtime>(app: &AppHandle<R>, event: MenuEvent) {
    log::info!("menu: event id={:?}", event.id());

    let ids = app.state::<MenuIds>();
    match classify_menu_event(event.id().as_ref(), &ids.styleguide) {
        MenuAction::OpenAbout => {
            log::info!("menu: open about");
            let _ = open_about(app.clone());
        }
        MenuAction::OpenSettings => {
            log::info!("menu: open settings");
            let _ = open_settings(app.clone());
        }
        MenuAction::OpenStyleguide => {
            log::info!("menu: open styleguide via resolved id");
            let _ = open_styleguide(app.clone());
        }
        MenuAction::EmitShellCommand(command) => emit_shell_command(app, command),
        MenuAction::PickOpenFile => pick_open_file(app),
        MenuAction::PickSaveFile => pick_save_file(app),
        MenuAction::Quit => {
            log::info!("menu: file_quit");
            app.exit(0);
        }
        MenuAction::Noop => {}
    }
}

fn emit_shell_command<R: Runtime>(app: &AppHandle<R>, command: &str) {
    emit_shell_command_with_payload(app, command, None);
}

fn emit_shell_command_with_payload<R: Runtime>(
    app: &AppHandle<R>,
    command: &str,
    payload: Option<serde_json::Value>,
) {
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.emit(
            EVENT_SHELL_COMMAND,
            ShellCommandPayload {
                command: command.to_string(),
                payload,
            },
        );
    }
}

fn pick_open_file<R: Runtime>(app: &AppHandle<R>) {
    let handle = app.clone();
    handle
        .dialog()
        .file()
        .pick_file(move |file| emit_picked_path(&handle, SHELL_COMMAND_FILE_OPEN, file));
}

fn pick_save_file<R: Runtime>(app: &AppHandle<R>) {
    let handle = app.clone();
    handle
        .dialog()
        .file()
        .save_file(move |file| emit_picked_path(&handle, SHELL_COMMAND_FILE_SAVE_AS, file));
}

fn emit_picked_path<R: Runtime>(
    app: &AppHandle<R>,
    command: &'static str,
    file: Option<tauri_plugin_dialog::FilePath>,
) {
    if let Some(file) = file {
        let path = file.to_string();
        emit_shell_command_with_payload(app, command, Some(json!({ "path": path })));
    }
}

fn to_string<E: std::fmt::Display>(error: E) -> String {
    error.to_string()
}

#[cfg(test)]
#[path = "../tests/internal/menu_tests.rs"]
mod tests;

fn build_menu_item<R: Runtime>(
    app: &App<R>,
    id: &str,
    label: &str,
    accelerator: Option<&str>,
) -> Result<MenuItem<R>, String> {
    let mut builder = MenuItemBuilder::with_id(id, label);
    if let Some(accelerator) = accelerator {
        builder = builder.accelerator(accelerator);
    }
    builder.build(app).map_err(to_string)
}

fn append_file_items<R: Runtime>(app: &App<R>, file: &Submenu<R>) -> Result<(), String> {
    file.append(&build_menu_item(
        app,
        "file_open",
        "Open…",
        Some("CmdOrCtrl+O"),
    )?)
    .map_err(to_string)?;
    file.append(&build_menu_item(
        app,
        "file_save_as",
        "Save As…",
        Some("CmdOrCtrl+Shift+S"),
    )?)
    .map_err(to_string)?;
    file.append(&build_menu_item(
        app,
        "file_print",
        "Print…",
        Some("CmdOrCtrl+P"),
    )?)
    .map_err(to_string)?;
    Ok(())
}

fn append_view_items<R: Runtime>(
    app: &App<R>,
    view: &Submenu<R>,
    separator_after_palette: bool,
) -> Result<(), String> {
    view.append(&build_menu_item(
        app,
        "view_command_palette",
        "Command Palette…",
        Some("CmdOrCtrl+K"),
    )?)
    .map_err(to_string)?;
    if separator_after_palette {
        view.append(&PredefinedMenuItem::separator(app).map_err(to_string)?)
            .map_err(to_string)?;
    }
    view.append(&build_menu_item(
        app,
        "view_toggle_navigation",
        "Toggle Navigation",
        Some("CmdOrCtrl+B"),
    )?)
    .map_err(to_string)?;
    view.append(&build_menu_item(
        app,
        "view_toggle_inspector",
        "Toggle Inspector",
        Some("CmdOrCtrl+I"),
    )?)
    .map_err(to_string)?;
    Ok(())
}

fn append_debug_submenu<R: Runtime>(
    app: &App<R>,
    menu: &Menu<R>,
    ids: &mut MenuIds,
    enabled: bool,
) -> Result<(), String> {
    if !cfg!(debug_assertions) {
        return Ok(());
    }
    let debug = Submenu::new(app, "Debug", enabled).map_err(to_string)?;
    let style_item = build_menu_item(app, "debug_styleguide", "UI Style Guide", None)?;
    ids.styleguide = style_item.id().as_ref().to_string();
    debug.append(&style_item).map_err(to_string)?;
    menu.append(&debug).map_err(to_string)?;
    Ok(())
}

fn append_edit_items<R: Runtime>(app: &App<R>, edit: &Submenu<R>) -> Result<(), String> {
    edit.append(&PredefinedMenuItem::undo(app, None).map_err(to_string)?)
        .map_err(to_string)?;
    edit.append(&PredefinedMenuItem::redo(app, None).map_err(to_string)?)
        .map_err(to_string)?;
    edit.append(&PredefinedMenuItem::cut(app, None).map_err(to_string)?)
        .map_err(to_string)?;
    edit.append(&PredefinedMenuItem::copy(app, None).map_err(to_string)?)
        .map_err(to_string)?;
    edit.append(&PredefinedMenuItem::paste(app, None).map_err(to_string)?)
        .map_err(to_string)?;
    edit.append(&PredefinedMenuItem::select_all(app, None).map_err(to_string)?)
        .map_err(to_string)?;
    Ok(())
}

fn append_window_items<R: Runtime>(
    app: &App<R>,
    window: &Submenu<R>,
    include_visibility: bool,
) -> Result<(), String> {
    window
        .append(&PredefinedMenuItem::minimize(app, None).map_err(to_string)?)
        .map_err(to_string)?;
    window
        .append(&PredefinedMenuItem::fullscreen(app, None).map_err(to_string)?)
        .map_err(to_string)?;

    if include_visibility {
        window
            .append(&PredefinedMenuItem::hide(app, None).map_err(to_string)?)
            .map_err(to_string)?;
        window
            .append(&PredefinedMenuItem::hide_others(app, None).map_err(to_string)?)
            .map_err(to_string)?;
        window
            .append(&PredefinedMenuItem::show_all(app, None).map_err(to_string)?)
            .map_err(to_string)?;
    }

    window
        .append(&PredefinedMenuItem::close_window(app, None).map_err(to_string)?)
        .map_err(to_string)?;
    Ok(())
}

#[cfg(target_os = "macos")]
mod mac {
    use tauri::{
        App, Runtime,
        menu::{Menu, PredefinedMenuItem, Submenu},
    };

    use super::{
        MenuIds, append_debug_submenu, append_edit_items, append_file_items, append_view_items,
        append_window_items, build_menu_item, to_string,
    };

    pub(super) fn install<R: Runtime>(
        app: &App<R>,
        menu: &Menu<R>,
        ids: &mut MenuIds,
    ) -> Result<(), String> {
        let app_sub = Submenu::new(app, "Aideon", true).map_err(to_string)?;
        app_sub
            .append(&PredefinedMenuItem::about(app, None, None).map_err(to_string)?)
            .map_err(to_string)?;
        app_sub
            .append(&build_menu_item(app, "preferences", "Preferences…", None)?)
            .map_err(to_string)?;
        app_sub
            .append(&PredefinedMenuItem::quit(app, None).map_err(to_string)?)
            .map_err(to_string)?;
        menu.append(&app_sub).map_err(to_string)?;

        let edit = Submenu::new(app, "Edit", true).map_err(to_string)?;
        append_edit_items(app, &edit)?;
        menu.append(&edit).map_err(to_string)?;

        let file = Submenu::new(app, "File", true).map_err(to_string)?;
        append_file_items(app, &file)?;
        file.append(&PredefinedMenuItem::separator(app).map_err(to_string)?)
            .map_err(to_string)?;
        file.append(&PredefinedMenuItem::close_window(app, None).map_err(to_string)?)
            .map_err(to_string)?;
        menu.append(&file).map_err(to_string)?;

        let window_menu = Submenu::new(app, "Window", true).map_err(to_string)?;
        append_window_items(app, &window_menu, true)?;
        menu.append(&window_menu).map_err(to_string)?;

        let view = Submenu::new(app, "View", true).map_err(to_string)?;
        append_view_items(app, &view, true)?;
        menu.append(&view).map_err(to_string)?;

        let help = Submenu::new(app, "Help", true).map_err(to_string)?;
        menu.append(&help).map_err(to_string)?;

        append_debug_submenu(app, menu, ids, true)?;

        Ok(())
    }
}

#[cfg(not(target_os = "macos"))]
mod desktop {
    use tauri::{
        App, Runtime,
        menu::{Menu, Submenu},
    };

    use super::{
        MenuIds, append_debug_submenu, append_edit_items, append_file_items, append_view_items,
        append_window_items, build_menu_item, to_string,
    };

    pub(super) fn install<R: Runtime>(
        app: &App<R>,
        menu: &Menu<R>,
        ids: &mut MenuIds,
    ) -> Result<(), String> {
        let file = Submenu::new(app, "File", false).map_err(to_string)?;
        append_file_items(app, &file)?;
        file.append(&build_menu_item(app, "file_quit", "Quit", None)?)
            .map_err(to_string)?;
        menu.append(&file).map_err(to_string)?;

        let settings = Submenu::new(app, "Settings", false).map_err(to_string)?;
        settings
            .append(&build_menu_item(app, "preferences", "Preferences…", None)?)
            .map_err(to_string)?;
        menu.append(&settings).map_err(to_string)?;

        let view = Submenu::new(app, "View", false).map_err(to_string)?;
        append_view_items(app, &view, false)?;
        menu.append(&view).map_err(to_string)?;

        let edit = Submenu::new(app, "Edit", false).map_err(to_string)?;
        append_edit_items(app, &edit)?;
        menu.append(&edit).map_err(to_string)?;

        let window_menu = Submenu::new(app, "Window", false).map_err(to_string)?;
        append_window_items(app, &window_menu, false)?;
        menu.append(&window_menu).map_err(to_string)?;

        let help = Submenu::new(app, "Help", false).map_err(to_string)?;
        help.append(&build_menu_item(app, "help_about", "About", None)?)
            .map_err(to_string)?;
        menu.append(&help).map_err(to_string)?;

        append_debug_submenu(app, menu, ids, false)?;

        Ok(())
    }
}
