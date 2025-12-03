import type {
  CatalogueViewDefinition,
  ChartViewDefinition,
  GraphViewDefinition,
  GraphViewModel,
  MatrixViewDefinition,
} from 'canvas/praxis-api';

export type WidgetKind = 'graph' | 'catalogue' | 'matrix' | 'chart';

export type WidgetSize = 'full' | 'half';

interface BaseWidgetConfig<TView> {
  id: string;
  title: string;
  view: TView;
  size?: WidgetSize;
}

export interface GraphWidgetConfig extends BaseWidgetConfig<GraphViewDefinition> {
  kind: 'graph';
}

export interface CatalogueWidgetConfig extends BaseWidgetConfig<CatalogueViewDefinition> {
  kind: 'catalogue';
}

export interface MatrixWidgetConfig extends BaseWidgetConfig<MatrixViewDefinition> {
  kind: 'matrix';
}

export interface ChartWidgetConfig extends BaseWidgetConfig<ChartViewDefinition> {
  kind: 'chart';
}

export type CanvasWidget =
  | GraphWidgetConfig
  | CatalogueWidgetConfig
  | MatrixWidgetConfig
  | ChartWidgetConfig;

export interface WidgetSelection {
  widgetId: string;
  nodeIds: string[];
  edgeIds: string[];
}

export interface SelectionState {
  sourceWidgetId?: string;
  nodeIds: string[];
  edgeIds: string[];
}

export const EMPTY_SELECTION: SelectionState = {
  nodeIds: [],
  edgeIds: [],
};

export interface WidgetViewEvent {
  widgetId: string;
  view: GraphViewModel;
}

export interface WidgetErrorEvent {
  widgetId: string;
  message: string;
}
