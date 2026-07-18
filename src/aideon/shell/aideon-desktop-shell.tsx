import type { CSSProperties, ReactNode, RefObject } from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';

import { ResizableShell, ScrollArea } from 'design-system';
import { SidebarInset, SidebarProvider } from 'design-system/desktop-shell';
import { cn } from 'design-system/lib/utilities';

import { AideonShellControlsProvider } from './shell-controls';

/**
 * How the content slot fills the surface.
 * - `scroll`: padded, scrollable region (default). Catalogues, reports, pages.
 * - `full-bleed`: edge-to-edge, no padding, no scroll. Canvases, maps.
 */
type ContentLayout = 'scroll' | 'full-bleed';

const INSPECTOR_COLLAPSED_STORAGE_KEY = 'aideon-shell-inspector-collapsed';
const PANEL_SIZES_STORAGE_KEY = 'aideon-shell-panel-sizes';
const DEFAULT_PANEL_SIZES: readonly [number, number] = [65, 35];

interface AideonDesktopShellProperties {
  readonly navigation: ReactNode;
  readonly content: ReactNode;
  readonly inspector: ReactNode;
  readonly toolbar?: ReactNode;
  readonly contentLayout?: ContentLayout;
  readonly className?: string;
}

/**
 * Resolve `localStorage` without assuming a browser environment (tests, SSR,
 * locked-down hosts). Returns `undefined` when it is unavailable.
 */
function getLocalStorage(): Storage | undefined {
  try {
    const storage = (globalThis as { localStorage?: Storage }).localStorage;
    if (storage && typeof storage.getItem === 'function') {
      return storage;
    }
  } catch {
    /* ignore */
  }
  return undefined;
}

/**
 * Read the persisted inspector collapse flag, defaulting to expanded.
 */
