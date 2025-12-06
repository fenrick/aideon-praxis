import { describe, expectTypeOf, it } from 'vitest';

interface TemporalStateParameters {
  asOf: string;
  scenario?: string;
  confidence?: number;
}
interface TemporalStateSnapshot extends TemporalStateParameters {
  nodes: number;
  edges: number;
}

interface TemporalDiffParameters {
  from: string;
  to: string;
  scope?: string;
}
interface TemporalDiffMetrics {
  nodeAdds: number;
  nodeMods: number;
  nodeDels: number;
  edgeAdds: number;
  edgeMods: number;
  edgeDels: number;
}
interface TemporalDiffSnapshot {
  from: string;
  to: string;
  metrics: TemporalDiffMetrics;
}

interface GraphAdapter {
  stateAt(parameters: TemporalStateParameters): Promise<TemporalStateSnapshot>;
  diff(parameters: TemporalDiffParameters): Promise<TemporalDiffSnapshot>;
}

type WorkerJobRequest =
  | { type: 'Temporal.Diff'; payload: TemporalDiffParameters }
  | { type: 'Analytics.ShortestPath'; payload: { from: string; to: string; maxHops: number } };

type WorkerJobResult<Job extends WorkerJobRequest> = Job['type'] extends 'Temporal.Diff'
  ? TemporalDiffSnapshot
  : { path: string[]; hopCount: number };

describe('adapter contracts', () => {
  it('enforces GraphAdapter stateAt contract', async () => {
    const adapter: GraphAdapter = {
      stateAt(parameters: TemporalStateParameters): Promise<TemporalStateSnapshot> {
        expectTypeOf(parameters).toEqualTypeOf<TemporalStateParameters>();
        return Promise.resolve({
          asOf: parameters.asOf,
          scenario: parameters.scenario,
          confidence: parameters.confidence,
          nodes: 0,
          edges: 0,
        });
      },
      diff(parameters: TemporalDiffParameters): Promise<TemporalDiffSnapshot> {
        expectTypeOf(parameters).toEqualTypeOf<TemporalDiffParameters>();
        return Promise.resolve({
          from: parameters.from,
          to: parameters.to,
          metrics: {
            nodeAdds: 0,
            nodeMods: 0,
            nodeDels: 0,
            edgeAdds: 0,
            edgeMods: 0,
            edgeDels: 0,
          },
        });
      },
    };

    const result = await adapter.stateAt({ asOf: 'c1' });
    expectTypeOf(result).toEqualTypeOf<TemporalStateSnapshot>();
  });

  it('maps Worker job payloads to results', () => {
    type DiffJob = Extract<WorkerJobRequest, { type: 'Temporal.Diff' }>;
    const diffPayload: DiffJob['payload'] = {
      from: 'c1',
      to: 'c2',
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
