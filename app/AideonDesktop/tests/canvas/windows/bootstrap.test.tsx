import { describe, expect, it, vi } from 'vitest';
import { mountWindow } from 'canvas/windows/bootstrap';

describe('mountWindow', () => {
  it('warns when root is missing', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    mountWindow(<div>hello</div>);
    expect(warn).toHaveBeenCalledWith('window mount skipped: #root missing');
    warn.mockRestore();
  });

  it('creates a root when #root exists', async () => {
    const container = document.createElement('div');
    container.id = 'root';
    document.body.appendChild(container);
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

    mountWindow(<div>ready</div>);
    await Promise.resolve();
    expect(warn).not.toHaveBeenCalled();
    warn.mockRestore();

    container.remove();
  });
});
