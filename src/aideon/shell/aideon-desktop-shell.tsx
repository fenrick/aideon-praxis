import type { CSSProperties, ReactNode } from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';

import { ScrollArea } from 'design-system';
import {
  Sidebar,
  SidebarContent,
  SidebarInset,
  SidebarProvider,
} from 'design-system/desktop-shell';
import { cn } from 'design-system/lib/utilities';

import { AideonShellControlsProvider } from './shell-controls';

/**
 * How the content slot fills the surface.
 * - `scroll`: padded, scrollable region (default). Catalogues, reports, pages.
 * - `full-bleed`: edge-to-edge, no padding, no scroll. Canvases, maps.
 */
type ContentLayout = 'scroll' | 'full-bleed';

interface AideonDesktopShellProperties {
  readonly navigation: ReactNode;
  readonly content: ReactNode;
  readonly inspector: ReactNode;
  readonly toolbar?: ReactNode;
  readonly contentLayout?: ContentLayout;
  readonly className?: string;
}

/**
 *
 * @param storage
 */
function readInspectorCollapsed(storage: Storage) {
  try {
    return storage.getItem('aideon-shell-inspector-collapsed') === '1';
  } catch {
    return false;
  }
}

/**
 * The Aideon desktop frame. A full-width toolbar spans the top; below it the
 * navigation rail, content surface, and inspector rail sit in one row. The
 * toolbar lives inside the navigation `SidebarProvider` so its toggle and ⌘B
 * drive the nav rail; the inspector has its own provider so it toggles
 * independently. Sidebars dock below the toolbar via `--header-height`.
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
  const [inspectorCollapsed, setInspectorCollapsed] = useState(() => {
    try {
      const storage = (globalThis as unknown as { localStorage?: Storage }).localStorage;
      if (storage && typeof storage.getItem === 'function') {
        return readInspectorCollapsed(storage);
      }
    } catch {
      /* ignore */
    }
    return false;
  });

  const persistInspectorCollapsed = useCallback((next: boolean) => {
    try {
      const storage = (globalThis as unknown as { localStorage?: Storage }).localStorage;
      if (storage && typeof storage.setItem === 'function') {
        storage.setItem('aideon-shell-inspector-collapsed', next ? '1' : '0');
      }
    } catch {
      /* ignore */
    }
  }, []);

  const toggleInspector = useCallback(() => {
    setInspectorCollapsed((previous) => {
      const next = !previous;
      persistInspectorCollapsed(next);
      return next;
    });
  }, [persistInspectorCollapsed]);

  // The toolbar height drives how far the sidebars dock below it. Measure it so
  // a one- or two-row toolbar both align, and reflow when it wraps.
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

  const headerStyle = {
    '--header-height': toolbar ? `${String(headerHeight)}px` : '0px',
  } as CSSProperties;

  return (
    <AideonShellControlsProvider value={{ inspectorCollapsed, toggleInspector }}>
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
            {contentLayout === 'full-bleed' ? (
              <div className="h-full overflow-hidden" data-testid="aideon-shell-content">
                {content}
              </div>
            ) : (
              <ScrollArea className="h-full" data-testid="aideon-shell-content">
                <div className="min-h-full p-4 md:p-6">{content}</div>
              </ScrollArea>
            )}
          </SidebarInset>

          <SidebarProvider
            enableKeyboardShortcut={false}
            open={!inspectorCollapsed}
            onOpenChange={(open) => {
              setInspectorCollapsed(!open);
              persistInspectorCollapsed(!open);
            }}
            className="!min-h-0 w-auto"
            style={headerStyle}
          >
            <Sidebar side="right" collapsible="offcanvas" data-testid="aideon-shell-inspector">
              <SidebarContent className="p-0">{inspector}</SidebarContent>
            </Sidebar>
          </SidebarProvider>
        </div>
      </SidebarProvider>
    </AideonShellControlsProvider>
  );
}
