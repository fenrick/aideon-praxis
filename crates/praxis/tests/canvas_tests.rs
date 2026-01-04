use super::CanvasShape;

#[test]
fn serializes_camel_case() {
    let shape = CanvasShape {
        id: "s1".into(),
        type_id: "rect".into(),
        x: 10.0,
        y: 20.0,
        w: 100.0,
        h: 50.0,
        label: Some("Node".into()),
    };
    let json = serde_json::to_string(&shape).unwrap();
    assert!(json.contains("\"typeId\":"));
    assert!(json.contains("\"label\":"));
}
