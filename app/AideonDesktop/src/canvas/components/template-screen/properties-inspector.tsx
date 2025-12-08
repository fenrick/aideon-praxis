import { templateScreenCopy } from 'canvas/copy/template-screen';
import type { ReactNode } from 'react';

import { Button } from 'design-system/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from 'design-system/components/ui/card';
import { Input } from 'design-system/components/ui/input';
import { Label } from 'design-system/components/ui/label';
import { Separator } from 'design-system/components/ui/separator';
import { Textarea } from 'design-system/components/ui/textarea';

export type SelectionKind = 'widget' | 'node' | 'edge' | 'none';

export interface PropertiesInspectorProperties {
  readonly selectionKind: SelectionKind;
  readonly selectionId?: string;
}

/**
 * Right-pane inspector for the active selection.
 * @param root0
 * @param root0.selectionKind
 * @param root0.selectionId
 */
export function PropertiesInspector({ selectionKind, selectionId }: PropertiesInspectorProperties) {
  const copy = templateScreenCopy.properties;
  const heading = resolveHeading(selectionKind, copy);

  return (
    <Card className="border-border/60 bg-card/90 shadow-sm">
      <CardHeader>
        <CardTitle>{copy.title}</CardTitle>
        <CardDescription>{heading}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        {selectionKind === 'none' ? (
          <p>{copy.empty}</p>
        ) : (
          <>
            <Field label={copy.nameLabel}>
              <Input defaultValue={selectionId ?? ''} aria-label={copy.nameLabel} />
            </Field>
            <Field label={copy.dataSourceLabel}>
              <Input placeholder="Datasource or catalogue" aria-label={copy.dataSourceLabel} />
            </Field>
            <Field label={copy.layoutLabel}>
              <Textarea
                placeholder="Layout hints or coordinates"
                rows={2}
                aria-label={copy.layoutLabel}
              />
            </Field>
            <Separator />
            <div className="flex flex-wrap gap-2">
              <Button size="sm">Save changes</Button>
              <Button size="sm" variant="outline">
                Reset
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

/**
 *
 * @param root0
 * @param root0.label
 * @param root0.children
 */
function Field({ label, children }: { readonly label: string; readonly children: ReactNode }) {
  return (
    <div className="space-y-1">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

/**
 *
 * @param selectionKind
 * @param copy
 */
function resolveHeading(
  selectionKind: SelectionKind,
  copy: typeof templateScreenCopy.properties,
): string {
  switch (selectionKind) {
    case 'widget': {
      return copy.widgetHeading;
    }
    case 'node': {
      return copy.nodeHeading;
    }
    case 'edge': {
      return copy.edgeHeading;
    }
    default: {
      return copy.empty;
    }
  }
}
