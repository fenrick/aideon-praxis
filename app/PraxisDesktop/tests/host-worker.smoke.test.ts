import { describe, test } from 'vitest';

// Placeholder smoke test for host+worker READY + state_at over UDS.
// Intentionally skipped until wiring is implemented in @aideon/PraxisDesktop test harness.
describe.skip('host↔worker smoke (READY + state_at via UDS)', () => {
  test('boots host, waits READY, calls state_at()', async () => {
    // follow-up plan (tracked in issue #70):
    // - Launch Electron host in test mode
    // - Wait for worker READY signal over UDS
    // - Call state_at(as_of=today) via adapters/host bridge
    // - Assert minimal shape of response
  });
});
