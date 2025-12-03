import type { ComponentPropsWithoutRef, ReactNode } from 'react';
import { forwardRef } from 'react';

import { cn } from '../lib/utils';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../ui/card';

export type PanelProperties = Readonly<ComponentPropsWithoutRef<typeof Card>>;

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
        ) : null}
      </div>
      {children}
      {helper ? <div className="text-xs text-muted-foreground">{helper}</div> : null}
    </div>
  );
}

export interface PanelToolbarProperties extends Readonly<ComponentPropsWithoutRef<'div'>> {
  readonly align?: 'start' | 'end' | 'between';
}

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

function resolveAlignmentClass(alignment: PanelToolbarProperties['align']): string {
  switch (alignment) {
    case 'start': {
      return 'justify-start';
    }
    case 'between': {
      return 'justify-between';
    }
    default: {
      return 'justify-end';
    }
  }
}
