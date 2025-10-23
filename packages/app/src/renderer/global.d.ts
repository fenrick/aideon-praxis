export interface AideonApi {
  version: string;
  stateAt: (parameters: { asOf: string; scenario?: string; confidence?: number }) => Promise<{
    asOf: string;
    scenario: string | null;
    confidence: number | null;
    nodes: number;
    edges: number;
  }>;
  openSettings: () => Promise<void>;
  openAbout: () => Promise<void>;
  openStatus: () => Promise<void>;
}

declare global {
  interface Window {
    aideon: AideonApi;
    __TAURI__?: { invoke<T = unknown>(cmd: string, payload?: Record<string, unknown>): Promise<T> };
  }
  var aideon: AideonApi;
}
