use super::MnemeError;

#[test]
fn helper_constructors_set_variants() {
    let err = MnemeError::storage("disk");
    assert!(matches!(err, MnemeError::Storage { .. }));
    let err = MnemeError::not_found("missing");
    assert!(matches!(err, MnemeError::NotFound { .. }));
    let err = MnemeError::invalid("bad");
    assert!(matches!(err, MnemeError::Validation { .. }));
    let err = MnemeError::conflict("dup");
    assert!(matches!(err, MnemeError::Conflict { .. }));
    let err = MnemeError::processing("job");
    assert!(matches!(err, MnemeError::Processing { .. }));
    let err = MnemeError::sync("sync");
    assert!(matches!(err, MnemeError::Sync { .. }));
}
