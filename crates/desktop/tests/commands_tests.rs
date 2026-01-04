use super::*;

#[test]
fn greet_includes_name() {
    assert_eq!(greet("Aideon".into()), "Hello Aideon from Rust!");
}
