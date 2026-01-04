use super::apply_rect_packing;
use aideon_praxis::canvas::CanvasShape;

#[test]
fn rect_packing_wraps_rows() {
    let mut shapes = vec![
        CanvasShape {
            id: "a".into(),
            type_id: "rect".into(),
            x: 0.0,
            y: 0.0,
            w: 100.0,
            h: 50.0,
            label: None,
        },
        CanvasShape {
            id: "b".into(),
            type_id: "rect".into(),
            x: 0.0,
            y: 0.0,
            w: 100.0,
            h: 50.0,
            label: None,
        },
        CanvasShape {
            id: "c".into(),
            type_id: "rect".into(),
            x: 0.0,
            y: 0.0,
            w: 700.0,
            h: 40.0,
            label: None,
        },
    ];
    apply_rect_packing(&mut shapes, 800.0, 10.0);
    assert!(shapes[1].x > shapes[0].x);
    assert!(shapes[2].y >= shapes[0].y + shapes[0].h);
}
