use super::Id;

#[test]
fn id_roundtrips_uuid_and_ulid() {
    let id = Id::new();
    let uuid = id.to_uuid_string();
    let ulid = id.to_ulid_string();
    let from_uuid = Id::from_uuid_str(&uuid).expect("uuid parse");
    let from_ulid = Id::from_ulid_str(&ulid).expect("ulid parse");
    assert_eq!(from_uuid.as_bytes(), id.as_bytes());
    assert_eq!(from_ulid.as_bytes(), id.as_bytes());
}

#[test]
fn id_rejects_invalid_strings() {
    assert!(Id::from_uuid_str("not-a-uuid").is_err());
    assert!(Id::from_ulid_str("not-a-ulid").is_err());
}
