use tauri::{
    App, Manager, Wry,
    menu::{Menu, MenuItem, PredefinedMenuItem, Submenu},
};

#[derive(Clone, Debug, Default)]
pub struct MenuIds {
    pub styleguide: String,
}

pub fn build_menu(app: &App<Wry>) -> Result<(), String> {
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

fn to_string<E: std::fmt::Display>(error: E) -> String {
    error.to_string()
}

fn append_edit_items(app: &App<Wry>, edit: &Submenu<Wry>) -> Result<(), String> {
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

fn append_window_items(
    app: &App<Wry>,
    window: &Submenu<Wry>,
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
    use super::*;

    pub(super) fn install(app: &App<Wry>, menu: &Menu<Wry>, ids: &mut super::MenuIds) -> Result<(), String> {
        let app_sub = Submenu::new(app, "Aideon Praxis", true).map_err(to_string)?;
        app_sub
            .append(&PredefinedMenuItem::about(app, None, None).map_err(to_string)?)
            .map_err(to_string)?;
        app_sub
            .append(&MenuItem::new(app, "preferences", true, None::<&str>).map_err(to_string)?)
            .map_err(to_string)?;
        app_sub
            .append(&PredefinedMenuItem::quit(app, None).map_err(to_string)?)
            .map_err(to_string)?;
        menu.append(&app_sub).map_err(to_string)?;

        let edit = Submenu::new(app, "Edit", true).map_err(to_string)?;
        append_edit_items(app, &edit)?;
        menu.append(&edit).map_err(to_string)?;

        let window_menu = Submenu::new(app, "Window", true).map_err(to_string)?;
        append_window_items(app, &window_menu, true)?;
        menu.append(&window_menu).map_err(to_string)?;

        let help = Submenu::new(app, "Help", true).map_err(to_string)?;
        menu.append(&help).map_err(to_string)?;

        let debug = Submenu::new(app, "Debug", true).map_err(to_string)?;
        let style_item = MenuItem::new(app, "debug_styleguide", true, Some("UI Style Guide"))
            .map_err(to_string)?;
        ids.styleguide = style_item.id().as_ref().to_string();
        debug.append(&style_item).map_err(to_string)?;
        menu.append(&debug).map_err(to_string)?;

        Ok(())
    }
}

#[cfg(not(target_os = "macos"))]
mod desktop {
    use super::*;

    pub(super) fn install(app: &App<Wry>, menu: &Menu<Wry>, ids: &mut super::MenuIds) -> Result<(), String> {
        let file = Submenu::new(app, "File", false).map_err(to_string)?;
        file.append(&MenuItem::new(app, "file.quit", true, None::<&str>).map_err(to_string)?)
            .map_err(to_string)?;
        menu.append(&file).map_err(to_string)?;

        let settings = Submenu::new(app, "Settings", false).map_err(to_string)?;
        settings
            .append(&MenuItem::new(app, "preferences", true, None::<&str>).map_err(to_string)?)
            .map_err(to_string)?;
        menu.append(&settings).map_err(to_string)?;

        let edit = Submenu::new(app, "Edit", false).map_err(to_string)?;
        append_edit_items(app, &edit)?;
        menu.append(&edit).map_err(to_string)?;

        let window_menu = Submenu::new(app, "Window", false).map_err(to_string)?;
        append_window_items(app, &window_menu, false)?;
        menu.append(&window_menu).map_err(to_string)?;

        let help = Submenu::new(app, "Help", false).map_err(to_string)?;
        help.append(&MenuItem::new(app, "help.about", true, Some("About")).map_err(to_string)?)
            .map_err(to_string)?;
        menu.append(&help).map_err(to_string)?;

        let debug = Submenu::new(app, "Debug", false).map_err(to_string)?;
        let style_item = MenuItem::new(app, "debug_styleguide", true, Some("UI Style Guide"))
            .map_err(to_string)?;
        ids.styleguide = style_item.id().as_ref().to_string();
        debug.append(&style_item).map_err(to_string)?;
        menu.append(&debug).map_err(to_string)?;

        Ok(())
    }
}
