import * as React from 'react';

import { cn } from '@/lib/utilities';

const Card = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(function Card(
  { className, ...properties },
  reference,
) {
  return (
    <div
      ref={reference}
      className={cn('rounded-2xl border border-border bg-card shadow-sm', className)}
      {...properties}
    />
  );
});

const CardHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  function CardHeader({ className, ...properties }, reference) {
    return (
      <div
        ref={reference}
        className={cn('flex flex-col gap-1.5 p-6 pb-3', className)}
        {...properties}
      />
    );
  },
);

const CardTitle = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLHeadingElement>>(
  function CardTitle({ className, ...properties }, reference) {
    return (
      <h3
        ref={reference}
        className={cn('text-lg font-semibold leading-tight', className)}
        {...properties}
      />
    );
  },
);

const CardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(function CardDescription({ className, ...properties }, reference) {
  return (
    <p ref={reference} className={cn('text-sm text-muted-foreground', className)} {...properties} />
  );
});

const CardContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  function CardContent({ className, ...properties }, reference) {
    return <div ref={reference} className={cn('p-6 pt-0', className)} {...properties} />;
  },
);

const CardFooter = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  function CardFooter({ className, ...properties }, reference) {
    return (
      <div
        ref={reference}
        className={cn('flex items-center border-t border-border/70 px-6 py-4', className)}
        {...properties}
      />
    );
  },
);

export { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle };
