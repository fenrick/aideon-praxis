import type { ReactNode } from 'react';

import type { WorkspaceNavigationProperties } from 'workspaces/types';

import { Button, Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from 'design-system';
import { Brain, Database, LayoutGrid } from 'design-system/icons';
import { cn } from 'design-system/lib/utilities';

export interface AideonDesktopNavigationProperties extends Readonly<WorkspaceNavigationProperties> {
  readonly children: ReactNode;
  readonly className?: string;
}

/**
 * Host-level navigation wrapper with a workspace icon rail and contextual sidebar content.
 * @param root0
 * @param root0.activeWorkspaceId
 * @param root0.workspaceOptions
 * @param root0.onWorkspaceSelect
 * @param root0.children
 * @param root0.className
 */
export function AideonDesktopNavigation({
  activeWorkspaceId,
  workspaceOptions,
  onWorkspaceSelect,
  children,
  className,
}: AideonDesktopNavigationProperties) {
  return (
    <div className={cn('flex h-full', className)}>
      <TooltipProvider>
        <div className="border-border/70 bg-sidebar flex w-14 flex-col items-center gap-3 border-r px-2 py-3">
          {workspaceOptions.map((workspace) => {
            const {
              id: workspaceId,
              label: workspaceLabel,
              disabled: workspaceDisabled,
            } = workspace;
            const Icon = (() => {
              switch (workspaceId) {
                case 'praxis': {
                  return LayoutGrid;
                }
                case 'metis': {
                  return Brain;
                }
                case 'mneme': {
                  return Database;
                }
                default: {
                  return LayoutGrid;
                }
              }
            })();
            const active = workspaceId === activeWorkspaceId;
            return (
              <Tooltip key={workspaceId}>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    size="icon"
                    variant={active ? 'secondary' : 'ghost'}
                    className={cn(
                      'h-10 w-10 rounded-xl',
                      workspaceDisabled ? 'cursor-not-allowed opacity-50' : undefined,
                    )}
                    aria-label={workspaceLabel}
                    disabled={workspaceDisabled}
                    onClick={() => {
                      onWorkspaceSelect(workspaceId);
                    }}
                  >
                    <Icon className="size-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right">
                  {workspaceLabel}
                  {workspaceDisabled ? ' (Coming soon)' : ''}
                </TooltipContent>
              </Tooltip>
            );
          })}
        </div>
      </TooltipProvider>
      <div className="flex min-w-0 flex-1">{children}</div>
    </div>
  );
}
