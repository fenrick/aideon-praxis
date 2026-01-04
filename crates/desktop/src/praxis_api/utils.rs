fn metadata_from(id: &str, name: &str, as_of: &str, scenario: Option<String>) -> ViewMetadata {
    ViewMetadata {
        id: id.into(),
        name: name.into(),
        as_of: as_of.into(),
        scenario,
        fetched_at: now_iso(),
        source: "host".into(),
    }
}

fn map_from(value: Value) -> Map<String, Value> {
    match value {
        Value::Object(map) => map,
        _ => Map::new(),
    }
}

#[allow(dead_code)]
fn recent_velocity_points() -> Vec<ChartPoint> {
    let now = OffsetDateTime::now_utc();
    let mut points = Vec::new();
    for index in 0..7 {
        let offset = 6 - index;
        if let Some(timestamp) = now.checked_sub(time::Duration::days(offset)) {
            points.push(ChartPoint {
                label: timestamp.weekday().to_string(),
                value: 78.0 + (index as f64 * 3.5),
                timestamp: Some(timestamp.format(&Rfc3339).unwrap_or_else(|_| now_iso())),
            });
        }
    }
    points
}

#[allow(dead_code)]
fn competency_scores() -> Vec<ChartPoint> {
    ["Security", "Resilience", "Efficiency", "Experience"]
        .iter()
        .map(|label| ChartPoint {
            label: (*label).into(),
            value: seeded_score(label) as f64,
            timestamp: None,
        })
        .collect()
}

#[allow(dead_code)]
fn competency_targets() -> Vec<ChartPoint> {
    ["Security", "Resilience", "Efficiency", "Experience"]
        .iter()
        .map(|label| ChartPoint {
            label: (*label).into(),
            value: 95.0,
            timestamp: None,
        })
        .collect()
}

#[allow(dead_code)]
fn seeded_score(label: &str) -> i32 {
    let mut hash = 0i32;
    for ch in label.chars() {
        let code_point = ch as i32;
        hash = hash.wrapping_shl(5).wrapping_sub(hash) + code_point;
    }
    60 + (hash.abs() % 35)
}

fn now_iso() -> String {
    OffsetDateTime::now_utc()
        .format(&Rfc3339)
        .unwrap_or_else(|_| "1970-01-01T00:00:00Z".into())
}

fn next_commit_id() -> String {
    use std::sync::atomic::{AtomicU32, Ordering};
    static COUNTER: AtomicU32 = AtomicU32::new(1);
    let id = COUNTER.fetch_add(1, Ordering::Relaxed);
    format!("mock-commit-{:04}", id)
}
