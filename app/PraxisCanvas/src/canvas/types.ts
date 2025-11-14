import type { GraphViewDefinition, GraphViewModel } from '@/praxis-api';

export type WidgetKind = 'graph';

export interface GraphWidgetConfig {
  id: string;
  kind: 'graph';
  title: string;
  view: GraphViewDefinition;
}

export type CanvasWidget = GraphWidgetConfig;

export interface WidgetSelection {
  widgetId: string;
  nodeIds: string[];
  edgeIds: string[];
}

export interface WidgetViewEvent {
  widgetId: string;
  view: GraphViewModel;
}

export interface WidgetErrorEvent {
  widgetId: string;
  message: string;
}
