//! Time coordinates: the bitemporal `ValidTime` axis and the asserted-time
//! Hybrid Logical Clock, both encoded as decimal strings in canonical JSON.
//!
//! The HLC is packed into a portable signed `i64`: the upper 51 bits hold
//! microseconds since the Unix epoch, the lower 12 bits a monotonic counter
//! ([bitemporal-and-hlc], [ADR-0022]). The packed value's natural integer
//! order is the resolver's "latest asserted time" comparison.

use std::time::{SystemTime, UNIX_EPOCH};

use serde::de::{self, Deserializer};
use serde::{Deserialize, Serialize, Serializer};

use crate::error::CoreError;

/// Number of low bits reserved for the HLC monotonic counter.
pub const HLC_COUNTER_BITS: u32 = 12;
/// Largest counter value before a carry into the physical component (4095).
pub const HLC_COUNTER_MASK: i64 = (1 << HLC_COUNTER_BITS) - 1;

/// Serialise an `i64` as a JSON string (the full-range decimal-string rule).
fn serialize_i64_str<S: Serializer>(value: i64, serializer: S) -> Result<S::Ok, S::Error> {
    serializer.serialize_str(&value.to_string())
}

/// Deserialise an `i64` from a JSON string, rejecting JSON numbers.
fn deserialize_i64_str<'de, D: Deserializer<'de>>(deserializer: D) -> Result<i64, D::Error> {
    let raw = String::deserialize(deserializer)?;
    raw.parse::<i64>()
        .map_err(|e| de::Error::custom(format!("expected decimal-string i64, got `{raw}`: {e}")))
}

/// A valid-time coordinate: microseconds since the Unix epoch, UTC. The world
/// axis of a fact's `[valid_from, valid_to)` interval.
#[derive(Clone, Copy, PartialEq, Eq, Hash, PartialOrd, Ord, Debug)]
pub struct ValidTime(pub i64);

impl Serialize for ValidTime {
    fn serialize<S: Serializer>(&self, serializer: S) -> Result<S::Ok, S::Error> {
        serialize_i64_str(self.0, serializer)
    }
}

impl<'de> Deserialize<'de> for ValidTime {
    fn deserialize<D: Deserializer<'de>>(deserializer: D) -> Result<Self, D::Error> {
        deserialize_i64_str(deserializer).map(ValidTime)
    }
}

/// A Hybrid Logical Clock instant — the asserted-time axis and the resolver's
/// tie-break. Packed physical-micros plus a 12-bit counter in a signed `i64`.
#[derive(Clone, Copy, PartialEq, Eq, Hash, PartialOrd, Ord, Debug)]
pub struct Hlc(pub i64);

impl Hlc {
    /// Pack a physical microsecond reading and a counter into an HLC.
    #[must_use]
    pub const fn pack(physical_micros: i64, counter: i64) -> Self {
        Self((physical_micros << HLC_COUNTER_BITS) | (counter & HLC_COUNTER_MASK))
    }

    /// The wall-clock microsecond reading, with the counter stripped.
    #[must_use]
    pub const fn physical_micros(&self) -> i64 {
        self.0 >> HLC_COUNTER_BITS
    }

    /// The monotonic counter component.
    #[must_use]
    pub const fn counter(&self) -> i64 {
        self.0 & HLC_COUNTER_MASK
    }

    /// The strict successor of this instant: `x + 1` with carry into the
    /// physical component once the counter overflows. Returns
    /// [`CoreError::ClockExhausted`] at `i64::MAX` rather than wrapping.
    pub fn successor(&self) -> Result<Self, CoreError> {
        self.0
            .checked_add(1)
            .map(Self)
            .ok_or(CoreError::ClockExhausted)
    }
}

impl Serialize for Hlc {
    fn serialize<S: Serializer>(&self, serializer: S) -> Result<S::Ok, S::Error> {
        serialize_i64_str(self.0, serializer)
    }
}

impl<'de> Deserialize<'de> for Hlc {
    fn deserialize<D: Deserializer<'de>>(deserializer: D) -> Result<Self, D::Error> {
        deserialize_i64_str(deserializer).map(Hlc)
    }
}

