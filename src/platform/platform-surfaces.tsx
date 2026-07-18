import { SurfaceRouter } from './surfaces/surface-router';

export { PlatformInspector } from './platform-inspector';
export { PlatformToolbar } from './platform-toolbar';

/**
 * Content slot. Renders the active goal surface selected in the navigation rail
 * via the surface router (workspace home, modelling studio, and placeholders).
 */
export function PlatformContent() {
  return <SurfaceRouter />;
}
