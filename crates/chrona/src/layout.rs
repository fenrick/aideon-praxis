//! Layout helpers. Default mimics `org.eclipse.elk.rectpacking` behavior.

use aideon_praxis::canvas::CanvasShape;

/// Apply a rectangle packing layout (row-based), roughly matching
/// `org.eclipse.elk.rectpacking` defaults. Shapes are sorted by height and
/// packed left-to-right into rows with a maximum row width. New rows are
/// started when the next rectangle would overflow that width.
pub fn apply_rect_packing(shapes: &mut [CanvasShape], max_row_width: f64, spacing: f64) {
    if shapes.is_empty() {
        return;
    }

    let origin_x = 200.0;
    let origin_y = 200.0;

    // Sort by height (descending) to reduce row fragmentation (NFDH heuristic)
    shapes.sort_by(|a, b| b.h.partial_cmp(&a.h).unwrap_or(std::cmp::Ordering::Equal));

    let mut cursor_x = origin_x;
    let mut cursor_y = origin_y;
    let mut row_height = 0.0_f64;

    for s in shapes.iter_mut() {
        if cursor_x > origin_x && (cursor_x - origin_x + s.w) > max_row_width {
            // New row
            cursor_x = origin_x;
            cursor_y += row_height + spacing;
            row_height = 0.0;
        }
        s.x = cursor_x;
        s.y = cursor_y;
        cursor_x += s.w + spacing;
        if s.h > row_height {
            row_height = s.h;
        }
    }
}

#[cfg(test)]
#[path = "../tests/layout_tests.rs"]
mod tests;