/// Physical wall-clock reading in microseconds since the Unix epoch.
///
/// The result is clamped to `i64` and to the 51-bit physical field; a clock far
/// in the future cannot produce an HLC outside the packable range.
#[must_use]
pub fn physical_now_micros() -> i64 {
    let micros = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| i64::try_from(d.as_micros()).unwrap_or(i64::MAX >> HLC_COUNTER_BITS))
        .unwrap_or(0);
    micros.min(i64::MAX >> HLC_COUNTER_BITS)
}

/// A per-`(workspace_id, partition_id)` HLC generator.
///
/// `next` returns `max(pack(physical_now, 0), successor(last))`, the strict
/// successor of history or physical time, whichever is greater. The watermark
/// is derived state: on rebuild it is restored from `max(asserted_at)` over the
/// canonical history before write-enable ([ADR-0022]).
#[derive(Debug, Default)]
pub struct HlcClock {
    last: Option<Hlc>,
}

impl HlcClock {
    /// A clock with no history — the first assertion will be `pack(now, 0)`.
    #[must_use]
    pub const fn new() -> Self {
        Self { last: None }
    }

    /// A clock seeded from a restored watermark (the canonical maximum).
    #[must_use]
    pub const fn restored_from(watermark: Hlc) -> Self {
        Self {
            last: Some(watermark),
        }
    }

    /// The current watermark, if any operation has been minted or restored.
    #[must_use]
    pub const fn watermark(&self) -> Option<Hlc> {
        self.last
    }

    /// Observe a canonical operation's asserted time, advancing the watermark to
    /// the maximum seen. Used while restoring the watermark across the full
    /// canonical set on open.
    pub fn observe(&mut self, asserted_at: Hlc) {
        self.last = Some(match self.last {
            Some(prev) if prev >= asserted_at => prev,
            _ => asserted_at,
        });
    }

    /// Mint the next strictly-greater HLC, advancing the watermark.
    pub fn mint(&mut self) -> Result<Hlc, CoreError> {
        let physical = Hlc::pack(physical_now_micros(), 0);
        let candidate = match self.last {
            Some(last) => {
                let succ = last.successor()?;
                if physical > succ { physical } else { succ }
            }
            None => physical,
        };
        self.last = Some(candidate);
        Ok(candidate)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn pack_unpack_round_trips() {
        let hlc = Hlc::pack(1_767_225_600_000_000, 7);
        assert_eq!(hlc.physical_micros(), 1_767_225_600_000_000);
        assert_eq!(hlc.counter(), 7);
    }

    #[test]
    fn serialises_as_decimal_string() {
        let hlc = Hlc(7_338_950_400_000_000_000);
        assert_eq!(
            serde_json::to_string(&hlc).unwrap(),
            "\"7338950400000000000\""
        );
    }

    #[test]
    fn rejects_json_number_input() {
        let err = serde_json::from_str::<Hlc>("123");
        assert!(err.is_err(), "a bare JSON number must not parse as an HLC");
    }

    #[test]
    fn next_is_strictly_monotonic() {
        let mut clock = HlcClock::new();
        let a = clock.mint().unwrap();
        let b = clock.mint().unwrap();
        assert!(b > a);
    }

    #[test]
    fn next_exceeds_restored_watermark_even_when_wall_clock_is_behind() {
        // Watermark far in the future; the next op must still sort after it.
        let future = Hlc::pack(physical_now_micros() + 1_000_000_000, 0);
        let mut clock = HlcClock::restored_from(future);
        let fresh = clock.mint().unwrap();
        assert!(fresh > future);
    }

    #[test]
    fn counter_carries_into_physical_on_overflow() {
        let max_counter = Hlc::pack(100, HLC_COUNTER_MASK);
        let succ = max_counter.successor().unwrap();
        assert_eq!(succ.physical_micros(), 101);
        assert_eq!(succ.counter(), 0);
    }

    #[test]
    fn clock_exhaustion_is_an_error_not_a_wrap() {
        let max = Hlc(i64::MAX);
        assert_eq!(max.successor(), Err(CoreError::ClockExhausted));
    }
}
