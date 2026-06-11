import type { ComponentPropsWithoutRef, ReactNode } from 'react';
import { forwardRef } from 'react';

import { cn } from '../lib/utilities';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../ui/card';

export type PanelProperties = Readonly<ComponentPropsWithoutRef<typeof Card>>;

/**
 * Card-styled container for desktop panels.
 * @param root0 - Panel properties.
 * @returns Panel wrapper element.
 */
export const Panel = forwardRef<HTMLDivElement, PanelProperties>(function Panel(
  { className, ...properties },
  reference,
) {
  return (
    <Card
      ref={reference}
      className={cn('rounded-2xl border-border/70 bg-card text-sm shadow-sm', className)}
      {...properties}
    />
  );
});

export type PanelHeaderProperties = Readonly<ComponentPropsWithoutRef<typeof CardHeader>>;

/**
 * Panel header with consistent padding and divider.
 * @param root0 - Header properties.
 * @returns Header element.
 */
export const PanelHeader = forwardRef<HTMLDivElement, PanelHeaderProperties>(function PanelHeader(
  { className, ...properties },
  reference,
) {
  return (
    <CardHeader
      ref={reference}
      className={cn('space-y-1.5 border-b border-border/60 pb-4', className)}
      {...properties}
    />
  );
});

export type PanelTitleProperties = Readonly<ComponentPropsWithoutRef<typeof CardTitle>>;

/**
 * Panel title text.
 * @param root0 - Title properties.
 * @returns Title element.
 */
export const PanelTitle = forwardRef<HTMLDivElement, PanelTitleProperties>(function PanelTitle(
  { className, ...properties },
  reference,
) {
  return (
    <CardTitle
      ref={reference}
      className={cn('text-base font-semibold', className)}
      {...properties}
    />
  );
});

export type PanelDescriptionProperties = Readonly<ComponentPropsWithoutRef<typeof CardDescription>>;

/**
 * Secondary description for a panel.
 * @param root0 - Description properties.
 * @returns Description element.
 */
export const PanelDescription = forwardRef<HTMLDivElement, PanelDescriptionProperties>(
  function PanelDescription({ className, ...properties }, reference) {
    return (
      <CardDescription
        ref={reference}
        className={cn('text-xs text-muted-foreground', className)}
        {...properties}
      />
    );
  },
);

export type PanelContentProperties = Readonly<ComponentPropsWithoutRef<typeof CardContent>>;

/**
 * Body content wrapper for panels.
 * @param root0 - Content properties.
 * @returns Content container.
 */
export const PanelContent = forwardRef<HTMLDivElement, PanelContentProperties>(
  function PanelContent({ className, ...properties }, reference) {
    return (
      <CardContent
        ref={reference}
        className={cn('space-y-4 pt-4 text-sm', className)}
        {...properties}
      />
    );
  },
);

export type PanelFooterProperties = Readonly<ComponentPropsWithoutRef<typeof CardFooter>>;

/**
 * Footer region for actions within a panel.
 * @param root0 - Footer properties.
 * @returns Footer element.
 */
export const PanelFooter = forwardRef<HTMLDivElement, PanelFooterProperties>(function PanelFooter(
  { className, ...properties },
  reference,
) {
  return (
    <CardFooter ref={reference} className={cn('justify-end gap-2', className)} {...properties} />
  );
});

export interface PanelFieldProperties extends Readonly<ComponentPropsWithoutRef<'div'>> {
  readonly label: string;
  readonly helper?: ReactNode;
  readonly action?: ReactNode;
}

/**
 * Labeled field section with optional helper and action slot.
 * @param root0 - Field properties including label and helper.
 * @param root0.label
 * @param root0.helper
 * @param root0.action
 * @param root0.className
 * @param root0.children
 * @returns Field wrapper element.
 */
export function PanelField({
  label,
  helper,
  action,
  className,
  children,
  ...properties
}: PanelFieldProperties) {
  return (
    <div className={cn('space-y-2', className)} {...properties}>
      <div className="flex items-center justify-between text-[0.65rem] uppercase tracking-[0.3em] text-muted-foreground">
        <span>{label}</span>
        {action ? (
          <div className="text-[0.6rem] font-medium normal-case tracking-wide">{action}</div>
        ) : undefined}
      </div>
      {children}
      {helper ? <div className="text-xs text-muted-foreground">{helper}</div> : undefined}
    </div>
  );
}

export interface PanelToolbarProperties extends Readonly<ComponentPropsWithoutRef<'div'>> {
  readonly align?: 'start' | 'end' | 'between';
}

/**
 * Toolbar-like row within a panel.
 * @param root0 - Toolbar properties including alignment.
 * @param root0.align
 * @param root0.className
 * @param root0.children
 * @returns Toolbar container element.
 */
export function PanelToolbar({
  align = 'end',
  className,
  children,
  ...properties
}: PanelToolbarProperties) {
  const alignmentClass = resolveAlignmentClass(align);
  return (
    <div
      className={cn(
        'flex flex-wrap gap-2 border-t border-border/60 pt-4',
        alignmentClass,
        className,
      )}
      {...properties}
    >
      {children}
    </div>
  );
}

/**
 * Resolve flex alignment class for toolbar.
 * @param alignment - Desired alignment token.
 * @returns Tailwind class for justification.
 */
function resolveAlignmentClass(alignment: PanelToolbarProperties['align']): string {
  switch (alignment) {
    case 'start': {
      return 'justify-start';
    }
    case 'end': {
      return 'justify-end';
    }
    case 'between': {
      return 'justify-between';
    }
    case undefined: {
      return 'justify-end';
    }
    default: {
      return 'justify-end';
    }
  }
}
