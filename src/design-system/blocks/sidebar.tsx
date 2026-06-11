import type { ComponentPropsWithoutRef } from 'react';
import { forwardRef } from 'react';

import { cn } from '../lib/utilities';

export type SidebarShellProperties = Readonly<ComponentPropsWithoutRef<'aside'>>;

export const SidebarShell = forwardRef<HTMLElement, SidebarShellProperties>(function SidebarShell(
  { className, ...properties },
  reference,
) {
  return (
    <aside
      ref={reference}
      className={cn('flex w-72 flex-col border-r border-border/60 bg-card/40 text-sm', className)}
      {...properties}
    />
  );
});

export type SidebarSectionProperties = Readonly<ComponentPropsWithoutRef<'div'>> & {
  readonly padded?: boolean;
};

export const SidebarSection = forwardRef<HTMLDivElement, SidebarSectionProperties>(
  function SidebarSection({ className, padded = true, ...properties }, reference) {
    return (
      <div
        ref={reference}
        className={cn('flex flex-col gap-2', padded ? 'px-4 py-3' : undefined, className)}
        {...properties}
      />
    );
  },
);

export type SidebarHeadingProperties = Readonly<ComponentPropsWithoutRef<'h2'>>;

export const SidebarHeading = forwardRef<HTMLHeadingElement, SidebarHeadingProperties>(
  function SidebarHeading({ className, children, ...properties }, reference) {
    return (
      <h2
        ref={reference}
        className={cn(
          'text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground',
          className,
        )}
        {...properties}
      >
        {children}
      </h2>
    );
  },
);

export type SidebarNavProperties = Readonly<ComponentPropsWithoutRef<'nav'>>;

export const SidebarNav = forwardRef<HTMLElement, SidebarNavProperties>(function SidebarNav(
  { className, ...properties },
  reference,
) {
  return (
    <nav
      ref={reference}
      className={cn('flex flex-col gap-1 text-sm text-muted-foreground', className)}
      {...properties}
    />
  );
});
