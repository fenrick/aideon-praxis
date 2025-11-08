import { Button, setUiTheme } from '@aideon/design-system';
import { beforeEach, describe, expect, it } from 'vitest';

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

  it('applies neutral button styling on linux', async () => {
    await setUiTheme('linux');

    const host = document.createElement('div');
    document.body.append(host);

    const button = new Button({
      target: host,
      props: {
        children: () => 'Hello',
      },
    });

    const rendered = host.querySelector('button');
    expect(rendered).toBeTruthy();
    expect(rendered?.classList.contains('btn-neutral')).toBe(true);
    expect(rendered?.classList.contains('btn-neutral-primary')).toBe(false);
    expect(document.head.querySelector('#aideon-neutral-css')).toBeTruthy();
    expect(document.documentElement.classList.contains('platform-linux')).toBe(true);

    button.$destroy();
    host.remove();
  });
});
