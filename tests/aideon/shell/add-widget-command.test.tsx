import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

const hostPlatformState = {
  onToggleWidgetLibrary: vi.fn(),
};

vi.mock('platform/host-platform-context', () => ({
  useHostPlatform: () => hostPlatformState,
}));

describe('useAddWidgetCommand', () => {
  it('opens the widget library through the shared handler when selected', async () => {
    const { useAddWidgetCommand } = await import('aideon/shell/use-add-widget-command');
    const { result } = renderHook(() => useAddWidgetCommand());

    expect(result.current.label).toBe('Add widget');
    result.current.onSelect();

    expect(hostPlatformState.onToggleWidgetLibrary).toHaveBeenCalledWith(true);
  });
});
