import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';

import { resolveSurface } from './surface-registry';

interface ActiveSurfaceContextValue {
  readonly activeSurfaceId: string;
  readonly setActiveSurface: (surfaceId: string) => void;
}

const ActiveSurfaceContext = createContext<ActiveSurfaceContextValue | undefined>(undefined);

interface SurfaceProviderProperties {
  readonly children: ReactNode;
}

/**
 * Provides the active-surface state shared by the navigation rail and the
 * surface router. Must wrap both so selecting a destination in the rail routes
 * the content area. Defaults to the workspace home surface.
 * @param root0 - Component props.
 * @param root0.children - Subtree that reads and drives the active surface.
 */
export function SurfaceProvider({ children }: SurfaceProviderProperties) {
  const [activeSurfaceId, setActiveSurfaceId] = useState('home');
  const value = useMemo<ActiveSurfaceContextValue>(
    () => ({ activeSurfaceId, setActiveSurface: setActiveSurfaceId }),
    [activeSurfaceId],
  );
  return <ActiveSurfaceContext.Provider value={value}>{children}</ActiveSurfaceContext.Provider>;
}

/**
 * Read and drive the active surface. Throws when rendered outside a
 * {@link SurfaceProvider}.
 */
export function useActiveSurface(): ActiveSurfaceContextValue {
  const context = useContext(ActiveSurfaceContext);
  if (!context) {
    throw new Error('Surface components must be rendered within a SurfaceProvider.');
  }
  return context;
}

/**
 * Renders the active surface's component. Selecting a destination in the
 * navigation rail swaps what is shown here.
 */
export function SurfaceRouter() {
  const { activeSurfaceId } = useActiveSurface();
  const ActiveSurface = resolveSurface(activeSurfaceId).Component;
  return <ActiveSurface />;
}
