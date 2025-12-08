import type { ReactNode } from 'react';

import { ScrollArea } from 'design-system/components/ui/scroll-area';
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
  Sidebar,
  SidebarProvider,
} from 'design-system/desktop-shell';
import { cn } from 'design-system/lib/utilities';

interface PraxisShellLayoutProperties {
  readonly navigation: ReactNode;
  readonly content: ReactNode;
  readonly inspector: ReactNode;
  readonly toolbar?: ReactNode;
  readonly className?: string;
}

/**
 * Standard three-pane layout for the Scenario / Template screen.
 * Left: navigation projects/scenarios. Centre: workspace content. Right: properties inspector.
 * @param root0
 * @param root0.navigation
 * @param root0.content
 * @param root0.inspector
 * @param root0.toolbar
 * @param root0.className
 */
export function PraxisShellLayout({
  navigation,
  content,
  inspector,
  toolbar,
  className,
}: PraxisShellLayoutProperties) {
  return (
    <SidebarProvider>
      <div className={cn('flex min-h-screen flex-col bg-background text-foreground', className)}>
        {toolbar ? (
          <header className="border-b border-border/70 bg-card/80 px-4 py-2 backdrop-blur">
            {toolbar}
          </header>
        ) : undefined}
        <ResizablePanelGroup direction="horizontal" className="min-h-0 flex-1">
          <ResizablePanel defaultSize={20} minSize={14} className="min-w-[220px] max-w-[420px]">
            <Sidebar collapsible="icon" className="h-full border-r border-border/60 bg-card/80">
              <ScrollArea className="h-full" data-testid="praxis-shell-navigation">
                {navigation}
              </ScrollArea>
            </Sidebar>
          </ResizablePanel>

          <ResizableHandle withHandle />

          <ResizablePanel defaultSize={60} minSize={40} className="min-w-[360px]">
            <ScrollArea className="h-full" data-testid="praxis-shell-content">
              <div className="min-h-full px-6 pb-10 pt-6">{content}</div>
            </ScrollArea>
          </ResizablePanel>

          <ResizableHandle withHandle />

          <ResizablePanel defaultSize={20} minSize={16} className="min-w-[260px] max-w-[520px]">
            <ScrollArea
              className="h-full border-l border-border/60 bg-card/70"
              data-testid="praxis-shell-inspector"
            >
              <div className="p-4">{inspector}</div>
            </ScrollArea>
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
    </SidebarProvider>
  );
}

/**
 * Export the base desktop shell for callers that still depend on it.
 * Kept as a passthrough to avoid breaking legacy imports while we migrate.
 */

export { DesktopShell } from 'design-system/desktop-shell';
