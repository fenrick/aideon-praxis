import type { ReactElement } from 'react';
import { createRoot } from 'react-dom/client';

/**
 * Mount a window payload to the #root element if it exists.
 * Keeps window entrypoints tiny and consistent.
 */
export function mountWindow(element: ReactElement) {
  const rootEl = document.querySelector('#root');
  if (!rootEl) {
    console.warn('window mount skipped: #root missing');
    return;
  }
  createRoot(rootEl).render(element);
}
