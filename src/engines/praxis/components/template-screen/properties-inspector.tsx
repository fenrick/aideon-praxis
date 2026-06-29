import type { ReactNode } from 'react';
import { useEffect, useMemo } from 'react';
import { useForm, type UseFormReturn } from 'react-hook-form';

import { templateScreenCopy } from 'praxis/copy/template-screen';
import type { SelectionProperties } from 'praxis/stores/selection-store';

import type { SelectionState } from 'aideon/canvas/types';

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
  Badge,
  Button,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  Input,
  ScrollArea,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Switch,
  Textarea,
} from 'design-system';

export type SelectionKind = 'widget' | 'node' | 'edge' | 'cell' | 'none';

/**
 * Local form values stored for the inspector form.
 */
interface FormValues {
  name: string;
  dataSource: string;
  layout: string;
  description: string;
  filter: string;
  displayMode: 'default' | 'compact' | 'expanded';
  showLabels: boolean;
  interactionMode: 'default' | 'advanced';
}

/**
 * Normalize a preferred value with an optional fallback.
 * @param primary - Preferred string value.
 * @param fallback - Value to use if the primary is missing.
 */
function resolveFieldValue(primary?: string, fallback?: string) {
  return primary ?? fallback ?? '';
}

/**
 * Placeholder for bulk actions, kept to avoid reintroducing command plumbing.
 * @param _label - Bulk action label (unused).
 */
function noopBulkAction(_label: string) {
  void 0;
}

/**
 * Stub handler for align bulk actions.
 */
function alignBulkAction() {
  noopBulkAction('Align');
}

/**
 * Stub handler for distribute bulk actions.
 */
function distributeBulkAction() {
  noopBulkAction('Distribute');
}

/**
 * Stub handler for delete bulk actions.
 */
function deleteBulkAction() {
  noopBulkAction('Delete');
}

interface MultiSelectionPanelProperties {
  readonly selectionCount: number;
}

/**
 * Panel showing the multi-selection summary.
 * @param root0 - Component props.
 * @param root0.selectionCount - Total number of selected items.
 */
function MultiSelectionPanel({ selectionCount }: MultiSelectionPanelProperties) {
  return (
    <div className="space-y-4">
      <p className="text-muted-foreground text-sm">
        {selectionCount} widgets selected. Align, distribute, or delete them in one go.
      </p>
    </div>
  );
}

/**
 * Props passed to the widget form helper component.
 */
interface WidgetFormPanelProperties {
  readonly form: UseFormReturn<FormValues>;
  readonly copy: typeof templateScreenCopy.properties;
}

/**
 * Renders the accordion-backed form for a single widget.
 * @param root0 - Component props.
 * @param root0.form - Hook form instance.
 * @param root0.copy - Copy map with localized labels.
 */
/**
 * Data section inside the widget form accordion.
 * @param root0 - Section props.
 * @param root0.form - Hook form instance.
 * @param root0.copy - Copy translations.
 */
function DataSection({ form, copy }: WidgetFormPanelProperties) {
  return (
    <AccordionItem value="data" className="border-border/60 rounded-md border">
      <AccordionTrigger>Data</AccordionTrigger>
      <AccordionContent className="space-y-4 pt-3">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem className="space-y-2">
              <FormLabel>{copy.nameLabel}</FormLabel>
              <FormControl>
                <Input placeholder="Widget name" {...field} />
              </FormControl>
              <FormDescription>Friendly label for the widget</FormDescription>
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="dataSource"
          render={({ field }) => (
            <FormItem className="space-y-2">
              <FormLabel>{copy.dataSourceLabel}</FormLabel>
              <FormControl>
                <Input placeholder="Datasource or catalogue" {...field} />
              </FormControl>
              <FormDescription>Source powering this widget</FormDescription>
            </FormItem>
          )}
        />
      </AccordionContent>
    </AccordionItem>
  );
}

/**
 * Display section inside the widget form accordion.
 * @param root0 - Section props.
 * @param root0.form - Hook form instance.
 * @param root0.copy - Copy translations.
 */
