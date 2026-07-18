export interface GraphLayoutNode {
  readonly id: string;
  readonly x: number;
  readonly y: number;
}

export interface GraphLayoutSnapshot {
  readonly docId: string;
  readonly widgetId: string;
  readonly nodes: GraphLayoutNode[];
}

export interface GraphLayoutGetRequest {
  readonly docId: string;
  readonly widgetId: string;
}
