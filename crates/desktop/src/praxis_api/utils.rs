fn metadata_from(
    id: &str,
    name: &str,
    as_of: &str,
    layer: Option<String>,
    scenario: Option<String>,
) -> ViewMetadata {
    ViewMetadata {
        id: id.into(),
        name: name.into(),
        as_of: as_of.into(),
        layer,
        scenario,
        fetched_at: now_iso(),
        source: "host".into(),
    }
}

fn now_iso() -> String {
    OffsetDateTime::now_utc()
        .format(&Rfc3339)
        .unwrap_or_else(|_| "1970-01-01T00:00:00Z".into())
}
