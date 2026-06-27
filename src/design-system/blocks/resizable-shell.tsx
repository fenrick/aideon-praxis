import type { ReactNode } from 'react';

import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '../components/ui/resizable';

const CONTENT_MIN_SIZE = 40;
const INSPECTOR_MIN_SIZE = 20;
const DEFAULT_SIZES: readonly [number, number] = [65, 35];

export interface ResizableShellProperties {
  readonly contentSlot: ReactNode;
  readonly inspectorSlot: ReactNode;
  /** Initial panel sizes as [content%, inspector%]. Defaults to [65, 35]. */
  readonly defaultSizes?: readonly [number, number];
  /** Called with the new sizes whenever panels are resized. Wire to ADR-0026 persistence. */
  readonly onLayout?: (sizes: number[]) => void;
}

/**
 * Content-dominant resizable shell. The content region is primary (≥ 40%);
 * the inspector region is secondary (≥ 20%). Size preferences are NOT
 * persisted here — wire `onLayout` to the host's ADR-0026 persistent UI state.
 * @param root0 - Shell properties.
 * @param root0.contentSlot - Primary content region.
 * @param root0.inspectorSlot - Secondary inspector region.
 * @param root0.defaultSizes - Initial sizes as [content%, inspector%].
 * @param root0.onLayout - Called on resize; wire to ADR-0026 persistent UI state.
 */
export function ResizableShell({
  contentSlot,
  inspectorSlot,
  defaultSizes = DEFAULT_SIZES,
  onLayout,
}: ResizableShellProperties) {
  return (
    <ResizablePanelGroup direction="horizontal" onLayout={onLayout} className="h-full w-full">
      <ResizablePanel defaultSize={defaultSizes[0]} minSize={CONTENT_MIN_SIZE}>
        {contentSlot}
      </ResizablePanel>
      <ResizableHandle withHandle />
      <ResizablePanel defaultSize={defaultSizes[1]} minSize={INSPECTOR_MIN_SIZE}>
        {inspectorSlot}
      </ResizablePanel>
    </ResizablePanelGroup>
  );
}
