use crate::metrics::{record_command_duration, record_command_failure, record_job_duration, record_job_failure, snapshot};
use std::time::Duration;

#[test]
fn metrics_snapshot_reflects_updates() {
    record_command_duration("setup", Duration::from_millis(200));
    record_command_duration("setup", Duration::from_millis(50));
    record_command_failure("setup");

    record_job_duration("backend_seed", Duration::from_millis(400));
    record_job_failure("backend_seed");

    let metrics = snapshot();
    let command_summary = metrics
        .command_durations
        .get("setup")
        .expect("setup command duration recorded");
    assert_eq!(command_summary.count, 2);
    assert_eq!(command_summary.total_ms, 250);
    assert_eq!(metrics.command_failures.get("setup"), Some(&1));

    let job_summary = metrics
        .job_durations
        .get("backend_seed")
        .expect("job duration recorded");
    assert_eq!(job_summary.count, 1);
    assert_eq!(job_summary.total_ms, 400);
    assert_eq!(metrics.job_failures.get("backend_seed"), Some(&1));
}
