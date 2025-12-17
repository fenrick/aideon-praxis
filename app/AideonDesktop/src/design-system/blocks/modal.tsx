import type { ComponentProps, ComponentPropsWithoutRef } from 'react';

import { cn } from '../lib/utilities';
import type { Dialog } from '../ui/dialog';
import {
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';

export type ModalProperties = Readonly<ComponentProps<typeof Dialog>>;

export type ModalContentProperties = Readonly<ComponentPropsWithoutRef<typeof DialogContent>>;

/**
 * Modal content wrapper styled with Praxis defaults.
 * @param root0 - Content properties forwarded to `DialogContent`.
 * @param root0.className - Optional class names to merge.
 * @returns Styled dialog content element.
 */
export function ModalContent({ className, ...properties }: ModalContentProperties) {
  return (
    <DialogContent
      className={cn('rounded-3xl border-border/60 bg-card p-8 shadow-xl sm:max-w-xl', className)}
      {...properties}
    />
  );
}

export type ModalHeaderProperties = Readonly<ComponentPropsWithoutRef<typeof DialogHeader>>;

/**
 * Modal header with consistent spacing and alignment.
 * @param root0 - Header properties.
 * @param root0.className - Optional class names to merge.
 * @returns Header container element.
 */
export function ModalHeader({ className, ...properties }: ModalHeaderProperties) {
  return <DialogHeader className={cn('gap-1 text-left', className)} {...properties} />;
}

export type ModalTitleProperties = Readonly<ComponentPropsWithoutRef<typeof DialogTitle>>;

/**
 * Modal title styled for prominence.
 * @param root0 - Title properties.
 * @param root0.className - Optional class names to merge.
 * @returns Title element.
 */
export function ModalTitle({ className, ...properties }: ModalTitleProperties) {
  return <DialogTitle className={cn('text-lg font-semibold', className)} {...properties} />;
}

export type ModalDescriptionProperties = Readonly<
  ComponentPropsWithoutRef<typeof DialogDescription>
>;

/**
 * Helper text beneath a modal title.
 * @param root0 - Description properties.
 * @param root0.className - Optional class names to merge.
 * @returns Description element.
 */
export function ModalDescription({ className, ...properties }: ModalDescriptionProperties) {
  return (
    <DialogDescription className={cn('text-sm text-muted-foreground', className)} {...properties} />
  );
}

export type ModalFooterProperties = Readonly<ComponentPropsWithoutRef<typeof DialogFooter>>;

/**
 * Footer layout for modal actions.
 * @param root0 - Footer properties.
 * @param root0.className - Optional class names to merge.
 * @returns Footer element.
 */
export function ModalFooter({ className, ...properties }: ModalFooterProperties) {
  return (
    <DialogFooter
      className={cn('flex flex-col gap-2 sm:flex-row sm:justify-end', className)}
      {...properties}
    />
  );
}

export { Dialog as Modal } from '../ui/dialog';
