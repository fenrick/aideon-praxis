import { isSelectionEmpty, selectionSummary } from '@/canvas/selection';
import type { CanvasWidget, SelectionState } from '@/canvas/types';
import { EMPTY_SELECTION } from '@/canvas/types';
import { Button } from '@aideon/design-system/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@aideon/design-system/components/ui/card';

interface SelectionInspectorCardProperties {
  readonly selection: SelectionState;
  readonly widgets: CanvasWidget[];
  readonly onSelectionChange?: (selection: SelectionState) => void;
}

export function SelectionInspectorCard({
  selection,
  widgets,
  onSelectionChange,
}: SelectionInspectorCardProperties) {
  const empty = isSelectionEmpty(selection);
  const sourceWidget = widgets.find((widget) => widget.id === selection.sourceWidgetId);
  const sourceLabel = sourceWidget ? sourceWidget.title : 'No widget';
  const nodeIds = selection.nodeIds.slice(0, 6);
  const edgeIds = selection.edgeIds.slice(0, 4);

  const handleClear = () => {
    onSelectionChange?.(EMPTY_SELECTION);
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-3">
        <div>
          <CardTitle>Selection</CardTitle>
          <CardDescription>{selectionSummary(selection)}</CardDescription>
          {empty ? null : <p className="text-xs text-muted-foreground">Source: {sourceLabel}</p>}
        </div>
        <Button variant="ghost" size="sm" disabled={empty} onClick={handleClear}>
          Clear
        </Button>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        {empty ? (
          <p className="text-muted-foreground">Select nodes, rows, or cells to inspect them.</p>
        ) : (
          <>
            <SelectionList label="Nodes" values={nodeIds} emptyLabel="No nodes" />
            <SelectionList label="Edges" values={edgeIds} emptyLabel="No edges" />
          </>
        )}
      </CardContent>
    </Card>
  );
}

function SelectionList({
  label,
  values,
  emptyLabel,
}: {
  readonly label: string;
  readonly values: string[];
  readonly emptyLabel: string;
}) {
  return (
    <div>
      <p className="text-xs uppercase tracking-[0.35em] text-muted-foreground">{label}</p>
      {values.length === 0 ? (
        <p className="text-sm text-muted-foreground">{emptyLabel}</p>
      ) : (
        <ul className="mt-1 space-y-1">
          {values.map((value) => (
            <li
              key={value}
              className="rounded-md border border-border/60 bg-muted/30 px-2 py-1 text-xs font-medium"
            >
              {value}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
