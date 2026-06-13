import type { ReactNode } from 'react';

import { cn } from '../lib/utilities';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '../components/ui/accordion';

export interface InspectorSectionProperties {
  readonly label: string;
  readonly value: string;
  readonly children: ReactNode;
  readonly className?: string;
  readonly defaultOpen?: boolean;
}

export interface InspectorSectionGroupProperties {
  readonly defaultValue?: string;
  readonly children: ReactNode;
  readonly className?: string;
}

/**
 * Collapsible section within an inspector pane.
 * Must be used inside an InspectorSectionGroup.
 */
export function InspectorSection({
  label,
  value,
  children,
  className,
}: InspectorSectionProperties) {
  return (
    <AccordionItem
      className={cn('border-border/60 rounded-2xl border', className)}
      value={value}
    >
      <AccordionTrigger className="px-3 py-2 text-sm">{label}</AccordionTrigger>
      <AccordionContent className="space-y-3 px-3 pb-3 pt-0">{children}</AccordionContent>
    </AccordionItem>
  );
}

/**
 * Container for a group of InspectorSection components.
 * Wraps Accordion so sections share a single open-at-a-time state.
 */
export function InspectorSectionGroup({
  defaultValue,
  children,
  className,
}: InspectorSectionGroupProperties) {
  return (
    <Accordion
      className={cn('space-y-3', className)}
      collapsible
      defaultValue={defaultValue}
      type="single"
    >
      {children}
    </Accordion>
  );
}
