import { cleanup, render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useIsMobile } from '../../src/design-system/hooks/use-mobile';

function MobileProbe() {
  const isMobile = useIsMobile();
  return <span data-testid="is-mobile">{isMobile ? 'mobile' : 'desktop'}</span>;
}

describe('useIsMobile', () => {
  let listeners: Set<EventListener>;

  const setViewportWidth = (width: number) => {
    Object.defineProperty(window, 'innerWidth', { value: width, configurable: true, writable: true });
    listeners.forEach((listener) => listener(new Event('change') as unknown as MediaQueryListEvent));
  };

  beforeEach(() => {
    listeners = new Set();
    setViewportWidth(1024);

    vi.spyOn(window, 'matchMedia').mockImplementation((query: string) => ({
      matches: window.innerWidth < 768,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: (_event, listener) => listeners.add(listener),
      removeEventListener: (_event, listener) => listeners.delete(listener),
      dispatchEvent: vi.fn(),
    }));
  });

  afterEach(() => {
    vi.restoreAllMocks();
    listeners.clear();
    cleanup();
  });

  it('returns false on desktop viewports and updates after a change event', async () => {
    render(<MobileProbe />);

    expect(screen.getByTestId('is-mobile').textContent).toBe('desktop');

    setViewportWidth(640);

    await waitFor(() => expect(screen.getByTestId('is-mobile').textContent).toBe('mobile'));
  });

  it('initializes as mobile when the viewport is already below the breakpoint', async () => {
    setViewportWidth(640);

    render(<MobileProbe />);

    await waitFor(() => expect(screen.getByTestId('is-mobile').textContent).toBe('mobile'));
  });
});
