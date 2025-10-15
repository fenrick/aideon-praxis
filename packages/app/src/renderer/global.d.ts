interface AideonApi {
  version: string;
  stateAt: (parameters: { asOf: string; scenario?: string; confidence?: number }) => Promise<{
    asOf: string;
    scenario: string | null;
    confidence: number | null;
    nodes: number;
    edges: number;
  }>;
}

declare global {
  interface Window {
    aideon: AideonApi;
  }
  var aideon: AideonApi;
}
