import type { ComponentPropsWithoutRef } from 'react';

import { cn } from 'design-system/lib/utilities';

import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from './resizable';
import { Sidebar, SidebarProvider, useSidebar } from './sidebar';
// ...
export function DesktopShell({
  tree,
  toolbar,
  main,
  properties,
  className,
  ...rest
}: DesktopShellProperties) {
  const { open } = useSidebar();
  return (
    <SidebarProvider>
      <div
        className={cn('flex min-h-screen flex-col bg-background text-foreground', className)}
        {...rest}
      >

        <ResizablePanelGroup direction="horizontal" className="min-h-0 flex-1">
          <ResizablePanel
            defaultSize={20}
            collapsedSize={4}
            maxSize={25}
            onCollapse={() => setOpen(false)}
            onExpand={() => setOpen(true)}
            className="border-r border-border/60"
          >
            <Sidebar collapsible="icon" className="h-full">
              {tree}
            </Sidebar>
          </ResizablePanel>

          <ResizableHandle withHandle />

          <ResizablePanel defaultSize={60} minSize={40} className="min-w-[320px]">
            <div className="flex h-full flex-col overflow-hidden bg-background p-4">{main}</div>
          </ResizablePanel>

          <ResizableHandle withHandle />

          <ResizablePanel defaultSize={20} minSize={15} className="min-w-[240px] max-w-[520px]">
            <div className="h-full overflow-hidden border-l border-border/60 bg-card">
              {properties}
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
    </SidebarProvider>
  );
}
