import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useIsMobile } from '../../../src/design-system/hooks/use-mobile';

describe('useIsMobile', () => {
  let changeHandler: ((event: MediaQueryListEvent) => void) | undefined;
  const removeChangeListener = vi.fn();

  beforeEach(() => {
    window.innerWidth = 1024;
    changeHandler = undefined;
    removeChangeListener.mockClear();

    vi.stubGlobal(
      'matchMedia',
      vi.fn().mockImplementation(() => ({
        matches: window.innerWidth < 768,
        addEventListener: (_event: string, handler: (event: MediaQueryListEvent) => void) => {
          changeHandler = handler;
        },
        removeEventListener: (_event: string, handler: (event: MediaQueryListEvent) => void) => {
          removeChangeListener(handler);
        },
      })),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('tracks viewport changes around the mobile breakpoint', async () => {
    const { result, unmount } = renderHook(() => useIsMobile());

    await waitFor(() => expect(result.current).toBe(false));

    act(() => {
      window.innerWidth = 640;
      changeHandler?.({ matches: true } as MediaQueryListEvent);
    });

    await waitFor(() => expect(result.current).toBe(true));

    unmount();

    expect(removeChangeListener).toHaveBeenCalledWith(changeHandler);
  });
});
