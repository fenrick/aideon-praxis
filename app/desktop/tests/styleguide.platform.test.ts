import { beforeEach, describe, expect, it } from 'vitest';

// Use relative import to avoid Vite path alias resolution issues in vitest
import { setUiTheme } from '../src/lib/theme/platform';

describe('platform theme loader', () => {
  beforeEach(() => {
    // Clean up any injected styles between tests
    document.head.querySelector('#aideon-neutral-css')?.remove();
    document.head.querySelector('#aideon-puppertino-css')?.remove();
    document.documentElement.classList.remove('platform-mac', 'platform-win', 'platform-linux');
    localStorage.clear();
  });

  it('injects Tailwind only for neutral', async () => {
    await setUiTheme('neutral');
    expect(document.head.querySelector('#aideon-neutral-css')).toBeTruthy();

    await setUiTheme('mac');
    expect(document.head.querySelector('#aideon-neutral-css')).toBeFalsy();
    expect(document.head.querySelector('#aideon-puppertino-css')).toBeTruthy();

    await setUiTheme('win');
    expect(document.head.querySelector('#aideon-puppertino-css')).toBeFalsy();
  });

  it('sets platform classes on root', async () => {
    await setUiTheme('mac');
    expect(document.documentElement.classList.contains('platform-mac')).toBe(true);
    await setUiTheme('win');
    expect(document.documentElement.classList.contains('platform-win')).toBe(true);
  });
});
