import { ensureIsoDateTime } from './contracts';
import type {
  GraphAdapter,
  GraphSnapshotMetrics,
  IsoDateTime,
  TemporalDiffParameters,
  TemporalDiffSnapshot,
  TemporalStateParameters,
  TemporalStateSnapshot,
} from './index';

/**
 * In-memory dev adapter implementing minimal time semantics for the UI.
 * Not for production use; intended for local demos and tests.
 */
export class DevelopmentMemoryGraph implements GraphAdapter {
  private snapshots = new Map<IsoDateTime, GraphSnapshotMetrics>();

  /**
   * Seeds the in-memory store with metric counts for a timestamp. This helper
   * keeps the class convenient to use in tests and Storybook scenarios.
   */
  put(asOf: string | Date, nodes: number, edges: number) {
    const iso = ensureIsoDateTime(typeof asOf === 'string' ? asOf : asOf.toISOString());
    this.snapshots.set(iso, { nodeCount: nodes, edgeCount: edges });
  }

  async stateAt(parameters: TemporalStateParameters): Promise<TemporalStateSnapshot> {
    const metrics: GraphSnapshotMetrics = this.snapshots.get(parameters.asOf) ?? {
      nodeCount: 0,
      edgeCount: 0,
    };
    // Simulate async behaviour and ensure we never leak the stored reference.
    return new Promise((resolve) =>
      setTimeout(() => {
        resolve({
          asOf: parameters.asOf,
          scenario: parameters.scenario,
          confidence: parameters.confidence,
          metrics: { ...metrics },
        });
      }, 0),
    );
  }

  async diff(parameters: TemporalDiffParameters): Promise<TemporalDiffSnapshot> {
    const a: GraphSnapshotMetrics = this.lookupMetrics(parameters.from) ?? {
      nodeCount: 0,
      edgeCount: 0,
    };
    const b: GraphSnapshotMetrics = this.lookupMetrics(parameters.to) ?? {
      nodeCount: 0,
      edgeCount: 0,
    };
    return new Promise((resolve) =>
      setTimeout(() => {
        resolve({
          from: parameters.from,
          to: parameters.to,
          metrics: {
            nodesAdded: Math.max(0, b.nodeCount - a.nodeCount),
            nodesRemoved: Math.max(0, a.nodeCount - b.nodeCount),
            edgesAdded: Math.max(0, b.edgeCount - a.edgeCount),
            edgesRemoved: Math.max(0, a.edgeCount - b.edgeCount),
          },
        });
      }, 0),
    );
  }

  private lookupMetrics(reference: string): GraphSnapshotMetrics | undefined {
    try {
      const iso = ensureIsoDateTime(reference);
      return this.snapshots.get(iso);
    } catch {
      return undefined;
    }
  }
}
