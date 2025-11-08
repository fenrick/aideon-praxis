import type { UiTheme } from '@aideon/design-system';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Extended coverage for @aideon/design-system/theme/platform.ts

// Helper to mutate UA for auto-detection branches
function withUserAgent(ua: string) {
  const nav = globalThis.navigator as any;
  const original = nav.userAgent;
  try {
    Object.defineProperty(nav, 'userAgent', { configurable: true, value: ua });
  } catch {
    // Some environments mark UA non-configurable; in that case, skip UA-dependent checks
  }
  return () => {
    try {
      Object.defineProperty(nav, 'userAgent', { configurable: true, value: original });
    } catch {
      // ignore
    }
  };
}

function resetDom() {
  document.head.querySelector('#aideon-neutral-css')?.remove();
  document.head.querySelector('#aideon-puppertino-css')?.remove();
  document.documentElement.classList.remove('platform-mac', 'platform-win', 'platform-linux');
}

describe('theme/platform extended', () => {
  beforeEach(() => {
    vi.resetModules();
    resetDom();
    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    resetDom();
    localStorage.clear();
  });

  it('auto-detects from userAgent and emits event', async () => {
    const restoreUA = withUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X)');
    const platform = await import('@aideon/design-system');

    const calls: string[] = [];
    const off = platform.onUiThemeChange((t: UiTheme) => calls.push(t));
    await platform.setUiTheme('auto');

    expect(platform.getUiTheme()).toBe('auto');
    // Resolved should be mac on this UA
    expect(platform.getResolvedUiTheme()).toBe('mac');
    expect(document.documentElement.classList.contains('platform-mac')).toBe(true);
    expect(calls.at(-1)).toBe('mac');

    // Unsubscribe stops further notifications
    off();
    await platform.setUiTheme('neutral');
    expect(calls.at(-1)).toBe('mac');

    restoreUA();
  });

  it('initializes from localStorage via initUiTheme()', async () => {
    localStorage.setItem('aideon.platform', 'win');
    const platform = await import('@aideon/design-system');
    await platform.initUiTheme();
    expect(platform.getUiTheme()).toBe('win');
    expect(platform.getResolvedUiTheme()).toBe('win');
  });

  it('treats linux as neutral while keeping the stylesheet', async () => {
    const platform = await import('@aideon/design-system');
    await platform.setUiTheme('neutral');
    const neutralLink = document.head.querySelector('#aideon-neutral-css');
    expect(neutralLink).toBeTruthy();
    await platform.setUiTheme('linux');
    expect(document.head.querySelector('#aideon-neutral-css')).toBe(neutralLink);
    expect(document.head.querySelector('#aideon-puppertino-css')).toBeFalsy();
    expect(document.documentElement.classList.contains('platform-linux')).toBe(true);
  });

  it('does not duplicate the neutral stylesheet on repeated selection', async () => {
    const platform = await import('@aideon/design-system');
    await platform.setUiTheme('neutral');
    await platform.setUiTheme('neutral');
    const links = document.head.querySelectorAll('#aideon-neutral-css');
    expect(links.length).toBe(1);
  });

  it('registers Fluent components on Windows (mock success)', async () => {
    vi.resetModules();
    vi.doMock('@fluentui/web-components', () => {
      const register = vi.fn();
      return {
        provideFluentDesignSystem: () => ({ register }),
        fluentButton: () => ({}),
        fluentTextField: () => ({}),
        fluentSelect: () => ({}),
      };
    });

    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const platform = await import('@aideon/design-system');
    await platform.setUiTheme('win');
    // No warnings on success path
    expect(warnSpy).not.toHaveBeenCalled();
  });

  it('logs a warning if Fluent registration fails', async () => {
    vi.resetModules();
    // Make the dynamic import throw at evaluation time
    vi.doMock('@fluentui/web-components', () => {
      throw new Error('import failed');
    });
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const platform = await import('@aideon/design-system');
    await platform.setUiTheme('win');
    expect(warnSpy).toHaveBeenCalled();
  });
});
