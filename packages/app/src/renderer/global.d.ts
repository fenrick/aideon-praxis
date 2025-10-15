declare global {
  interface Window {
    aideon: {
      version: string;
      stateAt: (args: { asOf: string; scenario?: string; confidence?: number }) => Promise<{
        asOf: string;
        scenario: string | null;
        confidence: number | null;
        nodes: number;
        edges: number;
      }>;
    };
  }
  // In browsers, globalThis === window; provide typing for unicorn/prefer-global-this usage
  // so globalThis.aideon is recognized.
  var aideon: Window['aideon'];
}
