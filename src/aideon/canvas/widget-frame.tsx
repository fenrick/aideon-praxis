import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from 'design-system';
import { GripHorizontal, MoreHorizontal } from 'design-system/icons';
import { cn } from 'design-system/lib/utilities';
import type { ReactNode } from 'react';

export interface WidgetFrameProperties {
  readonly title: string;
  readonly children: ReactNode;
  readonly className?: string;
  readonly actions?: ReactNode;
  readonly onRemove?: () => void;
}

/**
 * A standard, glass-like frame for all canvas widgets.
 * Provides consistent titling, drag handles, and action menus.
 * @param root0
 * @param root0.title
 * @param root0.children
 * @param root0.className
 * @param root0.actions
 * @param root0.onRemove
 */
export function WidgetFrame({
  title,
  children,
  className,
  actions,
  onRemove,
}: WidgetFrameProperties) {
  return (
    <div className={cn('flex h-full flex-col', className)}>
      <div className="border-border/50 bg-muted/20 flex items-center justify-between border-b px-4 py-2 backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <GripHorizontal className="text-muted-foreground/50 h-4 w-4 cursor-grab active:cursor-grabbing" />
          <span className="text-sm leading-none font-medium tracking-tight">{title}</span>
        </div>
        <div className="flex items-center gap-1">
          {actions}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon-sm" className="text-muted-foreground h-7 w-7">
                <MoreHorizontal className="h-4 w-4" />
                <span className="sr-only">Widget options</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onSelect={onRemove}
                className="text-destructive focus:text-destructive"
              >
                Remove Widget
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      <div className="bg-card/50 flex-1 overflow-hidden p-0">{children}</div>
    </div>
  );
}
