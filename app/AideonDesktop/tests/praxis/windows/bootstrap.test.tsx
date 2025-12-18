import { mountWindow } from 'praxis/windows/bootstrap';
import { describe, expect, it, vi } from 'vitest';

describe('mountWindow', () => {
  it('is a no-op when root is missing', () => {
    mountWindow(<div>hello</div>);
    expect(document.querySelector('#root')).toBeNull();
  });

  it('creates a root when #root exists', async () => {
    const container = document.createElement('div');
    container.id = 'root';
    document.body.append(container);
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {
      return;
    });

    mountWindow(<div>ready</div>);
    await Promise.resolve();
    expect(warn).not.toHaveBeenCalled();
    warn.mockRestore();

    container.remove();
  });
});
