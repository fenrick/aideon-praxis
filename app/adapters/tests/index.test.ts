import { describe, expectTypeOf, it } from 'vitest';
import type {
  GraphAdapter,
  TemporalDiffParameters,
  TemporalDiffSnapshot,
  TemporalStateParameters,
  TemporalStateSnapshot,
  WorkerJobRequest,
  WorkerJobResult,
} from '../src';

describe('adapter contracts', () => {
  it('enforces GraphAdapter stateAt contract', async () => {
    const adapter: GraphAdapter = {
      async stateAt(parameters) {
        expectTypeOf(parameters).toEqualTypeOf<TemporalStateParameters>();
        const snapshot: TemporalStateSnapshot = {
          asOf: parameters.asOf,
          scenario: parameters.scenario,
          confidence: parameters.confidence,
          metrics: { nodeCount: 0, edgeCount: 0 },
        };
        return snapshot;
      },
      async diff(parameters) {
        expectTypeOf(parameters).toEqualTypeOf<TemporalDiffParameters>();
        const diff: TemporalDiffSnapshot = {
          from: parameters.from,
          to: parameters.to,
          metrics: { nodesAdded: 0, nodesRemoved: 0, edgesAdded: 0, edgesRemoved: 0 },
        };
        return diff;
      },
    };

    const result = await adapter.stateAt({ asOf: '2024-01-01T00:00:00.000Z' });
    expectTypeOf(result).toEqualTypeOf<TemporalStateSnapshot>();
  });

  it('maps Worker job payloads to results', () => {
    type DiffJob = Extract<WorkerJobRequest, { type: 'Temporal.Diff' }>;
    const diffPayload: DiffJob['payload'] = {
      from: '2025-03-01T00:00:00.000Z',
      to: '2025-04-01T00:00:00.000Z',
    };
    expectTypeOf(diffPayload).toEqualTypeOf<TemporalDiffParameters>();

    type DiffJobResult = WorkerJobResult<DiffJob>;
    expectTypeOf<DiffJobResult>().toEqualTypeOf<TemporalDiffSnapshot>();

    type ShortestPathJob = Extract<WorkerJobRequest, { type: 'Analytics.ShortestPath' }>;
    const payload: ShortestPathJob['payload'] = { from: 'node-a', to: 'node-b', maxHops: 6 };
    expectTypeOf(payload.maxHops).toEqualTypeOf<number>();
    type ShortestPathResult = WorkerJobResult<ShortestPathJob>;
    expectTypeOf<ShortestPathResult>().toEqualTypeOf<{ path: string[]; hopCount: number }>();
  });
});
