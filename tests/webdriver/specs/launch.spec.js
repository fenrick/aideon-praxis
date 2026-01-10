import { expect } from '@wdio/globals';

async function findWindow(matchFn) {
  const handles = await browser.getWindowHandles();
  for (const handle of handles) {
    await browser.switchToWindow(handle);
    const info = await browser.execute(() => ({
      hash: window.location.hash,
      text: document.body?.innerText ?? '',
      hasRoot: Boolean(document.getElementById('root')),
    }));
    if (matchFn(info)) {
      return { handle, info };
    }
  }
  return null;
}

async function ensureMainWindow() {
  let mainHandle;
  await browser.waitUntil(
    async () => {
      const found = await findWindow(({ hash }) => hash.includes('/main'));
      if (found) {
        mainHandle = found.handle;
        return true;
      }
      return false;
    },
    { timeout: 60000, timeoutMsg: 'Main window did not appear' },
  );
  await browser.switchToWindow(mainHandle);
  return mainHandle;
}

async function invokeTauri(command) {
  const result = await browser.executeAsync((cmd, done) => {
    const tauri = window.__TAURI_INTERNALS__;
    if (!tauri?.invoke) {
      done({ ok: false, error: 'Tauri internals not available' });
      return;
    }
    tauri
      .invoke(cmd)
      .then(() => done({ ok: true }))
      .catch((error) => done({ ok: false, error: String(error) }));
  }, command);
  await expect(result.ok).toBe(true);
}

describe('Aideon Praxis desktop', () => {
  it('shows splash then main window', async () => {
    let splashHandle;
    await browser.waitUntil(
      async () => {
        const found = await findWindow(
          ({ hash, text }) => hash.includes('splash') || text.includes('Loading workspace'),
        );
        if (found) {
          splashHandle = found.handle;
          return true;
        }
        return false;
      },
      { timeout: 30000, timeoutMsg: 'Splash window did not appear' },
    );

    const mainHandle = await ensureMainWindow();

    if (splashHandle) {
      await browser.waitUntil(
        async () => !(await browser.getWindowHandles()).includes(splashHandle),
        { timeout: 60000, timeoutMsg: 'Splash window did not close' },
      );
    }

    await browser.switchToWindow(mainHandle);
    const root = await browser.$('#root');
    await root.waitForExist({ timeout: 30000 });
    await expect(root).toBeExisting();

    const hash = await browser.execute(() => window.location.hash);
    await expect(hash).toContain('/main');
  });

  it('opens auxiliary windows (settings/about/status/styleguide)', async () => {
    await ensureMainWindow();

    const windowsToOpen = [
      { command: 'open_settings', hash: '/settings' },
      { command: 'open_about', hash: '/about' },
      { command: 'open_status', hash: '/status' },
      { command: 'open_styleguide', hash: '/styleguide' },
    ];

    for (const entry of windowsToOpen) {
      await invokeTauri(entry.command);
      await browser.waitUntil(
        async () => {
          const found = await findWindow(({ hash }) => hash.includes(entry.hash));
          return Boolean(found?.handle);
        },
        { timeout: 30000, timeoutMsg: `Window ${entry.hash} did not appear` },
      );
    }
  });
});
