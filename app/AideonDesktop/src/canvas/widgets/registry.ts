import type {
  CatalogueViewDefinition,
  ChartViewDefinition,
  GraphViewDefinition,
  MatrixViewDefinition,
} from 'canvas/praxis-api';
import type { WidgetKind, WidgetSize } from 'canvas/types';

export interface WidgetRegistryEntry {
  readonly type: WidgetKind;
  readonly label: string;
  readonly description: string;
  readonly icon: string;
  readonly defaultSize: WidgetSize;
  readonly defaultView:
    | Omit<GraphViewDefinition, 'asOf' | 'scenario'>
    | Omit<CatalogueViewDefinition, 'asOf' | 'scenario'>
    | Omit<MatrixViewDefinition, 'asOf' | 'scenario'>
    | Omit<ChartViewDefinition, 'asOf' | 'scenario'>;
}

const registry: WidgetRegistryEntry[] = [
  {
    type: 'graph',
    label: 'Graph',
    description: 'Time-sliced entity graph with selection + meta focus.',
    icon: 'graph',
    defaultSize: 'full',
    defaultView: {
      id: 'graph-default',
      name: 'Graph',
      kind: 'graph',
      filters: { nodeTypes: ['Capability', 'Application'], edgeTypes: ['depends_on'] },
    },
  },
  {
    type: 'catalogue',
    label: 'Catalogue',
    description: 'Tabular slice of entities with quick selection.',
    icon: 'table',
    defaultSize: 'full',
    defaultView: {
      id: 'catalogue-default',
      name: 'Catalogue',
      kind: 'catalogue',
      columns: [
        { id: 'name', label: 'Name', type: 'string' },
        { id: 'owner', label: 'Owner', type: 'string' },
        { id: 'state', label: 'State', type: 'string' },
      ],
    },
  },
  {
    type: 'matrix',
    label: 'Matrix',
    description: 'Coverage grid for two entity types and their relationships.',
    icon: 'grid',
    defaultSize: 'half',
    defaultView: {
      id: 'matrix-default',
      name: 'Coverage matrix',
      kind: 'matrix',
      rowType: 'Capability',
      columnType: 'Service',
      relationship: 'depends_on',
    },
  },
  {
    type: 'chart',
    label: 'Chart',
    description: 'KPIs or trend lines for the active scenario.',
    icon: 'chart',
    defaultSize: 'half',
    defaultView: {
      id: 'chart-default',
      name: 'Operational KPI',
      kind: 'chart',
      chartType: 'kpi',
      measure: 'Operational readiness',
    },
  },
];

/**
 *
 */
export function listWidgetRegistry(): WidgetRegistryEntry[] {
  return registry;
}

/**
 *
 * @param type
 */
export function widgetDefaults(type: WidgetKind): WidgetRegistryEntry | undefined {
  return registry.find((entry) => entry.type === type);
}
