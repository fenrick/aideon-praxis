import assert from 'node:assert/strict';
import crypto from 'node:crypto';

async function invokeCommand(command, payload) {
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      await ensureActiveWindow();
      return await browser.executeAsync(
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
    } catch (error) {
      if (String(error).includes('no such window') && attempt === 0) {
        continue;
      }
      throw error;
    }
  }
  throw new Error('failed to invoke command after retry');
}

async function ensureActiveWindow() {
  const handles = await browser.getWindowHandles();
  if (handles.length === 0) {
    throw new Error('no window handles available');
  }
  for (let i = handles.length - 1; i >= 0; i -= 1) {
    try {
      await browser.switchToWindow(handles[i]);
      const hasInvoke = await browser.execute(
        () => typeof window.__TAURI_INTERNALS__?.invoke === 'function',
      );
      if (hasInvoke) {
        return;
      }
    } catch (error) {
      continue;
    }
  }
  throw new Error('no valid window handle with tauri invoke available');
}

async function invokeIpc(command, payload) {
  return invokeCommand(command, {
    request: {
      requestId: `e2e-${crypto.randomUUID()}`,
      payload,
    },
  });
}

describe('tauri e2e smoke', () => {
  it('bridges node-driven invoke into rust commands', async () => {
    const hasInvoke = await browser.execute(
      () => typeof window.__TAURI_INTERNALS__?.invoke === 'function',
    );
    assert.equal(hasInvoke, true, 'expected tauri internals invoke to be available');

    const commitResponse = await invokeIpc('chrona_temporal_list_commits', { branch: 'main' });
    assert.equal(commitResponse.ok, true, commitResponse.error ?? 'invoke failed');
    assert.equal(commitResponse.result.status, 'ok');
    const commits = commitResponse.result.result ?? [];
    const latestCommitId = commits.length ? (commits.at(-1)?.id ?? 'main') : 'main';

    const temporalResponse = await invokeIpc('chrona_temporal_state_at', {
      asOf: { id: latestCommitId },
      scenario: 'main',
      confidence: null,
      layer: null,
    });
    assert.equal(temporalResponse.ok, true, temporalResponse.error ?? 'invoke failed');
    assert.equal(temporalResponse.result.status, 'ok');
    assert.ok(temporalResponse.result.result?.asOf);

    const windowResponse = await invokeIpc('system_window_open', {
      window: 'settings',
    });
    assert.equal(windowResponse.ok, true, windowResponse.error ?? 'invoke failed');
    assert.equal(windowResponse.result.status, 'ok');
  });
});
