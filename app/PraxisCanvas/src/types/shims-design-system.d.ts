/* eslint-disable @typescript-eslint/no-explicit-any */
import type { ComponentType } from 'react';

declare module '@aideon/design-system/components/ui/button' {
  export const Button: ComponentType<any>;
  export const buttonVariants: Record<string, unknown>;
}

declare module '@aideon/design-system/components/ui/accordion' {
  export const Accordion: ComponentType<any>;
  export const AccordionContent: ComponentType<any>;
  export const AccordionItem: ComponentType<any>;
  export const AccordionTrigger: ComponentType<any>;
}

declare module '@aideon/design-system/components/ui/badge' {
  export const Badge: ComponentType<any>;
}

declare module '@aideon/design-system/components/ui/input' {
  export const Input: ComponentType<any>;
}

declare module '@aideon/design-system/ui/button' {
  export const Button: ComponentType<any>;
  export const buttonVariants: Record<string, unknown>;
}

declare module '@aideon/design-system/components/ui/card' {
  export const Card: ComponentType<any>;
  export const CardContent: ComponentType<any>;
  export const CardDescription: ComponentType<any>;
  export const CardFooter: ComponentType<any>;
  export const CardHeader: ComponentType<any>;
  export const CardTitle: ComponentType<any>;
}

declare module '@aideon/design-system/ui/table' {
  export const Table: ComponentType<any>;
  export const TableBody: ComponentType<any>;
  export const TableCell: ComponentType<any>;
  export const TableHead: ComponentType<any>;
  export const TableHeader: ComponentType<any>;
  export const TableRow: ComponentType<any>;
}

declare module '@aideon/design-system/blocks/panel' {
  export const Panel: ComponentType<any>;
  export const PanelContent: ComponentType<any>;
  export const PanelDescription: ComponentType<any>;
  export const PanelField: ComponentType<any>;
  export const PanelHeader: ComponentType<any>;
  export const PanelTitle: ComponentType<any>;
  export const PanelToolbar: ComponentType<any>;
}

declare module '@aideon/design-system/components/ui/select' {
  export const Select: ComponentType<any>;
  export const SelectContent: ComponentType<any>;
  export const SelectItem: ComponentType<any>;
  export const SelectTrigger: ComponentType<any>;
  export const SelectValue: ComponentType<any>;
}

declare module '@aideon/design-system/components/ui/slider' {
  export const Slider: ComponentType<any>;
}

declare module '@aideon/design-system/components/ui/command' {
  export const CommandDialog: ComponentType<any>;
  export const CommandEmpty: ComponentType<any>;
  export const CommandGroup: ComponentType<any>;
  export const CommandInput: ComponentType<any>;
  export const CommandItem: ComponentType<any>;
  export const CommandList: ComponentType<any>;
  export const CommandSeparator: ComponentType<any>;
  export const CommandShortcut: ComponentType<any>;
}

declare module '@aideon/design-system/components/ui/dialog' {
  export const Dialog: ComponentType<any>;
  export const DialogContent: ComponentType<any>;
  export const DialogDescription: ComponentType<any>;
  export const DialogFooter: ComponentType<any>;
  export const DialogHeader: ComponentType<any>;
  export const DialogTitle: ComponentType<any>;
}

declare module '@aideon/design-system/lib/utils' {
  export function cn(...classes: unknown[]): string;
}

declare module '@aideon/design-system/reactflow/node-search' {
  export const NodeSearchDialog: ComponentType<any>;
}

declare module '@aideon/design-system/reactflow/praxis-node' {
  export const PraxisNode: ComponentType<any>;
}

declare module '@aideon/design-system/reactflow/timeline-edge' {
  export const TimelineEdge: ComponentType<any>;
  export type TimelineEdgeData = Record<string, unknown>;
}

declare module '@aideon/design-system/styles/globals.css' {
  const css: string;
  export default css;
}