function DisplaySection({
  form,
  copy,
}: {
  readonly form: UseFormReturn<FormValues>;
  readonly copy: typeof templateScreenCopy.properties;
}) {
  return (
    <AccordionItem value="display" className="border-border/60 rounded-md border">
      <AccordionTrigger>Display</AccordionTrigger>
      <AccordionContent className="space-y-4 pt-3">
        <FormField
          control={form.control}
          name="layout"
          render={({ field }) => (
            <FormItem className="space-y-2">
              <FormLabel>{copy.layoutLabel}</FormLabel>
              <FormControl>
                <Textarea placeholder="Layout hints or coordinates" rows={3} {...field} />
              </FormControl>
              <FormDescription>Grid position, size, or layout notes</FormDescription>
            </FormItem>
          )}
        />
        <div className="grid gap-3 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="displayMode"
            render={({ field }) => (
              <FormItem className="space-y-2">
                <FormLabel>Display mode</FormLabel>
                <FormControl>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <SelectTrigger>
                      <SelectValue placeholder="Default" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="default">Default</SelectItem>
                      <SelectItem value="compact">Compact</SelectItem>
                      <SelectItem value="expanded">Expanded</SelectItem>
                    </SelectContent>
                  </Select>
                </FormControl>
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="showLabels"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between">
                <FormLabel className="text-sm">Show labels</FormLabel>
                <FormControl>
                  <Switch
                    checked={field.value}
                    onCheckedChange={(value) => {
                      field.onChange(value);
                    }}
                  />
                </FormControl>
              </FormItem>
            )}
          />
        </div>
      </AccordionContent>
    </AccordionItem>
  );
}

/**
 * Filter section inside the widget form accordion.
 * @param root0 - Section props.
 * @param root0.form - Hook form instance.
 */
function FiltersSection({ form }: { readonly form: UseFormReturn<FormValues> }) {
  return (
    <AccordionItem value="filters" className="border-border/60 rounded-md border">
      <AccordionTrigger>Filters</AccordionTrigger>
      <AccordionContent className="space-y-4 pt-3">
        <FormField
          control={form.control}
          name="filter"
          render={({ field }) => (
            <FormItem className="space-y-2">
              <FormLabel>Filter expression</FormLabel>
              <FormControl>
                <Input placeholder="e.g. status == 'published'" {...field} />
              </FormControl>
              <FormDescription>Use the filter bar to focus on relevant data.</FormDescription>
            </FormItem>
          )}
        />
      </AccordionContent>
    </AccordionItem>
  );
}

/**
 * Interactions section inside the widget form accordion.
 * @param root0 - Section props.
 * @param root0.form - Hook form instance.
 */
function InteractionsSection({ form }: { readonly form: UseFormReturn<FormValues> }) {
  return (
    <AccordionItem value="interactions" className="border-border/60 rounded-md border">
      <AccordionTrigger>Interactions</AccordionTrigger>
      <AccordionContent className="space-y-4 pt-3">
        <FormField
          control={form.control}
          name="interactionMode"
          render={({ field }) => (
            <FormItem className="space-y-2">
              <FormLabel>Interaction mode</FormLabel>
              <FormControl>
                <Select onValueChange={field.onChange} value={field.value}>
                  <SelectTrigger>
                    <SelectValue placeholder="Default" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="default">Default</SelectItem>
                    <SelectItem value="advanced">Advanced</SelectItem>
                  </SelectContent>
                </Select>
              </FormControl>
              <FormDescription>Controls how users can interact with this widget.</FormDescription>
            </FormItem>
          )}
        />
      </AccordionContent>
    </AccordionItem>
  );
}

/**
 * Renders the accordion-backed form for a single widget.
 * @param root0 - Component props.
 * @param root0.form - Hook form instance.
 * @param root0.copy - Copy map with localized labels.
 */
