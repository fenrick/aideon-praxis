import { Badge } from 'design-system/components/ui/badge';
import { cn } from 'design-system/lib/utils';
import type { ComponentProps, HTMLAttributes } from 'react';

export type AnnouncementProps = ComponentProps<typeof Badge> & {
  themed?: boolean;
};

export const Announcement = ({
  variant = 'outline',
  themed = false,
  className,
  ...properties
}: AnnouncementProps) => (
  <Badge
    className={cn(
      'group bg-background max-w-full gap-2 rounded-full px-3 py-0.5 font-medium shadow-sm transition-all',
      'hover:shadow-md',
      themed && 'announcement-themed border-foreground/5',
      className,
    )}
    variant={variant}
    {...properties}
  />
);

export type AnnouncementTagProps = HTMLAttributes<HTMLDivElement>;

export const AnnouncementTag = ({ className, ...properties }: AnnouncementTagProps) => (
  <div
    className={cn(
      'bg-foreground/5 -ml-2.5 shrink-0 truncate rounded-full px-2.5 py-1 text-xs',
      'group-[.announcement-themed]:bg-background/60',
      className,
    )}
    {...properties}
  />
);

export type AnnouncementTitleProps = HTMLAttributes<HTMLDivElement>;

export const AnnouncementTitle = ({ className, ...properties }: AnnouncementTitleProps) => (
  <div className={cn('flex items-center gap-1 truncate py-1', className)} {...properties} />
);
