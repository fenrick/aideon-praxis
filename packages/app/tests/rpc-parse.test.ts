/* @vitest-environment node */
import { describe, it, expect } from 'vitest';
import { parseJsonRpcStateAt } from '../src/rpc';

describe('parseJsonRpcStateAt', () => {
  it('parses success envelope', () => {
    const raw = JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      result: { asOf: '2025-01-01', scenario: null, confidence: null, nodes: 0, edges: 0 },
    });
    const parsed = parseJsonRpcStateAt(raw);
    expect(parsed.kind).toBe('success');
    if (parsed.kind === 'success') {
      expect(parsed.result.asOf).toBe('2025-01-01');
    }
  });

  it('parses error envelope', () => {
    const raw = JSON.stringify({
      jsonrpc: '2.0',
      id: 2,
      error: { code: -32_000, message: 'oops' },
    });
    const parsed = parseJsonRpcStateAt(raw);
    expect(parsed.kind).toBe('error');
    if (parsed.kind === 'error') expect(parsed.message).toBe('oops');
  });

  it('returns other for non JSON-RPC', () => {
    const parsed = parseJsonRpcStateAt('{"hello":"world"}');
    expect(parsed.kind).toBe('other');
  });

  it('returns other for invalid JSON', () => {
    const parsed = parseJsonRpcStateAt('not-json');
    expect(parsed.kind).toBe('other');
  });
});