function WidgetFormPanel({ form, copy }: WidgetFormPanelProperties) {
  return (
    <Form {...form}>
      <Accordion type="single" collapsible defaultValue="data" className="space-y-3">
        <DataSection form={form} copy={copy} />
        <DisplaySection form={form} copy={copy} />
        <FiltersSection form={form} />
        <InteractionsSection form={form} />
      </Accordion>
    </Form>
  );
}

interface NodeFormPanelProperties {
  readonly form: UseFormReturn<FormValues>;
  readonly typeLabel?: string;
}

/**
 * Renders the accordion-backed form for a single node.
 * @param root0 - Component props.
 * @param root0.form - Hook form instance.
 * @param root0.typeLabel - Optional node type label.
 */
function NodeFormPanel({ form, typeLabel }: NodeFormPanelProperties) {
  return (
    <Form {...form}>
      <Accordion type="single" collapsible defaultValue="details" className="space-y-3">
        <AccordionItem value="details" className="border-border/60 rounded-md border">
          <AccordionTrigger>Details</AccordionTrigger>
          <AccordionContent className="space-y-4 pt-3">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem className="space-y-2">
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Node name" {...field} />
                  </FormControl>
                  <FormDescription>Primary label shown on the canvas.</FormDescription>
                </FormItem>
              )}
            />
            <FormItem className="space-y-2">
              <FormLabel>Type</FormLabel>
              <FormControl>
                <Input value={typeLabel ?? 'Unknown'} readOnly disabled />
              </FormControl>
              <FormDescription>Entity type assigned by the metamodel.</FormDescription>
            </FormItem>
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem className="space-y-2">
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Describe this node" rows={3} {...field} />
                  </FormControl>
                  <FormDescription>Optional context for collaborators.</FormDescription>
                </FormItem>
              )}
            />
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </Form>
  );
}

interface EdgeFormPanelProperties {
  readonly form: UseFormReturn<FormValues>;
  readonly typeLabel?: string;
  readonly from?: string;
  readonly to?: string;
}

/**
 * Render editable fields for a selected edge.
 * @param root0 - Component props.
 * @param root0.form - Hook form instance.
 * @param root0.typeLabel - Optional edge type label.
 * @param root0.from - Source node id.
 * @param root0.to - Target node id.
 */
function EdgeFormPanel({ form, typeLabel, from, to }: EdgeFormPanelProperties) {
  return (
    <Form {...form}>
      <Accordion type="single" collapsible defaultValue="details" className="space-y-3">
        <AccordionItem value="details" className="border-border/60 rounded-md border">
          <AccordionTrigger>Details</AccordionTrigger>
          <AccordionContent className="space-y-4 pt-3">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem className="space-y-2">
                  <FormLabel>Label</FormLabel>
                  <FormControl>
                    <Input placeholder="Relationship label" {...field} />
                  </FormControl>
                  <FormDescription>Label shown on the edge.</FormDescription>
                </FormItem>
              )}
            />
            <FormItem className="space-y-2">
              <FormLabel>Type</FormLabel>
              <FormControl>
                <Input value={typeLabel ?? 'Unknown'} readOnly disabled />
              </FormControl>
              <FormDescription>Relationship type from the metamodel.</FormDescription>
            </FormItem>
            <div className="grid gap-3 sm:grid-cols-2">
              <FormItem className="space-y-2">
                <FormLabel>From</FormLabel>
                <FormControl>
                  <Input value={from ?? '—'} readOnly disabled />
                </FormControl>
              </FormItem>
              <FormItem className="space-y-2">
                <FormLabel>To</FormLabel>
                <FormControl>
                  <Input value={to ?? '—'} readOnly disabled />
                </FormControl>
              </FormItem>
            </div>
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem className="space-y-2">
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Describe this relationship" rows={3} {...field} />
                  </FormControl>
                  <FormDescription>Optional context for collaborators.</FormDescription>
                </FormItem>
              )}
            />
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </Form>
  );
}

interface CellDetailsPanelProperties {
  readonly selectionId?: string;
}

/**
 * Render read-only details for a selected matrix cell.
 * @param root0 - Component props.
 * @param root0.selectionId - Cell identifier encoded as rowId::columnId.
 */
