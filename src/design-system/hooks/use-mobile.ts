import * as React from 'react';

const MOBILE_BREAKPOINT = 768;
const MOBILE_QUERY = `(max-width: ${String(MOBILE_BREAKPOINT - 1)}px)`;

/**
 * Subscribe to viewport breakpoint changes via matchMedia.
 * @param onChange - Callback invoked when the breakpoint match changes.
 * @returns Cleanup function removing the listener.
 */
function subscribeToViewportChange(onChange: () => void): () => void {
  const mediaQueryList = globalThis.matchMedia(MOBILE_QUERY);
  mediaQueryList.addEventListener('change', onChange);
  return () => {
    mediaQueryList.removeEventListener('change', onChange);
  };
}

/**
 * Read the current mobile state from the viewport width.
 * @returns True when the viewport is narrower than the mobile breakpoint.
 */
function isViewportMobile(): boolean {
  return globalThis.innerWidth < MOBILE_BREAKPOINT;
}

/**
 * Track whether the viewport is below the mobile breakpoint.
 * @returns True when the viewport width is below the mobile breakpoint.
 */
export function useIsMobile(): boolean {
  return React.useSyncExternalStore(subscribeToViewportChange, isViewportMobile, () => false);
}
