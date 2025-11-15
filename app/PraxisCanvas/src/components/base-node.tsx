import type { ComponentProps } from 'react';

import { cn } from '@/lib/utilities';

export function BaseNode({ className, ...properties }: ComponentProps<'div'>) {
  return (
    <div
      className={cn(
        'bg-card text-card-foreground relative rounded-md border',
        'hover:ring-1',
        // React Flow displays node elements inside of a `NodeWrapper` component,
        // which compiles down to a div with the class `react-flow__node`.
        // When a node is selected, the class `selected` is added to the
        // `react-flow__node` element. This allows us to style the node when it
        // is selected, using Tailwind's `&` selector.
        String.raw`[.react-flow__node.selected_&]:border-muted-foreground`,
        String.raw`[.react-flow__node.selected_&]:shadow-lg`,
        className,
      )}
      tabIndex={0}
      {...properties}
    />
  );
}

/**
 * A container for a consistent header layout intended to be used inside the
 * `<BaseNode />` component.
 */
export function BaseNodeHeader({ className, ...properties }: ComponentProps<'header'>) {
  return (
    <header
      {...properties}
      className={cn(
        'mx-0 my-0 -mb-1 flex flex-row items-center justify-between gap-2 px-3 py-2',
        // Remove or modify these classes if you modify the padding in the
        // `<BaseNode />` component.
        className,
      )}
    />
  );
}

/**
 * The title text for the node. To maintain a native application feel, the title
 * text is not selectable.
 */
export function BaseNodeHeaderTitle({ className, ...properties }: ComponentProps<'h3'>) {
  return (
    <h3
      data-slot="base-node-title"
      className={cn('user-select-none flex-1 font-semibold', className)}
      {...properties}
    />
  );
}

export function BaseNodeContent({ className, ...properties }: ComponentProps<'div'>) {
  return (
    <div
      data-slot="base-node-content"
      className={cn('flex flex-col gap-y-2 p-3', className)}
      {...properties}
    />
  );
}

export function BaseNodeFooter({ className, ...properties }: ComponentProps<'div'>) {
  return (
    <div
      data-slot="base-node-footer"
      className={cn('flex flex-col items-center gap-y-2 border-t px-3 pt-2 pb-3', className)}
      {...properties}
    />
  );
}
