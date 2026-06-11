'use client';

import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from 'design-system/components/ui/hover-card';
import { cn } from 'design-system/lib/utils';
import type { ComponentProps } from 'react';

export type GlimpseProps = ComponentProps<typeof HoverCard>;

export const Glimpse = (properties: GlimpseProps) => {
  return <HoverCard {...properties} />;
};

export type GlimpseContentProps = ComponentProps<typeof HoverCardContent>;

export const GlimpseContent = (properties: GlimpseContentProps) => (
  <HoverCardContent {...properties} />
);

export type GlimpseTriggerProps = ComponentProps<typeof HoverCardTrigger>;

export const GlimpseTrigger = (properties: GlimpseTriggerProps) => (
  <HoverCardTrigger {...properties} />
);

export type GlimpseTitleProps = ComponentProps<'p'>;

export const GlimpseTitle = ({ className, ...properties }: GlimpseTitleProps) => {
  return <p className={cn('truncate font-semibold text-sm', className)} {...properties} />;
};

export type GlimpseDescriptionProps = ComponentProps<'p'>;

export const GlimpseDescription = ({ className, ...properties }: GlimpseDescriptionProps) => {
  return (
    <p className={cn('line-clamp-2 text-muted-foreground text-sm', className)} {...properties} />
  );
};

export type GlimpseImageProps = ComponentProps<'img'>;

export const GlimpseImage = ({ className, alt, ...properties }: GlimpseImageProps) => (
  // biome-ignore lint/performance/noImgElement: "Kibo UI is framework agnostic"
  <img
    alt={alt ?? ''}
    className={cn('mb-4 aspect-[120/63] w-full rounded-md border object-cover', className)}
    {...properties}
  />
);
