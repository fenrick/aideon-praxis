export interface StateAtArguments {
  asOf: string;
  scenario?: string;
  confidence?: number;
}

export interface StateAtResult {
  asOf: string;
  scenario: string | null;
  confidence: number | null;
  nodes: number;
  edges: number;
}
