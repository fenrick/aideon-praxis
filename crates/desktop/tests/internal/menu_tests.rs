#[cfg(not(target_os = "macos"))]
use super::build_menu;
use super::{
    MenuAction, MenuIds, ShellCommandPayload, classify_menu_event, handle_menu_event, to_string,
};
use serde_json::json;
use tauri::Manager;
use tauri::menu::{MenuEvent, MenuId};
use tauri::{WebviewUrl, WebviewWindowBuilder};

#[test]
fn menu_ids_default_is_empty() {
    let ids = MenuIds::default();
    assert!(ids.styleguide.is_empty());
}

#[test]
fn shell_command_payload_serializes() {
    let payload = ShellCommandPayload {
        command: "toggle-navigation".into(),
        payload: None,
    };
    let encoded = serde_json::to_string(&payload).expect("serialize");
    assert!(encoded.contains("toggle-navigation"));

    let payload = ShellCommandPayload {
        command: "file.open".into(),
        payload: Some(json!({ "path": "/tmp/demo.txt" })),
    };
    let encoded = serde_json::to_string(&payload).expect("serialize");
    assert!(encoded.contains("file.open"));
    assert!(encoded.contains("demo.txt"));
}

#[test]
fn to_string_formats_errors() {
    assert_eq!(to_string("err"), "err");
}

#[test]
fn menu_event_classification_covers_common_paths() {
    assert_eq!(classify_menu_event("about", ""), MenuAction::OpenAbout);
    assert_eq!(classify_menu_event("help.about", ""), MenuAction::OpenAbout);
    assert_eq!(
        classify_menu_event("preferences", ""),
        MenuAction::OpenSettings
    );
    assert_eq!(
        classify_menu_event("view.toggle_navigation", ""),
        MenuAction::EmitShellCommand("toggle-navigation")
    );
    assert_eq!(
        classify_menu_event("file.open", ""),
        MenuAction::PickOpenFile
    );
    assert_eq!(
        classify_menu_event("file.save_as", ""),
        MenuAction::PickSaveFile
    );
    assert_eq!(
        classify_menu_event("file.print", ""),
        MenuAction::EmitShellCommand("file.print")
    );
    assert_eq!(classify_menu_event("file.quit", ""), MenuAction::Quit);
    assert_eq!(classify_menu_event("unknown", ""), MenuAction::Noop);
    assert_eq!(
        classify_menu_event("resolved-styleguide", "resolved-styleguide"),
        MenuAction::OpenStyleguide
    );
}

#[test]
#[cfg(not(target_os = "macos"))]
fn append_edit_items_builds_edit_menu() {
    let app = tauri::test::mock_app();
    let edit = tauri::menu::Submenu::new(&app, "Edit", true).expect("submenu");
    super::append_edit_items(&app, &edit).expect("append edit items");
}

#[test]
#[cfg(not(target_os = "macos"))]
fn append_window_items_supports_visibility_options() {
    let app = tauri::test::mock_app();
    let window = tauri::menu::Submenu::new(&app, "Window", true).expect("submenu");
    super::append_window_items(&app, &window, true).expect("append window items");
    let minimal = tauri::menu::Submenu::new(&app, "Window2", true).expect("submenu");
    super::append_window_items(&app, &minimal, false).expect("append window items");
}

#[test]
#[cfg(not(target_os = "macos"))]
fn build_menu_registers_ids() {
    let app = tauri::test::mock_app();
    build_menu(&app).expect("build menu");
    let ids = app.state::<MenuIds>();
    assert!(!ids.styleguide.is_empty());
}

#[test]
fn handle_menu_event_emits_shell_command() {
    let app = tauri::test::mock_app();
    app.manage(MenuIds {
        styleguide: "styleguide".to_string(),
    });
    let _window = WebviewWindowBuilder::new(&app, "main", WebviewUrl::App("index.html".into()))
        .build()
        .expect("main window");

    let event = MenuEvent {
        id: MenuId::new("view.toggle_navigation"),
    };
    handle_menu_event(app.handle(), event);
}

#[test]
fn handle_menu_event_opens_windows() {
    let app = tauri::test::mock_app();
    app.manage(MenuIds {
        styleguide: "debug_styleguide".to_string(),
    });

    handle_menu_event(
        app.handle(),
        MenuEvent {
            id: MenuId::new("preferences"),
        },
    );
    handle_menu_event(
        app.handle(),
        MenuEvent {
            id: MenuId::new("help.about"),
        },
    );
    handle_menu_event(
        app.handle(),
        MenuEvent {
            id: MenuId::new("debug_styleguide"),
        },
    );
}
