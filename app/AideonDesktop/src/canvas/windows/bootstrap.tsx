import type { ReactElement } from 'react';
import { createRoot } from 'react-dom/client';

/**
 * Mount a window payload to the #root element if it exists.
 * Keeps window entrypoints tiny and consistent.
 * @param element
 */
export function mountWindow(element: ReactElement) {
  const rootElement = document.querySelector('#root');
  if (!rootElement) {
    console.warn('window mount skipped: #root missing');
    return;
  }
  createRoot(rootElement).render(element);
}
