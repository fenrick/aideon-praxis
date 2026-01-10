import assert from 'node:assert/strict';

async function invokeCommand(command, payload) {
  return browser.executeAsync(
    (cmd, args, done) => {
      const invoke = window.__TAURI_INTERNALS__?.invoke;
      if (!invoke) {
        done({ ok: false, error: 'tauri invoke not available' });
        return;
      }
      invoke(cmd, args)
        .then((result) => done({ ok: true, result }))
        .catch((error) =>
          done({
            ok: false,
            error: error?.message ?? String(error),
          }),
        );
    },
    command,
    payload,
  );
}

describe('tauri e2e smoke', () => {
  it('bridges node-driven invoke into rust commands', async () => {
    const hasInvoke = await browser.execute(
      () => typeof window.__TAURI_INTERNALS__?.invoke === 'function',
    );
    assert.equal(hasInvoke, true, 'expected tauri internals invoke to be available');

    const temporalResponse = await invokeCommand('chrona.temporal.state_at', {
      requestId: 'e2e-state-at',
      payload: {
        asOf: { id: 'main' },
        scenario: 'main',
        confidence: null,
        layer: null,
      },
    });
    assert.equal(temporalResponse.ok, true, temporalResponse.error ?? 'invoke failed');
    assert.equal(temporalResponse.result.status, 'ok');
    assert.ok(temporalResponse.result.result?.asOf);

    const windowResponse = await invokeCommand('system.window.open', {
      requestId: 'e2e-open-settings',
      payload: {
        window: 'settings',
      },
    });
    assert.equal(windowResponse.ok, true, windowResponse.error ?? 'invoke failed');
    assert.equal(windowResponse.result.status, 'ok');
  });
});
