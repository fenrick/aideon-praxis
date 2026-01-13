import { expect } from '@wdio/globals';

const MAIN_TITLE = 'Aideon';
const SPLASH_TITLE = 'Aideon — Loading';
const SYSTEM_COMMANDS = {
  setupState: 'system_setup_state',
  windowOpen: 'system_window_open',
};
const LEGACY_COMMANDS = {
  setupState: 'get_setup_state',
  openWindow: (window) => `open_${window}`,
};

async function safeExecute(fn) {
  try {
    return await browser.execute(fn);
  } catch {
    return null;
  }
}

async function findWindow(matchFn) {
  const handles = await browser.getWindowHandles();
  for (const handle of handles) {
    try {
      await browser.switchToWindow(handle);
    } catch {
      continue;
    }
    const info = await safeExecute(() => ({
      title: document.title,
      pathname: window.location.pathname,
      text: document.body?.innerText ?? '',
      shell: Boolean(document.querySelector('[data-testid="aideon-shell-content"]')),
    }));
    if (info && matchFn(info)) {
      return { handle, info };
    }
  }
  return null;
}

function isMainPath(pathname) {
  return pathname === '/' || pathname.endsWith('/index.html');
}

async function ensureMainWindow() {
  let mainHandle;
  await browser.waitUntil(
    async () => {
      const found = await findWindow(({ title, pathname, shell }) => {
        return title === MAIN_TITLE && (isMainPath(pathname) || shell);
      });
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

async function invokeEnvelopeCommand(command, payload) {
  const result = await browser.executeAsync(
    (cmd, reqPayload, done) => {
      const tauri = window.__TAURI_INTERNALS__;
      if (!tauri?.invoke) {
        done({ ok: false, error: 'Tauri internals not available' });
        return;
      }
      const requestId = `${crypto.randomUUID()}-${Date.now()}`;
      tauri
        .invoke(cmd, { request: { requestId, payload: reqPayload } })
        .then((response) => done({ ok: true, response }))
        .catch((error) => done({ ok: false, error: String(error) }));
    },
    command,
    payload,
  );
  if (!result.ok) {
    throw new Error(result.error || `IPC command ${command} failed`);
  }
  if (result.response?.status && result.response.status !== 'ok') {
    throw new Error(
      `IPC command ${command} failed: ${result.response?.error?.message ?? 'unknown error'}`,
    );
  }
  return result.response?.result;
}

async function invokeCommand(command, payload) {
  const result = await browser.executeAsync(
    (cmd, reqPayload, done) => {
      const tauri = window.__TAURI_INTERNALS__;
      if (!tauri?.invoke) {
        done({ ok: false, error: 'Tauri internals not available' });
        return;
      }
      tauri
        .invoke(cmd, reqPayload)
        .then((response) => done({ ok: true, response }))
        .catch((error) => done({ ok: false, error: String(error) }));
    },
    command,
    payload,
  );
  if (!result.ok) {
    throw new Error(result.error || `Command ${command} failed`);
  }
  return result.response;
}

function isCommandNotFound(error) {
  const message = error instanceof Error ? error.message : String(error ?? '');
  return /command .* not found/i.test(message);
}

async function invokeWithFallback(
  primaryCommand,
  payload,
  fallbackCommand,
  fallbackPayload = payload,
) {
  try {
    return await invokeEnvelopeCommand(primaryCommand, payload);
  } catch (error) {
    if (!isCommandNotFound(error)) {
      throw error;
    }
  }
  return invokeCommand(fallbackCommand, fallbackPayload);
}

async function getSetupState() {
  return invokeWithFallback(SYSTEM_COMMANDS.setupState, {}, LEGACY_COMMANDS.setupState, {});
}

describe('Aideon Praxis desktop', () => {
  it('shows splash then main window', async () => {
    let splashHandle;
    try {
      await browser.waitUntil(
        async () => {
          const found = await findWindow(
            ({ title, pathname, text }) =>
              title === SPLASH_TITLE ||
              pathname.includes('/splash') ||
              text.includes('Reticulating splines'),
          );
          if (found) {
            splashHandle = found.handle;
            return true;
          }
          return false;
        },
        { timeout: 10000 },
      );
    } catch {
      splashHandle = undefined;
    }

    const mainHandle = await ensureMainWindow();

    await browser.waitUntil(
      async () => {
        const state = await getSetupState().catch(() => null);
        if (state?.frontend && state?.backend) {
          return true;
        }
        if (state?.backend) {
          if (splashHandle) {
            const open = (await browser.getWindowHandles()).includes(splashHandle);
            return !open;
          }
          const splash = await findWindow(
            ({ title, pathname }) => title === SPLASH_TITLE || pathname.includes('/splash'),
          );
          return !splash;
        }
        return false;
      },
      { timeout: 60000, timeoutMsg: 'Setup state never reached frontend+backend' },
    );

    if (splashHandle) {
      await browser.waitUntil(
        async () => !(await browser.getWindowHandles()).includes(splashHandle),
        { timeout: 60000, timeoutMsg: 'Splash window did not close' },
      );
    }

    await browser.switchToWindow(mainHandle);
    const shell = await browser.$('[data-testid="aideon-shell-content"]');
    await shell.waitForExist({ timeout: 30000 });
    await expect(shell).toBeExisting();

    const pathname = await browser.execute(() => window.location.pathname);
    await expect(isMainPath(pathname)).toBe(true);
  });

  it('opens auxiliary windows (settings/about/status/styleguide)', async () => {
    await ensureMainWindow();

    const windowsToOpen = [
      { window: 'settings', path: '/settings', text: 'Settings' },
      { window: 'about', path: '/about', text: 'Aideon' },
      { window: 'status', path: '/status', text: 'Host status' },
      { window: 'styleguide', path: '/styleguide', text: 'Styleguide' },
    ];

    for (const entry of windowsToOpen) {
      await invokeWithFallback(
        SYSTEM_COMMANDS.windowOpen,
        { window: entry.window },
        LEGACY_COMMANDS.openWindow(entry.window),
        {},
      );
      await browser.waitUntil(
        async () => {
          const found = await findWindow(
            ({ pathname, text }) =>
              pathname.includes(entry.path) || (entry.text && text.includes(entry.text)),
          );
          return Boolean(found?.handle);
        },
        { timeout: 30000, timeoutMsg: `Window ${entry.path} did not appear` },
      );
    }
  });
});
