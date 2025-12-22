import type { ReactNode } from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { ScrollArea } from 'design-system/components/ui/scroll-area';
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
  Sidebar,
  SidebarProvider,
} from 'design-system/desktop-shell';
import { cn } from 'design-system/lib/utilities';
import { AideonShellControlsProvider } from './shell-controls';

import type { ImperativePanelHandle } from 'react-resizable-panels';

interface AideonShellLayoutProperties {
  readonly navigation: ReactNode;
  readonly content: ReactNode;
  readonly inspector: ReactNode;
  readonly toolbar?: ReactNode;
  readonly className?: string;
}

/**
 * Standard three-pane Aideon desktop layout.
 * Left: navigation. Centre: workspace surface. Right: inspector.
 * @param root0
 * @param root0.navigation
 * @param root0.content
 * @param root0.inspector
 * @param root0.toolbar
 * @param root0.className
 */
export function AideonShellLayout({
  navigation,
  content,
  inspector,
  toolbar,
  className,
}: AideonShellLayoutProperties) {
  const inspectorPanelReference = useRef<ImperativePanelHandle>(null);

  const storedLayout = useMemo<number[] | undefined>(() => {
    const storage = (globalThis as unknown as { localStorage?: Storage }).localStorage;
    if (!storage || typeof storage.getItem !== 'function') {
      return;
    }
    const raw = storage.getItem('aideon-shell-panels');
    if (!raw) {
      return;
    }
    try {
      const parsed = JSON.parse(raw) as unknown;
      if (Array.isArray(parsed) && parsed.every((value) => typeof value === 'number')) {
        return parsed;
      }
    } catch {
      return;
    }
  }, []);

  const inspectorCollapsedFromStorage = useMemo<boolean>(() => {
    const storage = (globalThis as unknown as { localStorage?: Storage }).localStorage;
    if (!storage || typeof storage.getItem !== 'function') {
      return false;
    }
    try {
      return storage.getItem('aideon-shell-inspector-collapsed') === '1';
    } catch {
      return false;
    }
  }, []);

  const [inspectorCollapsed, setInspectorCollapsed] = useState(inspectorCollapsedFromStorage);

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
    const handle = inspectorPanelReference.current;
    if (!handle) {
      setInspectorCollapsed((previous) => {
        const next = !previous;
        persistInspectorCollapsed(next);
        return next;
      });
      return;
    }
    if (inspectorCollapsed) {
      handle.expand();
    } else {
      handle.collapse();
    }
  }, [inspectorCollapsed, persistInspectorCollapsed]);

  useEffect(() => {
    if (!inspectorCollapsed) {
      return;
    }
    queueMicrotask(() => {
      inspectorPanelReference.current?.collapse();
    });
  }, [inspectorCollapsed]);

  return (
    <SidebarProvider>
      <AideonShellControlsProvider value={{ inspectorCollapsed, toggleInspector }}>
        <div className={cn('flex min-h-screen flex-col bg-background text-foreground', className)}>
          {toolbar ? (
            <header
              data-tauri-drag-region
              className="border-b border-border bg-background/95 px-4 py-3 backdrop-blur supports-[backdrop-filter]:bg-background/60"
            >
              {toolbar}
            </header>
          ) : undefined}
          <ResizablePanelGroup
            direction="horizontal"
            className="min-h-0 flex-1"
            onLayout={(sizes) => {
              try {
                const storage = (globalThis as unknown as { localStorage?: Storage }).localStorage;
                if (storage && typeof storage.setItem === 'function') {
                  storage.setItem('aideon-shell-panels', JSON.stringify(sizes));
                }
              } catch {
                /* ignore */
              }
            }}
          >
            <ResizablePanel
              defaultSize={storedLayout?.[0] ?? 20}
              minSize={14}
              className="min-w-[220px] max-w-[420px]"
              data-testid="aideon-shell-panel-navigation"
            >
              <Sidebar
                collapsible="icon"
                className="h-full border-r border-border bg-sidebar text-sidebar-foreground shadow-none"
              >
                <ScrollArea className="h-full" data-testid="aideon-shell-navigation">
                  {navigation}
                </ScrollArea>
              </Sidebar>
            </ResizablePanel>

            <ResizableHandle withHandle />

            <ResizablePanel
              defaultSize={storedLayout?.[1] ?? 60}
              minSize={40}
              className="min-w-[360px]"
              data-testid="aideon-shell-panel-content"
            >
              <ScrollArea className="h-full" data-testid="aideon-shell-content">
                <div className="min-h-full px-6 pb-10 pt-6">{content}</div>
              </ScrollArea>
            </ResizablePanel>

            <ResizableHandle withHandle />

            <ResizablePanel
              ref={inspectorPanelReference}
              defaultSize={storedLayout?.[2] ?? 20}
              minSize={16}
              collapsible
              collapsedSize={0}
              onCollapse={() => {
                setInspectorCollapsed(true);
                persistInspectorCollapsed(true);
              }}
              onExpand={() => {
                setInspectorCollapsed(false);
                persistInspectorCollapsed(false);
              }}
              className="min-w-[260px] max-w-[520px]"
              data-testid="aideon-shell-panel-inspector"
            >
              <ScrollArea
                className="h-full border-l border-border bg-sidebar text-sidebar-foreground shadow-none"
                data-testid="aideon-shell-inspector"
              >
                <div
                  className={cn(
                    'p-4',
                    inspectorCollapsed ? 'pointer-events-none opacity-0' : undefined,
                  )}
                >
                  {inspector}
                </div>
              </ScrollArea>
            </ResizablePanel>
          </ResizablePanelGroup>
        </div>
      </AideonShellControlsProvider>
    </SidebarProvider>
  );
}
