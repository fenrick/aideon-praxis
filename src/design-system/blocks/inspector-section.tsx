import type { ReactNode } from 'react';

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '../components/ui/accordion';
import { cn } from '../lib/utilities';

export interface InspectorSectionProperties {
  readonly label: string;
  readonly value: string;
  readonly children: ReactNode;
  readonly className?: string;
}

export interface InspectorSectionGroupProperties {
  readonly defaultValue?: string;
  readonly children: ReactNode;
  readonly className?: string;
}

/**
 * Collapsible section within an inspector pane.
 * Must be used inside an InspectorSectionGroup.
 * @param root0
 * @param root0.label
 * @param root0.value
 * @param root0.children
 * @param root0.className
 */
export function InspectorSection({
  label,
  value,
  children,
  className,
}: InspectorSectionProperties) {
  return (
    <AccordionItem className={cn('border-border/60 rounded-2xl border', className)} value={value}>
      <AccordionTrigger className="px-3 py-2 text-sm">{label}</AccordionTrigger>
      <AccordionContent className="space-y-3 px-3 pt-0 pb-3">{children}</AccordionContent>
    </AccordionItem>
  );
}

/**
 * Container for a group of InspectorSection components.
 * Wraps Accordion so sections share a single open-at-a-time state.
 * @param root0
 * @param root0.defaultValue
 * @param root0.children
 * @param root0.className
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
