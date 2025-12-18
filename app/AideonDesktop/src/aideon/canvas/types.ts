export type WidgetSize = 'full' | 'half';

export interface CanvasWidgetLayout {
  id: string;
  size?: WidgetSize;
}

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
