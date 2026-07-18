import { SurfaceRouter } from './surfaces/surface-router';

/** Toolbar slot — not yet implemented. */
export function PlatformToolbar(): undefined {
  return undefined;
}

/**
 * Content slot. Renders the active goal surface selected in the navigation rail
 * via the surface router (workspace home, modelling studio, and placeholders).
 */
export function PlatformContent() {
  return <SurfaceRouter />;
}

/** Inspector slot — not yet implemented. */
export function PlatformInspector(): undefined {
  return undefined;
}
