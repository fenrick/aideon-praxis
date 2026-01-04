use super::{SystemWindowTarget, parse_window_target, to_string};

#[test]
fn to_string_formats_errors() {
    let value = to_string("boom");
    assert_eq!(value, "boom");
}

#[test]
fn parse_window_target_maps_known_ids() {
    assert_eq!(
        parse_window_target("settings").unwrap(),
        SystemWindowTarget::Settings
    );
    assert_eq!(
        parse_window_target("about").unwrap(),
        SystemWindowTarget::About
    );
    assert_eq!(
        parse_window_target("status").unwrap(),
        SystemWindowTarget::Status
    );
    assert_eq!(
        parse_window_target("styleguide").unwrap(),
        SystemWindowTarget::Styleguide
    );
    assert!(parse_window_target("nope").is_err());
}
