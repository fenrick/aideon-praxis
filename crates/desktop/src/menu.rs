use serde::Serialize;
use serde_json::json;
use tauri::{
    App, AppHandle, Emitter, Manager, Runtime,
    menu::{Menu, MenuEvent, PredefinedMenuItem, Submenu},
};
use tauri_plugin_dialog::DialogExt;

use crate::windows::{open_about, open_settings, open_styleguide};

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "kebab-case")]
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
        "about" | "help.about" => MenuAction::OpenAbout,
        "preferences" => MenuAction::OpenSettings,
        "view.toggle_navigation" => MenuAction::EmitShellCommand("toggle-navigation"),
        "view.toggle_inspector" => MenuAction::EmitShellCommand("toggle-inspector"),
        "view.command_palette" => MenuAction::EmitShellCommand("open-command-palette"),
        "file.open" => MenuAction::PickOpenFile,
        "file.save_as" => MenuAction::PickSaveFile,
        "file.print" => MenuAction::EmitShellCommand("file.print"),
        "file.quit" => MenuAction::Quit,
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
            log::info!("menu: file.quit");
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
            "aideon.shell.command",
            ShellCommandPayload {
                command: command.to_string(),
                payload,
            },
        );
    }
}

fn pick_open_file<R: Runtime>(app: &AppHandle<R>) {
    let handle = app.clone();
    handle.dialog().file().pick_file(move |file| {
        if let Some(file) = file {
            let path = file.to_string();
            emit_shell_command_with_payload(&handle, "file.open", Some(json!({ "path": path })));
        }
    });
}

fn pick_save_file<R: Runtime>(app: &AppHandle<R>) {
    let handle = app.clone();
    handle.dialog().file().save_file(move |file| {
        if let Some(file) = file {
            let path = file.to_string();
            emit_shell_command_with_payload(&handle, "file.save_as", Some(json!({ "path": path })));
        }
    });
}

fn to_string<E: std::fmt::Display>(error: E) -> String {
    error.to_string()
}

#[cfg(test)]
#[path = "../tests/menu_tests.rs"]
mod tests;

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
        menu::{Menu, MenuItemBuilder, PredefinedMenuItem, Submenu},
    };

    use super::{MenuIds, append_edit_items, append_window_items, to_string};

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
            .append(
                &MenuItemBuilder::with_id("preferences", "Preferences…")
                    .build(app)
                    .map_err(to_string)?,
            )
            .map_err(to_string)?;
        app_sub
            .append(&PredefinedMenuItem::quit(app, None).map_err(to_string)?)
            .map_err(to_string)?;
        menu.append(&app_sub).map_err(to_string)?;

        let edit = Submenu::new(app, "Edit", true).map_err(to_string)?;
        append_edit_items(app, &edit)?;
        menu.append(&edit).map_err(to_string)?;

        let file = Submenu::new(app, "File", true).map_err(to_string)?;
        file.append(
            &MenuItemBuilder::with_id("file.open", "Open…")
                .accelerator("CmdOrCtrl+O")
                .build(app)
                .map_err(to_string)?,
        )
        .map_err(to_string)?;
        file.append(
            &MenuItemBuilder::with_id("file.save_as", "Save As…")
                .accelerator("CmdOrCtrl+Shift+S")
                .build(app)
                .map_err(to_string)?,
        )
        .map_err(to_string)?;
        file.append(
            &MenuItemBuilder::with_id("file.print", "Print…")
                .accelerator("CmdOrCtrl+P")
                .build(app)
                .map_err(to_string)?,
        )
        .map_err(to_string)?;
        file.append(&PredefinedMenuItem::separator(app).map_err(to_string)?)
            .map_err(to_string)?;
        file.append(&PredefinedMenuItem::close_window(app, None).map_err(to_string)?)
            .map_err(to_string)?;
        menu.append(&file).map_err(to_string)?;

        let window_menu = Submenu::new(app, "Window", true).map_err(to_string)?;
        append_window_items(app, &window_menu, true)?;
        menu.append(&window_menu).map_err(to_string)?;

        let view = Submenu::new(app, "View", true).map_err(to_string)?;
        view.append(
            &MenuItemBuilder::with_id("view.command_palette", "Command Palette…")
                .accelerator("CmdOrCtrl+K")
                .build(app)
                .map_err(to_string)?,
        )
        .map_err(to_string)?;
        view.append(&PredefinedMenuItem::separator(app).map_err(to_string)?)
            .map_err(to_string)?;
        view.append(
            &MenuItemBuilder::with_id("view.toggle_navigation", "Toggle Navigation")
                .accelerator("CmdOrCtrl+B")
                .build(app)
                .map_err(to_string)?,
        )
        .map_err(to_string)?;
        view.append(
            &MenuItemBuilder::with_id("view.toggle_inspector", "Toggle Inspector")
                .accelerator("CmdOrCtrl+I")
                .build(app)
                .map_err(to_string)?,
        )
        .map_err(to_string)?;
        menu.append(&view).map_err(to_string)?;

        let help = Submenu::new(app, "Help", true).map_err(to_string)?;
        menu.append(&help).map_err(to_string)?;

        let debug = Submenu::new(app, "Debug", true).map_err(to_string)?;
        let style_item = MenuItemBuilder::with_id("debug_styleguide", "UI Style Guide")
            .build(app)
            .map_err(to_string)?;
        ids.styleguide = style_item.id().as_ref().to_string();
        debug.append(&style_item).map_err(to_string)?;
        menu.append(&debug).map_err(to_string)?;

        Ok(())
    }
}