function readInspectorCollapsed(): boolean {
  try {
    return getLocalStorage()?.getItem(INSPECTOR_COLLAPSED_STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

/**
 * Read the persisted `[content%, inspector%]` panel split (ADR-0026 UI state),
 * falling back to the content-dominant default when unset or malformed.
 */
function readPanelSizes(): readonly [number, number] {
  const storage = getLocalStorage();
  if (!storage) {
    return DEFAULT_PANEL_SIZES;
  }
  try {
    const raw = storage.getItem(PANEL_SIZES_STORAGE_KEY);
    if (raw) {
      const parsed: unknown = JSON.parse(raw);
      if (
        Array.isArray(parsed) &&
        parsed.length === 2 &&
        typeof parsed[0] === 'number' &&
        typeof parsed[1] === 'number'
      ) {
        return [parsed[0], parsed[1]];
      }
    }
  } catch {
    /* ignore */
  }
  return DEFAULT_PANEL_SIZES;
}

/** The live state and handlers driving the inspector collapse and panel split. */
interface InspectorPanelState {
  readonly inspectorCollapsed: boolean;
  readonly toggleInspector: () => void;
  readonly restoreSizes: readonly [number, number];
  readonly handlePanelLayout: (sizes: number[]) => void;
}

/**
 * Own the inspector collapse flag and the persisted `[content%, inspector%]`
 * split. `restoreSizes` is the value the split mounts with (first mount or
 * restore after a collapse); the ref tracks live drag sizes without
 * re-rendering the content surface and seeds `restoreSizes` on the next toggle.
 * The ref is only read in event handlers, never during render.
 */
function useInspectorPanel(): InspectorPanelState {
  const [inspectorCollapsed, setInspectorCollapsed] = useState(readInspectorCollapsed);
  const [restoreSizes, setRestoreSizes] = useState<readonly [number, number]>(readPanelSizes);
  const panelSizesReference = useRef<readonly [number, number]>(restoreSizes);

  const persistInspectorCollapsed = useCallback((next: boolean) => {
    try {
      getLocalStorage()?.setItem(INSPECTOR_COLLAPSED_STORAGE_KEY, next ? '1' : '0');
    } catch {
      /* ignore */
    }
  }, []);

  const toggleInspector = useCallback(() => {
    // Remount the restored split at the last-known drag position.
    setRestoreSizes(panelSizesReference.current);
    setInspectorCollapsed((previous) => {
      const next = !previous;
      persistInspectorCollapsed(next);
      return next;
    });
  }, [persistInspectorCollapsed]);

  const handlePanelLayout = useCallback((sizes: number[]) => {
    const [contentSize, inspectorSize] = sizes;
    if (typeof contentSize !== 'number' || typeof inspectorSize !== 'number') {
      return;
    }
    const next: [number, number] = [contentSize, inspectorSize];
    panelSizesReference.current = next;
    try {
      getLocalStorage()?.setItem(PANEL_SIZES_STORAGE_KEY, JSON.stringify(next));
    } catch {
      /* ignore */
    }
  }, []);

  return { inspectorCollapsed, toggleInspector, restoreSizes, handlePanelLayout };
}

/** The measured header ref and its live pixel height. */
interface HeaderHeightState {
  readonly headerReference: RefObject<HTMLElement | null>;
  readonly headerHeight: number;
}

/**
 * Measure the toolbar height so a one- or two-row toolbar both dock the sidebars
 * at the same offset, and reflow when the toolbar wraps.
 * @param toolbar - The toolbar node, watched so the observer resets when it changes.
 */
function useHeaderHeight(toolbar: ReactNode): HeaderHeightState {
  const headerReference = useRef<HTMLElement>(null);
  const [headerHeight, setHeaderHeight] = useState(0);
  useEffect(() => {
    const element = headerReference.current;
    if (!element || typeof ResizeObserver === 'undefined') {
      return;
    }
    const observer = new ResizeObserver(() => {
      setHeaderHeight(element.offsetHeight);
    });
    observer.observe(element);
    setHeaderHeight(element.offsetHeight);
    return () => {
      observer.disconnect();
    };
  }, [toolbar]);
  return { headerReference, headerHeight };
}

/**
 * The padded scrollable (or full-bleed) content slot of the shell.
 * @param root0 - Component props.
 * @param root0.contentLayout - How content fills the surface.
 * @param root0.children - Content surface.
 */
function ShellContentRegion({
  contentLayout,
  children,
}: {
  readonly contentLayout: ContentLayout;
  readonly children: ReactNode;
}) {
  if (contentLayout === 'full-bleed') {
    return (
      <div
        aria-label="Main content"
        className="h-full min-w-0 overflow-hidden"
        data-testid="aideon-shell-content"
      >
        {children}
      </div>
    );
  }
  return (
    <ScrollArea
      aria-label="Main content"
      className="h-full min-w-0"
      data-testid="aideon-shell-content"
    >
      <div className="min-h-full p-4 md:p-6">{children}</div>
    </ScrollArea>
  );
}

/**
 * The inspector slot wrapper of the shell.
 * @param root0 - Component props.
 * @param root0.children - Inspector contents.
 */
function ShellInspectorRegion({ children }: { readonly children: ReactNode }) {
  return (
    <div
      aria-label="Inspector"
      className="h-full min-h-0 overflow-auto"
      data-testid="aideon-shell-inspector"
    >
      {children}
    </div>
  );
}

/**
 * The content-plus-inspector body: the bare content region when the inspector is
 * collapsed, otherwise a content-dominant resizable split.
 * @param root0 - Component props.
 * @param root0.content - Content surface.
 * @param root0.inspector - Inspector contents.
 * @param root0.contentLayout - How content fills the surface.
 * @param root0.panel - Inspector collapse and panel-split state.
 */
function ShellMainRegion({
  content,
  inspector,
  contentLayout,
  panel,
}: {
  readonly content: ReactNode;
  readonly inspector: ReactNode;
  readonly contentLayout: ContentLayout;
  readonly panel: InspectorPanelState;
}) {
  const contentRegion = (
    <ShellContentRegion contentLayout={contentLayout}>{content}</ShellContentRegion>
  );
  if (panel.inspectorCollapsed) {
    return contentRegion;
  }
  return (
    <ResizableShell
      defaultSizes={panel.restoreSizes}
      onLayout={panel.handlePanelLayout}
      contentSlot={contentRegion}
      inspectorSlot={<ShellInspectorRegion>{inspector}</ShellInspectorRegion>}
    />
  );
}

/**
 * The Aideon desktop frame. A full-width toolbar spans the top; below it the
 * navigation rail and a content-dominant resizable split (content surface plus
 * inspector rail) sit in one row. The toolbar lives inside the navigation
 * `SidebarProvider` so its toggle and ⌘B drive the nav rail. The inspector is
 * the secondary pane of a {@link ResizableShell}; ⌘I / the toolbar toggle
 * collapse and restore it, and the drag split persists to `localStorage`.
 * @param root0 - Component props.
 * @param root0.navigation - Navigation rail (a Sidebar).
 * @param root0.content - Content surface.
 * @param root0.inspector - Inspector contents.
 * @param root0.toolbar - Full-width top toolbar.
 * @param root0.contentLayout - How content fills the surface.
 * @param root0.className - Optional wrapper class.
 */
export function AideonDesktopShell({
  navigation,
  content,
  inspector,
  toolbar,
  contentLayout = 'scroll',
  className,
}: AideonDesktopShellProperties) {
  const panel = useInspectorPanel();
  const { headerReference, headerHeight } = useHeaderHeight(toolbar);

  const headerStyle = {
    '--header-height': toolbar ? `${String(headerHeight)}px` : '0px',
  } as CSSProperties;

  return (
    <AideonShellControlsProvider
      value={{
        inspectorCollapsed: panel.inspectorCollapsed,
        toggleInspector: panel.toggleInspector,
      }}
    >
      <SidebarProvider className={cn('flex-col', className)} style={headerStyle}>
        {toolbar ? (
          <header
            ref={headerReference}
            data-tauri-drag-region
            className="bg-background/95 border-border z-30 flex shrink-0 flex-col border-b backdrop-blur"
          >
            {toolbar}
          </header>
        ) : undefined}

        <div className="flex min-h-0 flex-1">
          {navigation}

          <SidebarInset className="min-w-0">
            <ShellMainRegion
              content={content}
              inspector={inspector}
              contentLayout={contentLayout}
              panel={panel}
            />
          </SidebarInset>
        </div>
      </SidebarProvider>
    </AideonShellControlsProvider>
  );
}
