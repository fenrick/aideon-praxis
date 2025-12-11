import { mountWindow } from 'canvas/windows/bootstrap';
import { describe, expect, it, vi } from 'vitest';

describe('mountWindow', () => {
  it('warns when root is missing', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {
      return;
    });
    mountWindow(<div>hello</div>);
    expect(warn).toHaveBeenCalledWith('window mount skipped: #root missing');
    warn.mockRestore();
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
