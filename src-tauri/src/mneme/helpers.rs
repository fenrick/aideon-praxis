fn host_error(err: MnemeError) -> HostError {
    let code = match err {
        MnemeError::Storage { .. } => "storage_error",
        MnemeError::NotFound { .. } => "not_found",
        MnemeError::Validation { .. } => "validation_error",
        MnemeError::Conflict { .. } => "conflict_error",
        MnemeError::Processing { .. } => "processing_error",
        MnemeError::Sync { .. } => "sync_error",
    };
    error!("host: mneme error code={} detail={err}", code);
    HostError::new(code, err.to_string())
}

fn parse_hlc(value: &str) -> Result<Hlc, HostError> {
    let parsed = value.parse::<i64>().map_err(|_| HostError {
        code: "invalid_time",
        message: format!("invalid assertedAt HLC value: {value}"),
    })?;
    Ok(Hlc::from_i64(parsed))
}

fn parse_valid_time(value: &str) -> Result<ValidTime, HostError> {
    if let Ok(raw) = value.parse::<i64>() {
        return Ok(ValidTime(raw));
    }
    let parsed = OffsetDateTime::parse(value, &Rfc3339).map_err(|_| HostError {
        code: "invalid_time",
        message: format!("invalid valid time value: {value}"),
    })?;
    let micros = parsed.unix_timestamp_nanos() / 1_000;
    let micros = i64::try_from(micros).map_err(|_| HostError {
        code: "invalid_time",
        message: format!("valid time value out of range: {value}"),
    })?;
    Ok(ValidTime(micros))
}

fn next_subscription_id() -> String {
    let next = SUBSCRIPTION_COUNTER.fetch_add(1, Ordering::Relaxed);
    format!("mneme-sub-{next}")
}
