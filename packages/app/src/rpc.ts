export interface StateAtResult {
  asOf: string;
  scenario: string | null;
  confidence: number | null;
  nodes: number;
  edges: number;
}

interface JsonRpcSuccess<T> {
  jsonrpc: '2.0';
  id: number | string | null;
  result: T;
}

interface JsonRpcError {
  jsonrpc: '2.0';
  id: number | string | null;
  error: { code: number; message: string; data?: unknown };
}

export type ParsedStateAt =
  | { kind: 'success'; result: StateAtResult }
  | { kind: 'error'; message: string }
  | { kind: 'other' };

const isJsonRpcEnvelope = (x: unknown): x is { jsonrpc: string } =>
  typeof x === 'object' && x !== null && 'jsonrpc' in (x as Record<string, unknown>);

const isJsonRpcSuccess = <T>(x: unknown): x is JsonRpcSuccess<T> => {
  if (!isJsonRpcEnvelope(x)) return false;
  const o = x as Record<string, unknown>;
  return o.jsonrpc === '2.0' && 'result' in o;
};

const isJsonRpcError = (x: unknown): x is JsonRpcError => {
  if (!isJsonRpcEnvelope(x)) return false;
  const o = x as Record<string, unknown>;
  return o.jsonrpc === '2.0' && 'error' in o;
};

export function parseJsonRpcStateAt(raw: string): ParsedStateAt {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw) as unknown;
  } catch {
    return { kind: 'other' };
  }
  if (isJsonRpcSuccess<StateAtResult>(parsed)) return { kind: 'success', result: parsed.result };
  if (isJsonRpcError(parsed)) return { kind: 'error', message: parsed.error.message };
  return { kind: 'other' };
}
