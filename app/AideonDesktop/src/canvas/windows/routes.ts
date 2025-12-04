export type WindowRoute =
  | 'main'
  | 'splash'
  | 'status'
  | 'about'
  | 'settings'
  | 'styleguide';

export const windowRoutes: WindowRoute[] = [
  'main',
  'splash',
  'status',
  'about',
  'settings',
  'styleguide',
];

export function toAppUrl(route: WindowRoute): string {
  // We keep routing hash-based to avoid querystring parsing in the renderer and host.
  return `index.html#/${route}`;
}
