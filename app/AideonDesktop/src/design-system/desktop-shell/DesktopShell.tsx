import type { ComponentPropsWithoutRef } from 'react';

import { cn } from 'design-system/lib/utils';

import type { DesktopShellSlots } from './types';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from './resizable';
import { Sidebar, SidebarProvider } from './sidebar';

export type DesktopShellProperties = DesktopShellSlots &
  Readonly<ComponentPropsWithoutRef<'div'>>;

export function DesktopShell({
  tree,
  toolbar,
  main,
  properties,
  className,
  ...rest
}: DesktopShellProperties) {
  return (
    <SidebarProvider>
      <div
        className={cn('flex min-h-screen flex-col bg-background text-foreground', className)}
        {...rest}
      >
        <header className="border-b border-border/70 bg-card/80 px-4 py-2 backdrop-blur">
          {toolbar}
        </header>
        <ResizablePanelGroup direction="horizontal" className="min-h-0 flex-1">
          <ResizablePanel defaultSize={20} minSize={12} className="min-w-[200px] max-w-[420px]">
            <Sidebar collapsible="icon" className="h-full border-r border-border/60">
              {tree}
            </Sidebar>
          </ResizablePanel>

          <ResizableHandle withHandle />

          <ResizablePanel defaultSize={60} minSize={40} className="min-w-[320px]">
            <div className="flex h-full flex-col overflow-hidden bg-background/80 p-4">
              {main}
            </div>
          </ResizablePanel>

          <ResizableHandle withHandle />

          <ResizablePanel defaultSize={20} minSize={15} className="min-w-[240px] max-w-[520px]">
            <div className="h-full overflow-hidden border-l border-border/60 bg-card/70">
              {properties}
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
    </SidebarProvider>
  );
}
