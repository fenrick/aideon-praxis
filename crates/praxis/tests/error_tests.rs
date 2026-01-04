use super::*;

#[test]
fn codes_are_stable() {
    assert_eq!(
        PraxisError::UnknownBranch {
            branch: "main".into()
        }
        .code(),
        PraxisErrorCode::UnknownBranch
    );
    assert_eq!(
        PraxisError::UnknownCommit {
            commit: "c1".into()
        }
        .code(),
        PraxisErrorCode::UnknownCommit
    );
    assert_eq!(
        PraxisError::ConcurrencyConflict {
            branch: "dev".into(),
            expected: Some("a".into()),
            actual: Some("b".into())
        }
        .code(),
        PraxisErrorCode::ConcurrencyConflict
    );
    assert_eq!(
        PraxisError::ValidationFailed {
            message: "x".into()
        }
        .code(),
        PraxisErrorCode::ValidationFailed
    );
    assert_eq!(
        PraxisError::IntegrityViolation {
            message: "x".into()
        }
        .code(),
        PraxisErrorCode::IntegrityViolation
    );
    assert_eq!(
        PraxisError::MergeConflict {
            message: "x".into()
        }
        .code(),
        PraxisErrorCode::MergeConflict
    );
}
