use once_cell::sync::Lazy;
use std::collections::HashMap;
use std::sync::Mutex;
use std::time::Duration;

#[allow(dead_code)]
#[derive(Clone, Debug, Default, PartialEq, Eq)]
pub struct DurationSummary {
    pub count: u64,
    pub total_ms: u64,
}

#[allow(dead_code)]
#[derive(Clone, Debug, Default, PartialEq, Eq)]
pub struct MetricsSnapshot {
    pub command_failures: HashMap<String, u64>,
    pub job_failures: HashMap<String, u64>,
    pub command_durations: HashMap<String, DurationSummary>,
    pub job_durations: HashMap<String, DurationSummary>,
}

struct Metrics {
    command_failures: HashMap<String, u64>,
    job_failures: HashMap<String, u64>,
    command_durations: HashMap<String, DurationSummary>,
    job_durations: HashMap<String, DurationSummary>,
}

impl Default for Metrics {
    fn default() -> Self {
        Self {
            command_failures: HashMap::new(),
            job_failures: HashMap::new(),
            command_durations: HashMap::new(),
            job_durations: HashMap::new(),
        }
    }
}

static GLOBAL_METRICS: Lazy<Mutex<Metrics>> = Lazy::new(|| Mutex::new(Metrics::default()));

fn insert_or_add(map: &mut HashMap<String, u64>, key: &str, increment: u64) {
    let entry = map.entry(key.to_string()).or_insert(0);
    *entry += increment;
}

fn record_duration(map: &mut HashMap<String, DurationSummary>, name: &str, duration: Duration) {
    let summary = map
        .entry(name.to_string())
        .or_insert_with(DurationSummary::default);
    summary.count += 1;
    summary.total_ms += duration.as_millis() as u64;
}

pub fn record_command_failure(command: &str) {
    let mut guard = GLOBAL_METRICS.lock().unwrap();
    insert_or_add(&mut guard.command_failures, command, 1);
}

pub fn record_job_failure(job: &str) {
    let mut guard = GLOBAL_METRICS.lock().unwrap();
    insert_or_add(&mut guard.job_failures, job, 1);
}

pub fn record_command_duration(command: &str, duration: Duration) {
    let mut guard = GLOBAL_METRICS.lock().unwrap();
    record_duration(&mut guard.command_durations, command, duration);
}

pub fn record_job_duration(job: &str, duration: Duration) {
    let mut guard = GLOBAL_METRICS.lock().unwrap();
    record_duration(&mut guard.job_durations, job, duration);
}

#[allow(dead_code)]
pub fn snapshot() -> MetricsSnapshot {
    let guard = GLOBAL_METRICS.lock().unwrap();
    MetricsSnapshot {
        command_failures: guard.command_failures.clone(),
        job_failures: guard.job_failures.clone(),
        command_durations: guard.command_durations.clone(),
        job_durations: guard.job_durations.clone(),
    }
}
