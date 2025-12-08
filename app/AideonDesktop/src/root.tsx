import { PraxisCanvasSurface } from './canvas';

/**
 * Application root mounting the Praxis Scenario / Template experience.
 * The surface already renders inside the three-pane shell.
 */
export function AideonDesktopRoot() {
  return <PraxisCanvasSurface />;
}
