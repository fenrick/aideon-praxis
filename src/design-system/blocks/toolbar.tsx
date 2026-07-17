import type { ComponentPropsWithoutRef } from 'react';
import { forwardRef } from 'react';

import { cn } from '../lib/utilities';

export type ToolbarProperties = Readonly<ComponentPropsWithoutRef<'div'>>;

/**
 * Toolbar container used across desktop chrome.
 * @param root0 - Toolbar props.
 * @returns Styled toolbar wrapper.
 */
export const Toolbar = forwardRef<HTMLDivElement, ToolbarProperties>(function ToolbarInner(
  { className, ...properties },
  reference,
) {
  return (
    <div
      ref={reference}
      className={cn(
        // Flush, edge-to-edge desktop bar — no pill, no shadow, no border.
        // Separation comes from the enclosing header's hairline, not the bar.
        'flex min-h-10 items-center gap-2 px-3 text-sm',
        className,
      )}
      {...properties}
    />
  );
});

export type ToolbarSectionProperties = Readonly<ComponentPropsWithoutRef<'div'>> & {
  readonly justify?: 'start' | 'center' | 'end';
};

export const ToolbarSection = forwardRef<HTMLDivElement, ToolbarSectionProperties>(
  function ToolbarSectionInner({ className, justify = 'start', ...properties }, reference) {
    const justification = resolveJustification(justify);
    return (
      <div
        ref={reference}
        className={cn('flex flex-1 items-center gap-1', justification, className)}
        {...properties}
      />
    );
  },
);

export type ToolbarSeparatorProperties = Readonly<ComponentPropsWithoutRef<'div'>>;

/**
 * Thin separator between toolbar groups.
 * @param root0 - Separator props.
 * @param root0.className - Optional custom classes.
 */
export function ToolbarSeparator({ className, ...properties }: ToolbarSeparatorProperties) {
  return (
    <div role="separator" className={cn('bg-border/70 h-5 w-px', className)} {...properties} />
  );
}

/**
 * Map justification option to flex utility.
 * @param justify - Desired alignment.
 * @returns Flex alignment class.
 */
function resolveJustification(justify: ToolbarSectionProperties['justify']): string {
  switch (justify) {
    case 'center': {
      return 'justify-center';
    }
    case 'end': {
      return 'justify-end';
    }
    case 'start': {
      return 'justify-start';
    }
    case undefined: {
      return 'justify-start';
    }
    default: {
      return 'justify-start';
    }
  }
}
