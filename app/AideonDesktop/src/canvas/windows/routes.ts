export type WindowRoute = 'main' | 'splash' | 'status' | 'about' | 'settings' | 'styleguide';

export const windowRoutes: WindowRoute[] = [
  'main',
  'splash',
  'status',
  'about',
  'settings',
  'styleguide',
];

/**
 * Convert a window route to the renderer URL.
 * @param route - Route identifier.
 * @returns Hash-based URL for the Tauri renderer.
 */
export function toAppUrl(route: WindowRoute): string {
  // We keep routing hash-based to avoid querystring parsing in the renderer and host.
  return `index.html#/${route}`;
}
