import { useState, type ReactNode } from 'react';

import { templateScreenCopy } from 'praxis/copy/template-screen';
import type { SelectionProperties } from 'praxis/stores/selection-store';

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
  readonly properties?: SelectionProperties;
  readonly onSave?: (patch: Record<string, string | undefined>) => void | Promise<void>;
  readonly onReset?: () => void;
  readonly saving?: boolean;
  readonly error?: string;
}

/**
 * Right-pane inspector for the active selection.
 * @param root0
 * @param root0.selectionKind
 * @param root0.selectionId
 * @param root0.properties
 * @param root0.onSave
 * @param root0.onReset
 * @param root0.saving
 * @param root0.error
 */
export function PropertiesInspector({
  selectionKind,
  selectionId,
  properties,
  onSave,
  onReset,
  saving,
  error,
}: PropertiesInspectorProperties) {
  const copy = templateScreenCopy.properties;
  const heading = resolveHeading(selectionKind, copy);
  const [formState, setFormState] = useState({
    name: properties?.name ?? selectionId ?? '',
    dataSource: properties?.dataSource ?? '',
    layout: properties?.layout ?? '',
    description: properties?.description ?? '',
  });

  const disabled = selectionKind === 'none' || !selectionId;

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
              <Input
                value={formState.name}
                onChange={(event) => {
                  setFormState((previous) => ({ ...previous, name: event.target.value }));
                }}
                aria-label={copy.nameLabel}
                disabled={disabled}
              />
            </Field>
            <Field label={copy.dataSourceLabel}>
              <Input
                value={formState.dataSource}
                placeholder="Datasource or catalogue"
                aria-label={copy.dataSourceLabel}
                onChange={(event) => {
                  setFormState((previous) => ({ ...previous, dataSource: event.target.value }));
                }}
                disabled={disabled}
              />
            </Field>
            <Field label={copy.layoutLabel}>
              <Textarea
                value={formState.layout}
                placeholder="Layout hints or coordinates"
                rows={2}
                aria-label={copy.layoutLabel}
                onChange={(event) => {
                  setFormState((previous) => ({ ...previous, layout: event.target.value }));
                }}
                disabled={disabled}
              />
            </Field>
            <Separator />
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                onClick={() => {
                  const result = onSave?.(formState);
                  if (result && typeof (result as Promise<unknown>).then === 'function') {
                    (result as Promise<unknown>).catch(() => {
                      /* ignored */
                    });
                  }
                }}
                disabled={disabled || saving}
              >
                {saving ? 'Saving…' : 'Save changes'}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  onReset?.();
                }}
                disabled={disabled}
              >
                Reset
              </Button>
            </div>
            {error ? <p className="text-xs text-destructive">{error}</p> : undefined}
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
    case 'none': {
      return copy.empty;
    }
  }
}
