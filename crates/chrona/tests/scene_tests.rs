use super::generate_demo_scene;

#[test]
fn returns_two_rects() {
    let s = generate_demo_scene();
    assert_eq!(s.len(), 2);
    assert_eq!(s[0].type_id, "rect");
}
