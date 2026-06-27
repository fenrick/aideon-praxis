import assert from 'node:assert/strict';
import crypto from 'node:crypto';

// Finds the most-recently-opened window that has __TAURI_INTERNALS__.invoke.
async function findShellWindow() {
  const handles = await browser.getWindowHandles();
  for (let index = handles.length - 1; index >= 0; index -= 1) {
    try {
      await browser.switchToWindow(handles[index]);
      const hasTauri = await browser.execute(
        () => typeof window.__TAURI_INTERNALS__?.invoke === 'function',
      );
      if (hasTauri) return handles[index];
    } catch {
      // window closed or unreachable — try next
    }
  }
  return undefined;
}

async function invokeIpc(command, payload) {
  const requestId = crypto.randomUUID();
  return browser.executeAsync(
    (cmd, args, done) => {
      const invoke = window.__TAURI_INTERNALS__?.invoke;
      if (!invoke) {
        done({ ok: false, error: 'tauri invoke not available' });
        return;
      }
      invoke(cmd, args)
        .then((result) => done({ ok: true, result }))
        .catch((error) => done({ ok: false, error: error?.message ?? String(error) }));
    },
    command,
    { request: { requestId, payload } },
  );
}

// ---------------------------------------------------------------------------
// Shell composition
//
// Asserts that the main window renders BOTH required shell regions and that at
// least one call crosses the real adapter/host seam (not a mocked IPC path).
// ---------------------------------------------------------------------------
describe('Tier-2: shell composition and host-seam crossing', () => {
  it('main window renders both required shell regions', async () => {
    let shellHandle;
    await browser.waitUntil(
      async () => {
        shellHandle = await findShellWindow();
        return Boolean(shellHandle);
      },
      { timeout: 60_000, timeoutMsg: 'shell window did not appear within 60 s' },
    );
    await browser.switchToWindow(shellHandle);

    const content = await browser.$('[data-testid="aideon-shell-content"]');
    await content.waitForExist({
      timeout: 30_000,
      timeoutMsg:
        'data-testid="aideon-shell-content" did not appear — shell content region missing',
    });
    await expect(content).toBeExisting();

    const inspector = await browser.$('[data-testid="aideon-shell-inspector"]');
    await inspector.waitForExist({
      timeout: 10_000,
      timeoutMsg:
        'data-testid="aideon-shell-inspector" did not appear — shell inspector region missing',
    });
    await expect(inspector).toBeExisting();
  });

  it('system_worker_health crosses the real host adapter seam and returns ok', async () => {
    const shellHandle = await findShellWindow();
    assert.ok(shellHandle, 'shell window must be available for the host-seam crossing test');
    await browser.switchToWindow(shellHandle);

    const response = await invokeIpc('system_worker_health', {});
    assert.equal(response.ok, true, response.error ?? 'system_worker_health invoke failed');
    assert.equal(
      response.result?.status,
      'ok',
      `expected ok status from system_worker_health; got: ${JSON.stringify(response.result)}`,
    );
  });
});

// ---------------------------------------------------------------------------
// Per-window capability denial — real WebView ACL
//
// tauri::test MockRuntime bypasses the capability file, so the mock-dispatch
// path in Tier-1 cannot prove the ACL is enforced. This spec drives the real
// WebView to call a command that is only granted to the `main` window and
// asserts that the real ACL layer denies it when called from `settings`.
// One denial proof on a supported WebDriver target (Win/Linux) is sufficient —
// the denial decision is platform-independent Rust (RuntimeAuthority).
// ---------------------------------------------------------------------------
describe('Tier-2: per-window capability denial (real WebView ACL)', () => {
  it('settings window cannot invoke mutating commands — workspace_create denied by real ACL', async () => {
    const shellHandle = await findShellWindow();
    assert.ok(shellHandle, 'shell window must be reachable to open the settings window');
    await browser.switchToWindow(shellHandle);

    // Open the settings window from the main context.
    await invokeIpc('system_window_open', { window: 'settings' });

    let settingsHandle;
    await browser.waitUntil(
      async () => {
        const handles = await browser.getWindowHandles();
        for (const handle of handles) {
          try {
            await browser.switchToWindow(handle);
            const pathname = await browser.execute(() => window.location.pathname ?? '');
            if (String(pathname).includes('/settings')) {
              settingsHandle = handle;
              return true;
            }
          } catch {
            // window not yet ready — keep polling
          }
        }
        return false;
      },
      { timeout: 30_000, timeoutMsg: 'settings window did not open within 30 s' },
    );

    await browser.switchToWindow(settingsHandle);

    // workspace_create is in appcommands-mutating, which is only granted to the
    // `main` window (security_posture.rs::mutating_commands_are_granted_only_to_the_main_window).
    // Invoking it from the settings WebView must be denied by Tauri's RuntimeAuthority —
    // proving the real capability boundary is enforced, not just declared in config files.
    const denial = await browser.executeAsync((done) => {
      const invoke = window.__TAURI_INTERNALS__?.invoke;
      if (!invoke) {
        done({ denied: false, reason: 'no-tauri-invoke' });
        return;
      }
      invoke('workspace_create', {
        request: {
          requestId: 'acl-deny-probe',
          payload: { root: '/tmp/acl-deny-probe' },
        },
      })
        .then(() => done({ denied: false }))
        .catch((error) => done({ denied: true, error: String(error) }));
    });

    assert.notEqual(
      denial.reason,
      'no-tauri-invoke',
      'denial must originate from the Tauri ACL layer, not from a missing __TAURI_INTERNALS__ hook',
    );
    assert.equal(
      denial.denied,
      true,
      `workspace_create must be denied from the settings window by the real WebView ACL layer; ` +
        `got: ${JSON.stringify(denial)}`,
    );
  });
});