#[cfg(not(target_os = "macos"))]
mod desktop {
    use tauri::{
        App, Runtime,
        menu::{Menu, MenuItemBuilder, Submenu},
    };

    use super::{MenuIds, append_edit_items, append_window_items, to_string};

    pub(super) fn install<R: Runtime>(
        app: &App<R>,
        menu: &Menu<R>,
        ids: &mut MenuIds,
    ) -> Result<(), String> {
        let file = Submenu::new(app, "File", false).map_err(to_string)?;
        file.append(
            &MenuItemBuilder::with_id("file.open", "Open…")
                .accelerator("CmdOrCtrl+O")
                .build(app)
                .map_err(to_string)?,
        )
        .map_err(to_string)?;
        file.append(
            &MenuItemBuilder::with_id("file.save_as", "Save As…")
                .accelerator("CmdOrCtrl+Shift+S")
                .build(app)
                .map_err(to_string)?,
        )
        .map_err(to_string)?;
        file.append(
            &MenuItemBuilder::with_id("file.print", "Print…")
                .accelerator("CmdOrCtrl+P")
                .build(app)
                .map_err(to_string)?,
        )
        .map_err(to_string)?;
        file.append(
            &MenuItemBuilder::with_id("file.quit", "Quit")
                .build(app)
                .map_err(to_string)?,
        )
        .map_err(to_string)?;
        menu.append(&file).map_err(to_string)?;

        let settings = Submenu::new(app, "Settings", false).map_err(to_string)?;
        settings
            .append(
                &MenuItemBuilder::with_id("preferences", "Preferences…")
                    .build(app)
                    .map_err(to_string)?,
            )
            .map_err(to_string)?;
        menu.append(&settings).map_err(to_string)?;

        let view = Submenu::new(app, "View", false).map_err(to_string)?;
        view.append(
            &MenuItemBuilder::with_id("view.command_palette", "Command Palette…")
                .accelerator("CmdOrCtrl+K")
                .build(app)
                .map_err(to_string)?,
        )
        .map_err(to_string)?;
        view.append(
            &MenuItemBuilder::with_id("view.toggle_navigation", "Toggle Navigation")
                .accelerator("CmdOrCtrl+B")
                .build(app)
                .map_err(to_string)?,
        )
        .map_err(to_string)?;
        view.append(
            &MenuItemBuilder::with_id("view.toggle_inspector", "Toggle Inspector")
                .accelerator("CmdOrCtrl+I")
                .build(app)
                .map_err(to_string)?,
        )
        .map_err(to_string)?;
        menu.append(&view).map_err(to_string)?;

        let edit = Submenu::new(app, "Edit", false).map_err(to_string)?;
        append_edit_items(app, &edit)?;
        menu.append(&edit).map_err(to_string)?;

        let window_menu = Submenu::new(app, "Window", false).map_err(to_string)?;
        append_window_items(app, &window_menu, false)?;
        menu.append(&window_menu).map_err(to_string)?;

        let help = Submenu::new(app, "Help", false).map_err(to_string)?;
        help.append(
            &MenuItemBuilder::with_id("help.about", "About")
                .build(app)
                .map_err(to_string)?,
        )
        .map_err(to_string)?;
        menu.append(&help).map_err(to_string)?;

        let debug = Submenu::new(app, "Debug", false).map_err(to_string)?;
        let style_item = MenuItemBuilder::with_id("debug_styleguide", "UI Style Guide")
            .build(app)
            .map_err(to_string)?;
        ids.styleguide = style_item.id().as_ref().to_string();
        debug.append(&style_item).map_err(to_string)?;
        menu.append(&debug).map_err(to_string)?;

        Ok(())
    }
}
