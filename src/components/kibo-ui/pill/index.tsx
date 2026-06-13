import type { ComponentProps, ReactNode } from 'react';

import { Avatar, AvatarFallback, AvatarImage, Badge, Button } from 'design-system';
import { ChevronDownIcon, ChevronUpIcon, MinusIcon } from 'design-system/icons';
import { cn } from 'design-system/lib/utils';

export type PillProps = ComponentProps<typeof Badge> & {
  themed?: boolean;
};

export const Pill = ({
  variant = 'secondary',
  themed = false,
  className,
  ...properties
}: PillProps) => (
  <Badge
    className={cn('gap-2 rounded-full px-3 py-1.5 font-normal', className)}
    variant={variant}
    {...properties}
  />
);

export type PillAvatarProps = ComponentProps<typeof AvatarImage> & {
  fallback?: string;
};

export const PillAvatar = ({ fallback, className, ...properties }: PillAvatarProps) => (
  <Avatar className={cn('-ml-1 h-4 w-4', className)}>
    <AvatarImage {...properties} />
    <AvatarFallback>{fallback}</AvatarFallback>
  </Avatar>
);

export type PillButtonProps = ComponentProps<typeof Button>;

export const PillButton = ({ className, ...properties }: PillButtonProps) => (
  <Button
    className={cn('hover:bg-foreground/5 -my-2 -mr-2 size-6 rounded-full p-0.5', className)}
    size="icon"
    variant="ghost"
    {...properties}
  />
);

export interface PillStatusProperties {
  children: ReactNode;
  className?: string;
}

export const PillStatus = ({ children, className, ...properties }: PillStatusProperties) => (
  <div
    className={cn('flex items-center gap-2 border-r pr-2 font-medium', className)}
    {...properties}
  >
    {children}
  </div>
);

export interface PillIndicatorProperties {
  variant?: 'error' | 'info' | 'success' | 'warning';
  pulse?: boolean;
}

export const PillIndicator = ({ variant = 'success', pulse = false }: PillIndicatorProperties) => (
  <span className="relative flex size-2">
    {pulse && (
      <span
        className={cn(
          'absolute inline-flex h-full w-full animate-ping rounded-full opacity-75',
          variant === 'success' && 'bg-emerald-400',
          variant === 'error' && 'bg-rose-400',
          variant === 'warning' && 'bg-amber-400',
          variant === 'info' && 'bg-sky-400',
        )}
      />
    )}
    <span
      className={cn(
        'relative inline-flex size-2 rounded-full',
        variant === 'success' && 'bg-emerald-500',
        variant === 'error' && 'bg-rose-500',
        variant === 'warning' && 'bg-amber-500',
        variant === 'info' && 'bg-sky-500',
      )}
    />
  </span>
);

export interface PillDeltaProperties {
  className?: string;
  delta: number;
}

export const PillDelta = ({ className, delta }: PillDeltaProperties) => {
  if (!delta) {
    return <MinusIcon className={cn('text-muted-foreground size-3', className)} />;
  }

  if (delta > 0) {
    return <ChevronUpIcon className={cn('size-3 text-emerald-500', className)} />;
  }

  return <ChevronDownIcon className={cn('size-3 text-rose-500', className)} />;
};

export interface PillIconProperties {
  icon: typeof ChevronUpIcon;
  className?: string;
}

export const PillIcon = ({ icon: Icon, className, ...properties }: PillIconProperties) => (
  <Icon className={cn('text-muted-foreground size-3', className)} size={12} {...properties} />
);

export interface PillAvatarGroupProperties {
  children: ReactNode;
  className?: string;
}

export const PillAvatarGroup = ({
  children,
  className,
  ...properties
}: PillAvatarGroupProperties) => (
  <div
    className={cn(
      'flex items-center -space-x-1',
      '[&>*:not(:first-of-type)]:[mask-image:radial-gradient(circle_9px_at_-4px_50%,transparent_99%,white_100%)]',
      className,
    )}
    {...properties}
  >
    {children}
  </div>
);
