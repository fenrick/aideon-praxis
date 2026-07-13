import { useCallback, useEffect, useMemo, useState } from 'react';

import { useTranslations } from 'next-intl';

import { AlertTriangle } from 'design-system/icons';

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from 'design-system';
import { toErrorMessage } from 'praxis/lib/errors';
import { getCatalogueView, type CatalogueRow, type CatalogueViewModel } from 'praxis/praxis-api';

import type {
  PraxisCatalogueWidgetConfig as CatalogueWidgetConfig,
  SelectionState,
  WidgetSelection,
} from 'praxis/types';
import { WidgetToolbar } from './widget-toolbar';

interface CatalogueWidgetProperties {
  readonly widget: CatalogueWidgetConfig;
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
export function CatalogueWidget({
  widget,
  reloadVersion,
  selection,
  onSelectionChange,
}: CatalogueWidgetProperties) {
  const t = useTranslations('engines.praxis.widgets.catalogue');
  const [model, setModel] = useState<CatalogueViewModel | undefined>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | undefined>();

  const definition = useMemo(() => widget.view, [widget.view]);

  const loadView = useCallback(async () => {
    setLoading(true);
    setError(undefined);
    try {
      const view = await getCatalogueView(definition);
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

  const handleRowActivate = useCallback(
    (row: CatalogueRow) => {
      onSelectionChange?.({ widgetId: widget.id, nodeIds: [row.id], edgeIds: [], cellIds: [] });
    },
    [onSelectionChange, widget.id],
  );

  const selectedNodes = selection?.nodeIds ?? [];
  const activeRowIds = new Set(selectedNodes);

  let body: React.ReactNode = <Placeholder message={t('loading')} />;
  if (error) {
    body = <ErrorMessage message={error} />;
  } else if (model) {
    body = (
      <CatalogueTable
        rows={model.rows}
        columns={model.columns}
        loading={loading}
        activeRowIds={activeRowIds}
        onRowActivate={handleRowActivate}
        loadingMessage={t('loading')}
        emptyMessage={t('empty')}
        boolYes={t('boolYes')}
        boolNo={t('boolNo')}
      />
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
      <div className="border-border/60 bg-background/40 flex-1 rounded-2xl border p-3">{body}</div>
    </div>
  );
}

interface CatalogueTableProperties {
  readonly rows: CatalogueRow[];
  readonly columns: CatalogueViewModel['columns'];
  readonly activeRowIds: Set<string>;
  readonly loading: boolean;
  readonly onRowActivate: (row: CatalogueRow) => void;
  readonly loadingMessage: string;
  readonly emptyMessage: string;
  readonly boolYes: string;
  readonly boolNo: string;
}

/**
 *
 * @param root0
 * @param root0.rows
 * @param root0.columns
 * @param root0.activeRowIds
 * @param root0.loading
 * @param root0.onRowActivate
 * @param root0.loadingMessage
 * @param root0.emptyMessage
 * @param root0.boolYes
 * @param root0.boolNo
 */
function CatalogueTable({
  rows,
  columns,
  activeRowIds,
  loading,
  onRowActivate,
  loadingMessage,
  emptyMessage,
  boolYes,
  boolNo,
}: CatalogueTableProperties) {
  if (rows.length === 0) {
    return <Placeholder message={loading ? loadingMessage : emptyMessage} />;
  }
  return (
    <Table>
      <TableHeader>
        <TableRow>
          {columns.map((column) => (
            <TableHead key={column.id}>{column.label}</TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => {
          const isSelected = activeRowIds.has(row.id);
          return (
            <TableRow
              key={row.id}
              data-state={isSelected ? 'selected' : undefined}
              data-testid={`catalogue-row-${row.id}`}
              className="cursor-pointer"
              onClick={() => {
                onRowActivate(row);
              }}
            >
              {columns.map((column) => (
                <TableCell key={`${row.id}-${column.id}`} className="text-sm">
                  <button
                    type="button"
                    className="hover:bg-muted/40 focus-visible:ring-ring w-full rounded-md px-2 py-1 text-left transition focus-visible:ring-2 focus-visible:outline-none"
                    data-testid={`catalogue-cell-${row.id}-${column.id}`}
                    onClick={() => {
                      onRowActivate(row);
                    }}
                  >
                    {formatValue(row.values[column.id], boolYes, boolNo)}
                  </button>
                </TableCell>
              ))}
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}

/**
 *
 * @param value
 * @param boolYes
 * @param boolNo
 */
function formatValue(
  value: string | number | boolean | null | undefined,
  boolYes: string,
  boolNo: string,
): string {
  if (typeof value === 'boolean') {
    return value ? boolYes : boolNo;
  }
  if (value === null || value === undefined) {
    return '—';
  }
  return String(value);
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
