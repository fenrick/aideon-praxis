import type { ComponentPropsWithoutRef } from 'react';
import { forwardRef } from 'react';

import { cn } from '../lib/utils';

export type ToolbarProperties = Readonly<ComponentPropsWithoutRef<'div'>>;

export const Toolbar = forwardRef<HTMLDivElement, ToolbarProperties>(function Toolbar(
  { className, ...properties },
  reference,
) {
  return (
    <div
      ref={reference}
      className={cn(
        'flex min-h-10 items-center gap-2 rounded-full border border-border/70 bg-card/90 px-3 py-1 text-sm shadow-sm backdrop-blur',
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
  function ToolbarSection({ className, justify = 'start', ...properties }, reference) {
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

export function ToolbarSeparator({ className, ...properties }: ToolbarSeparatorProperties) {
  return <div className={cn('h-5 w-px bg-border/70', className)} {...properties} />;
}

function resolveJustification(justify: ToolbarSectionProperties['justify']): string {
  switch (justify) {
    case 'center': {
      return 'justify-center';
    }
    case 'end': {
      return 'justify-end';
    }
    default: {
      return 'justify-start';
    }
  }
}