function CellDetailsPanel({ selectionId }: CellDetailsPanelProperties) {
  const parsed = parseCellSelectionId(selectionId);
  return (
    <div className="space-y-4">
      <p className="text-muted-foreground text-sm">
        Cell edits are coming next. For now, review row/column context.
      </p>
      <div className="grid gap-3">
        <div className="border-border/60 bg-muted/20 rounded-md border p-3">
          <p className="text-muted-foreground text-xs tracking-[0.3em] uppercase">Row</p>
          <p className="text-sm font-semibold">{parsed?.rowId ?? '—'}</p>
        </div>
        <div className="border-border/60 bg-muted/20 rounded-md border p-3">
          <p className="text-muted-foreground text-xs tracking-[0.3em] uppercase">Column</p>
          <p className="text-sm font-semibold">{parsed?.columnId ?? '—'}</p>
        </div>
      </div>
    </div>
  );
}

/**
 *
 * @param selectionId
 */
function parseCellSelectionId(
  selectionId?: string,
): { rowId: string; columnId: string } | undefined {
  if (!selectionId) {
    return undefined;
  }
  const [rowId, columnId] = selectionId.split('::');
  if (!rowId || !columnId) {
    return undefined;
  }
  return { rowId, columnId };
}

export interface PropertiesInspectorProperties {
  readonly selection: SelectionState;
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
 * @param root0 - Component props.
 * @param root0.selection - Current selection state from the canvas.
 * @param root0.selectionKind - Derivation of the selection type.
 * @param root0.selectionId - Primary selection identifier.
 * @param root0.properties - Optional persisted properties for the selection.
 * @param root0.onSave - Callback invoked when the user saves changes.
 * @param root0.onReset - Callback invoked when the reset action is triggered.
 * @param root0.saving - Whether the inspector is busy saving changes.
 * @param root0.error - Optional error message to render.
 */
// eslint-disable-next-line sonarjs/cognitive-complexity
export function PropertiesInspector({
  selection,
  selectionKind,
  selectionId,
  properties,
  onSave,
  onReset,
  saving,
  error,
}: PropertiesInspectorProperties) {
  const copy = templateScreenCopy.properties;
  const selectionCount =
    selection.nodeIds.length + selection.edgeIds.length + selection.cellIds.length;
  const hasSingleSelection = selectionCount === 1;
  const showWidgetForm = selectionKind === 'widget' && !!selectionId;
  const showNodeForm = selectionKind === 'node' && !!selectionId && hasSingleSelection;
  const showEdgeForm = selectionKind === 'edge' && !!selectionId && hasSingleSelection;
  const showCellForm = selectionKind === 'cell' && !!selectionId && hasSingleSelection;
  const showMultiState =
    !showWidgetForm && !showNodeForm && !showEdgeForm && !showCellForm && selectionCount > 1;
  const showEmptyState =
    !showWidgetForm && !showNodeForm && !showEdgeForm && !showCellForm && selectionCount === 0;
  let badgeLabel = 'Page';
  if (showWidgetForm) {
    badgeLabel = 'Widget';
  } else if (showNodeForm) {
    badgeLabel = 'Node';
  } else if (showEdgeForm) {
    badgeLabel = 'Edge';
  } else if (showCellForm) {
    badgeLabel = 'Cell';
  } else if (showMultiState) {
    badgeLabel = 'Multi';
  }

  const headerDescription = useMemo(() => {
    if (showEmptyState) {
      return 'Select a widget to edit its data, display, or interactions.';
    }
    if (showNodeForm) {
      return 'Edit node fields and apply a change task to the twin.';
    }
    if (showEdgeForm) {
      return 'Edit relationship details and apply a change task to the twin.';
    }
    if (showCellForm) {
      return 'Inspect the selected matrix cell.';
    }
    if (showMultiState) {
      return `${selectionCount.toString()} items selected. Use bulk actions to keep the storyboard tidy.`;
    }
    return copy.widgetHeading;
  }, [
    copy.widgetHeading,
    selectionCount,
    showEdgeForm,
    showEmptyState,
    showCellForm,
    showMultiState,
    showNodeForm,
  ]);

  const form = useForm<FormValues>({
    defaultValues: {
      name: resolveFieldValue(properties?.name, selectionId),
      dataSource: properties?.dataSource ?? '',
      layout: properties?.layout ?? '',
      description: properties?.description ?? '',
      filter: '',
      displayMode: 'default',
      showLabels: true,
      interactionMode: 'default',
    },
  });

  useEffect(() => {
    if (!showWidgetForm && !showNodeForm && !showEdgeForm && !showCellForm) {
      return;
    }
    form.reset({
      name: resolveFieldValue(properties?.name, selectionId),
      dataSource: properties?.dataSource ?? '',
      layout: properties?.layout ?? '',
      description: properties?.description ?? '',
      filter: '',
      displayMode: 'default',
      showLabels: true,
      interactionMode: 'default',
    });
  }, [form, properties, selectionId, showCellForm, showEdgeForm, showNodeForm, showWidgetForm]);

  const submit = form.handleSubmit(async (values) => {
    if (showWidgetForm || showNodeForm || showEdgeForm) {
      await onSave?.({
        name: values.name,
        dataSource: values.dataSource,
        layout: values.layout,
        description: values.description,
      });
    }
  });

  const handleSave = () => {
    void submit().catch(() => {
      /* ignore */
    });
  };

  const showSaveActions = showWidgetForm || showNodeForm || showEdgeForm;

  let footer: ReactNode | undefined;
  if (showSaveActions) {
    footer = (
      <CardFooter className="flex flex-wrap items-center gap-4">
        <Button size="sm" onClick={handleSave} disabled={saving}>
          {saving ? 'Saving…' : 'Save changes'}
        </Button>
        <Button size="sm" variant="outline" onClick={onReset} disabled={saving}>
          Reset
        </Button>
        {error ? <p className="text-destructive text-xs">{error}</p> : undefined}
      </CardFooter>
    );
  } else if (showMultiState) {
    footer = (
      <CardFooter className="flex flex-wrap gap-4">
        <Button size="sm" variant="outline" onClick={alignBulkAction}>
          Align
        </Button>
        <Button size="sm" variant="outline" onClick={distributeBulkAction}>
          Distribute
        </Button>
        <Button size="sm" variant="destructive" onClick={deleteBulkAction}>
          Delete
        </Button>
      </CardFooter>
    );
  }

  return (
    <div className="bg-background flex min-h-full flex-col">
      <CardHeader className="space-y-2 p-4">
        <div className="flex items-center justify-between gap-2">
          <CardTitle>Properties</CardTitle>
          <Badge variant="secondary" className="text-[0.6rem] tracking-[0.36em] uppercase">
            {badgeLabel}
          </Badge>
        </div>
        <CardDescription>{headerDescription}</CardDescription>
      </CardHeader>

      <ScrollArea className="relative flex-1 overflow-hidden">
        <CardContent className="space-y-4 p-4">
          {showEmptyState && (
            <div className="text-muted-foreground flex flex-col items-center gap-1 py-10 text-center">
              <p className="text-sm font-medium">Nothing selected</p>
              <p className="text-xs">
                Select a widget, node, or edge on the canvas to edit it here.
              </p>
            </div>
          )}

          {showMultiState && <MultiSelectionPanel selectionCount={selectionCount} />}

          {showWidgetForm && <WidgetFormPanel form={form} copy={copy} />}

          {showNodeForm && <NodeFormPanel form={form} typeLabel={properties?.type} />}

          {showEdgeForm && (
            <EdgeFormPanel
              form={form}
              typeLabel={properties?.type}
              from={properties?.from}
              to={properties?.to}
            />
          )}

          {showCellForm && <CellDetailsPanel selectionId={selectionId} />}
        </CardContent>
      </ScrollArea>

      {footer}
    </div>
  );
}
