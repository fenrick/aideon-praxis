import { useCallback, useEffect, useMemo, useState } from 'react';

import { useTranslations } from 'next-intl';

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

interface MatrixSelectionPayload {
  readonly nodeIds?: string[];
  readonly cellIds?: string[];
}

type EmitSelection = (payload: MatrixSelectionPayload) => void;

interface MatrixLabels {
  readonly loading: string;
  readonly empty: string;
  readonly rowsColumns: string;
  readonly legendConnected: string;
  readonly legendMissing: string;
  readonly legendSelectionOverlap: string;
}

interface MatrixViewState {
  readonly model: MatrixViewModel | undefined;
  readonly loading: boolean;
  readonly error: string | undefined;
}

/**
 * Load the matrix view model and expose its loading state alongside a reload trigger.
 * @param definition - The matrix view definition to fetch.
 * @param reloadVersion - Bumped by the host to force a fresh fetch.
 */
function useMatrixView(
  definition: MatrixWidgetConfig['view'],
  reloadVersion: number,
): readonly [MatrixViewState, () => void] {
  const [model, setModel] = useState<MatrixViewModel | undefined>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | undefined>();

  const loadView = useCallback(async () => {
    setLoading(true);
    setError(undefined);
    try {
      const view = await getMatrixView(definition);
      setModel(view);
    } catch (unknownError) {
      setError(toErrorMessage(unknownError));
    } finally {
      setLoading(false);
    }
  }, [definition]);

  const reload = useCallback(() => {
    loadView().catch((_ignoredError: unknown) => {
      return;
    });
  }, [loadView]);

  useEffect(() => {
    loadView().catch((_ignoredError: unknown) => {
      return;
    });
  }, [loadView, reloadVersion]);

  return [{ model, loading, error }, reload];
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
  const t = useTranslations('engines.praxis.widgets.matrix');
  const definition = useMemo(() => widget.view, [widget.view]);
  const [{ model, loading, error }, reload] = useMatrixView(definition, reloadVersion);

  const emitSelection = useCallback<EmitSelection>(
    (payload) => {
      onSelectionChange?.({
        widgetId: widget.id,
        nodeIds: payload.nodeIds ?? [],
        edgeIds: [],
        cellIds: payload.cellIds ?? [],
      });
    },
    [onSelectionChange, widget.id],
  );

  const labels: MatrixLabels = {
    loading: t('loading'),
    empty: t('empty'),
    rowsColumns: t('rowsColumns'),
    legendConnected: t('legendConnected'),
    legendMissing: t('legendMissing'),
    legendSelectionOverlap: t('legendSelectionOverlap'),
  };

  return (
    <div className="flex h-full flex-col">
      <WidgetToolbar
        metadata={model?.metadata}
        fallbackTitle={widget.title}
        loading={loading}
        onRefresh={reload}
      />
      <div className="border-border/60 bg-background/40 flex-1 space-y-3 rounded-2xl border p-3">
        <MatrixBody
          model={model}
          error={error}
          selection={selection}
          emitSelection={emitSelection}
          labels={labels}
        />
      </div>
    </div>
  );
}

/**
 * Render the loading, error, or populated matrix state.
 * @param root0
 * @param root0.model
 * @param root0.error
 * @param root0.selection
 * @param root0.emitSelection
 * @param root0.labels
 */
function MatrixBody({
  model,
  error,
  selection,
  emitSelection,
  labels,
}: {
  readonly model: MatrixViewModel | undefined;
  readonly error: string | undefined;
  readonly selection?: SelectionState;
  readonly emitSelection: EmitSelection;
  readonly labels: MatrixLabels;
}) {
  if (error) {
    return <ErrorMessage message={error} />;
  }
  if (!model) {
    return <Placeholder message={labels.loading} />;
  }
  return (
    <>
      <MatrixTable
        rows={model.rows}
        columns={model.columns}
        cellMap={buildCellIndex(model.cells)}
        activeNodeIds={toIdSet(selection?.nodeIds)}
        activeCellIds={toIdSet(selection?.cellIds)}
        rowsColumnsLabel={labels.rowsColumns}
        emptyMessage={labels.empty}
        emitSelection={emitSelection}
      />
      <Legend
        connectedLabel={labels.legendConnected}
        missingLabel={labels.legendMissing}
        selectionOverlapLabel={labels.legendSelectionOverlap}
      />
    </>
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
 * @param parameters.emitSelection
 * @param parameters.rowsColumnsLabel
 * @param parameters.emptyMessage
 */
function MatrixTable(parameters: {
  readonly rows: MatrixAxis[];
  readonly columns: MatrixAxis[];
  readonly cellMap: Map<string, MatrixCell>;
  readonly activeNodeIds: Set<string>;
  readonly activeCellIds: Set<string>;
  readonly emitSelection: EmitSelection;
  readonly rowsColumnsLabel: string;
  readonly emptyMessage: string;
}) {
  const {
    rows,
    columns,
    cellMap,
    activeNodeIds,
    activeCellIds,
    emitSelection,
    rowsColumnsLabel,
    emptyMessage,
  } = parameters;
  if (rows.length === 0 || columns.length === 0) {
    return <Placeholder message={emptyMessage} />;
  }
  return (
    <div className="overflow-auto">
      <Table className="min-w-[480px] border-collapse text-xs">
        <TableHeader>
          <TableRow>
            <TableHead className="text-muted-foreground w-48 text-xs font-semibold tracking-[0.2em] uppercase">
              {rowsColumnsLabel}
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
                    emitSelection({ nodeIds: [column.id] });
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
                    emitSelection({ nodeIds: [row.id] });
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
                    emitSelection({ cellIds: [cellKey(row.id, column.id)] });
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
 * @param root0
 * @param root0.connectedLabel
 * @param root0.missingLabel
 * @param root0.selectionOverlapLabel
 */
function Legend({
  connectedLabel,
  missingLabel,
  selectionOverlapLabel,
}: {
  readonly connectedLabel: string;
  readonly missingLabel: string;
  readonly selectionOverlapLabel: string;
}) {
  return (
    <div className="text-muted-foreground flex flex-wrap gap-4 text-xs">
      <LegendItem colorClass="bg-primary/20 text-primary" label={connectedLabel} />
      <LegendItem colorClass="bg-muted/30" label={missingLabel} />
      <LegendItem colorClass="ring-2 ring-primary/40" label={selectionOverlapLabel} />
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
 * Build a lookup of matrix cells keyed by their row and column identifiers.
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
 * Build a set of identifiers, treating an absent list as empty.
 * @param ids
 */
function toIdSet(ids: string[] | undefined): Set<string> {
  return new Set<string>(ids);
}

/**
 *
 * @param rowId
 * @param columnId
 */
function cellKey(rowId: string, columnId: string): string {
  return `${rowId}::${columnId}`;
}
