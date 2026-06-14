import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';

import { AlertTriangle } from 'design-system/icons';

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from 'design-system';
import { toErrorMessage } from 'praxis/lib/errors';
import { cn } from 'praxis/lib/utilities';
import {
  getMatrixView,
  type MatrixAxis,
  type MatrixCell,
  type MatrixViewModel,
} from 'praxis/praxis-api';

import type {
  PraxisMatrixWidgetConfig as MatrixWidgetConfig,
  SelectionState,
  WidgetSelection,
} from 'praxis/types';
import { WidgetToolbar } from './widget-toolbar';

interface MatrixWidgetProperties {
  readonly widget: MatrixWidgetConfig;
  readonly reloadVersion: number;
  readonly selection?: SelectionState;
  readonly onSelectionChange?: (selection: WidgetSelection) => void;
}

/**
 *
 * @param root0
 * @param root0.widget
 * @param root0.reloadVersion
 * @param root0.selection
 * @param root0.onSelectionChange
 */
export function MatrixWidget({
  widget,
  reloadVersion,
  selection,
  onSelectionChange,
}: MatrixWidgetProperties) {
  const [model, setModel] = useState<MatrixViewModel | undefined>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | undefined>();

  const definition = useMemo(() => widget.view, [widget.view]);

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
    loadView().catch((_ignoredError: unknown) => {
      return;
    });
  }, [loadView, reloadVersion]);

  const cellMap = useMemo(() => buildCellIndex(model?.cells ?? []), [model?.cells]);
  const activeNodeIds = useMemo(
    () => (selection?.nodeIds ? new Set(selection.nodeIds) : new Set<string>()),
    [selection?.nodeIds],
  );
  const activeCellIds = useMemo(
    () => (selection?.cellIds ? new Set(selection.cellIds) : new Set<string>()),
    [selection?.cellIds],
  );

  const emitSelection = useCallback(
    (payload: { nodeIds?: string[]; cellIds?: string[] }) => {
      onSelectionChange?.({
        widgetId: widget.id,
        nodeIds: payload.nodeIds ?? [],
        edgeIds: [],
        cellIds: payload.cellIds ?? [],
      });
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
          activeNodeIds={activeNodeIds}
          activeCellIds={activeCellIds}
          onRowSelect={(rowId) => {
            emitSelection({ nodeIds: [rowId] });
          }}
          onColumnSelect={(columnId) => {
            emitSelection({ nodeIds: [columnId] });
          }}
          onCellSelect={(rowId, columnId) => {
            emitSelection({ cellIds: [cellKey(rowId, columnId)] });
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
        onRefresh={() => {
          loadView().catch((_ignoredError: unknown) => {
            return;
          });
        }}
      />
      <div className="border-border/60 bg-background/40 flex-1 space-y-3 rounded-2xl border p-3">
        {body}
      </div>
    </div>
  );
}

/**
 *
 * @param parameters
 * @param parameters.rows
 * @param parameters.columns
 * @param parameters.cellMap
 * @param parameters.activeNodeIds
 * @param parameters.activeCellIds
 * @param parameters.onRowSelect
 * @param parameters.onColumnSelect
 * @param parameters.onCellSelect
 */
function MatrixTable(parameters: {
  readonly rows: MatrixAxis[];
  readonly columns: MatrixAxis[];
  readonly cellMap: Map<string, MatrixCell>;
  readonly activeNodeIds: Set<string>;
  readonly activeCellIds: Set<string>;
  readonly onRowSelect: (rowId: string) => void;
  readonly onColumnSelect: (columnId: string) => void;
  readonly onCellSelect: (rowId: string, columnId: string) => void;
}) {
  const {
    rows,
    columns,
    cellMap,
    activeNodeIds,
    activeCellIds,
    onRowSelect,
    onColumnSelect,
    onCellSelect,
  } = parameters;
  if (rows.length === 0 || columns.length === 0) {
    return <Placeholder message="Add rows and columns to visualise relationships" />;
  }
  return (
    <div className="overflow-auto">
      <Table className="min-w-[480px] border-collapse text-xs">
        <TableHeader>
          <TableRow>
            <TableHead className="text-muted-foreground w-48 text-xs font-semibold tracking-[0.2em] uppercase">
              Rows / Columns
            </TableHead>
            {columns.map((column) => (
              <TableHead key={column.id} className="text-center">
                <button
                  type="button"
                  className={cn(
                    'w-full rounded-lg px-2 py-1 text-xs font-medium transition',
                    activeNodeIds.has(column.id)
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
            <TableRow key={row.id} data-state={activeNodeIds.has(row.id) ? 'selected' : undefined}>
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
                  active={
                    activeCellIds.has(cellKey(row.id, column.id)) ||
                    (activeNodeIds.has(row.id) && activeNodeIds.has(column.id))
                  }
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

/**
 *
 * @param root0
 * @param root0.cell
 * @param root0.active
 * @param root0.onClick
 */
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
    intent === 'connected' ? 'bg-primary/15 text-primary' : 'bg-muted/20 text-muted-foreground';
  let activeClass = '';
  if (active) {
    activeClass = intent === 'connected' ? 'ring-2 ring-primary/50' : 'ring-2 ring-primary/40';
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

/**
 *
 */
function Legend() {
  return (
    <div className="text-muted-foreground flex flex-wrap gap-4 text-xs">
      <LegendItem colorClass="bg-primary/20 text-primary" label="Connected" />
      <LegendItem colorClass="bg-muted/30" label="Missing" />
      <LegendItem colorClass="ring-2 ring-primary/40" label="Selection overlap" />
    </div>
  );
}

/**
 *
 * @param root0
 * @param root0.colorClass
 * @param root0.label
 */
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

/**
 *
 * @param root0
 * @param root0.message
 */
function Placeholder({ message }: { readonly message: string }) {
  return <p className="text-muted-foreground text-sm">{message}</p>;
}

/**
 *
 * @param root0
 * @param root0.message
 */
function ErrorMessage({ message }: { readonly message: string }) {
  return (
    <p className="text-destructive flex items-center gap-2 text-sm">
      <AlertTriangle className="h-4 w-4" />
      {message}
    </p>
  );
}

/**
 *
 * @param cells
 */
function buildCellIndex(cells: MatrixCell[]): Map<string, MatrixCell> {
  const map = new Map<string, MatrixCell>();
  for (const cell of cells) {
    map.set(cellKey(cell.rowId, cell.columnId), cell);
  }
  return map;
}

/**
 *
 * @param rowId
 * @param columnId
 */
function cellKey(rowId: string, columnId: string): string {
  return `${rowId}::${columnId}`;
}
