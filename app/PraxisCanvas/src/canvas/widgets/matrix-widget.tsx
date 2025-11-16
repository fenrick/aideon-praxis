import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';

import { AlertTriangle } from 'lucide-react';

import { toErrorMessage } from '@/lib/errors';
import { cn } from '@/lib/utilities';
import {
  getMatrixView,
  type MatrixAxis,
  type MatrixCell,
  type MatrixViewModel,
} from '@/praxis-api';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@aideon/design-system/ui/table';

import type { MatrixWidgetConfig, SelectionState, WidgetSelection } from '../types';
import { WidgetToolbar } from './widget-toolbar';

interface MatrixWidgetProperties {
  readonly widget: MatrixWidgetConfig;
  readonly reloadVersion: number;
  readonly selection?: SelectionState;
  readonly onSelectionChange?: (selection: WidgetSelection) => void;
}

export function MatrixWidget({
  widget,
  reloadVersion,
  selection,
  onSelectionChange,
}: MatrixWidgetProperties) {
  const [model, setModel] = useState<MatrixViewModel | undefined>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | undefined>();

  const definition = useMemo(() => {
    return {
      ...widget.view,
      asOf: new Date().toISOString(),
    };
  }, [widget.view, reloadVersion]);

  const loadView = useCallback(async () => {
    setLoading(true);
    setError(undefined);
    try {
      const view = await getMatrixView(definition);
      setModel(view);
    } catch (unknownError) {
      const message = toErrorMessage(unknownError);
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [definition]);

  useEffect(() => {
    void loadView();
  }, [loadView]);

  const cellMap = useMemo(() => buildCellIndex(model?.cells ?? []), [model?.cells]);
  const selectedIds = selection?.nodeIds ?? [];
  const activeIds = useMemo(() => new Set(selectedIds), [selectedIds]);

  const emitSelection = useCallback(
    (nodeIds: string[]) => {
      onSelectionChange?.({ widgetId: widget.id, nodeIds, edgeIds: [] });
    },
    [onSelectionChange, widget.id],
  );

  let body: ReactNode = <Placeholder message="Loading matrix..." />;
  if (error) {
    body = <ErrorMessage message={error} />;
  } else if (model) {
    body = (
      <>
        <MatrixTable
          rows={model.rows}
          columns={model.columns}
          cellMap={cellMap}
          activeIds={activeIds}
          onRowSelect={(rowId) => {
            emitSelection([rowId]);
          }}
          onColumnSelect={(columnId) => {
            emitSelection([columnId]);
          }}
          onCellSelect={(rowId, columnId) => {
            emitSelection([rowId, columnId]);
          }}
        />
        <Legend />
      </>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <WidgetToolbar
        metadata={model?.metadata}
        fallbackTitle={widget.title}
        loading={loading}
        onRefresh={() => void loadView()}
      />
      <div className="flex-1 space-y-3 rounded-2xl border border-border/60 bg-background/40 p-3">
        {body}
      </div>
    </div>
  );
}

function MatrixTable(parameters: {
  readonly rows: MatrixAxis[];
  readonly columns: MatrixAxis[];
  readonly cellMap: Map<string, MatrixCell>;
  readonly activeIds: Set<string>;
  readonly onRowSelect: (rowId: string) => void;
  readonly onColumnSelect: (columnId: string) => void;
  readonly onCellSelect: (rowId: string, columnId: string) => void;
}) {
  const { rows, columns, cellMap, activeIds, onRowSelect, onColumnSelect, onCellSelect } =
    parameters;
  if (rows.length === 0 || columns.length === 0) {
    return <Placeholder message="Add rows and columns to visualise relationships" />;
  }
  return (
    <div className="overflow-auto">
      <Table className="min-w-[480px] border-collapse text-xs">
        <TableHeader>
          <TableRow>
            <TableHead className="w-48 text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              Rows / Columns
            </TableHead>
            {columns.map((column) => (
              <TableHead key={column.id} className="text-center">
                <button
                  type="button"
                  className={cn(
                    'w-full rounded-lg px-2 py-1 text-xs font-medium transition',
                    activeIds.has(column.id)
                      ? 'bg-primary/10 text-primary'
                      : 'text-muted-foreground hover:bg-muted/40',
                  )}
                  data-testid={`matrix-column-${column.id}`}
                  onClick={() => {
                    onColumnSelect(column.id);
                  }}
                >
                  {column.label}
                </button>
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.id} data-state={activeIds.has(row.id) ? 'selected' : undefined}>
              <TableHead className="text-left text-sm font-semibold normal-case">
                <button
                  type="button"
                  className="w-full rounded-lg px-2 py-1 text-left"
                  data-testid={`matrix-row-${row.id}`}
                  onClick={() => {
                    onRowSelect(row.id);
                  }}
                >
                  {row.label}
                </button>
              </TableHead>
              {columns.map((column) => (
                <MatrixCellView
                  key={`${row.id}-${column.id}`}
                  cell={cellMap.get(cellKey(row.id, column.id))}
                  active={activeIds.has(row.id) && activeIds.has(column.id)}
                  onClick={() => {
                    onCellSelect(row.id, column.id);
                  }}
                />
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function MatrixCellView({
  cell,
  active,
  onClick,
}: {
  readonly cell?: MatrixCell;
  readonly active: boolean;
  readonly onClick: () => void;
}) {
  const intent = cell?.state ?? 'missing';
  const baseClass =
    intent === 'connected'
      ? 'bg-emerald-100 text-emerald-900'
      : 'bg-muted/20 text-muted-foreground';
  let activeClass = '';
  if (active) {
    activeClass = intent === 'connected' ? 'ring-2 ring-emerald-400' : 'ring-2 ring-primary/40';
  }
  const connectedValue = `${Math.round((cell?.strength ?? 0) * 100).toString()}%`;

  return (
    <TableCell>
      <button
        type="button"
        className={cn(
          'flex w-full items-center justify-center rounded-lg px-2 py-3 text-xs font-semibold transition',
          baseClass,
          activeClass,
        )}
        data-testid={cell ? `matrix-cell-${cell.rowId}-${cell.columnId}` : undefined}
        onClick={onClick}
      >
        {cell?.state === 'connected' ? connectedValue : '—'}
      </button>
    </TableCell>
  );
}

function Legend() {
  return (
    <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
      <LegendItem colorClass="bg-emerald-200 text-emerald-900" label="Connected" />
      <LegendItem colorClass="bg-muted/30" label="Missing" />
      <LegendItem colorClass="ring-2 ring-primary/40" label="Selection overlap" />
    </div>
  );
}

function LegendItem({
  colorClass,
  label,
}: {
  readonly colorClass: string;
  readonly label: string;
}) {
  return (
    <span className="flex items-center gap-2">
      <span className={cn('h-3 w-6 rounded-full', colorClass)} aria-hidden />
      {label}
    </span>
  );
}

function Placeholder({ message }: { readonly message: string }) {
  return <p className="text-sm text-muted-foreground">{message}</p>;
}

function ErrorMessage({ message }: { readonly message: string }) {
  return (
    <p className="flex items-center gap-2 text-sm text-destructive">
      <AlertTriangle className="h-4 w-4" />
      {message}
    </p>
  );
}

function buildCellIndex(cells: MatrixCell[]): Map<string, MatrixCell> {
  const map = new Map<string, MatrixCell>();
  for (const cell of cells) {
    map.set(cellKey(cell.rowId, cell.columnId), cell);
  }
  return map;
}

function cellKey(rowId: string, columnId: string): string {
  return `${rowId}::${columnId}`;
}
