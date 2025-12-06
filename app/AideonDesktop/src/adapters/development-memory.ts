import type {
  GraphAdapter,
  GraphSnapshotMetrics,
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
  private snapshots = new Map<string, GraphSnapshotMetrics>();

  /**
   * Seeds the in-memory store with metric counts for a timestamp. This helper
   * keeps the class convenient to use in tests and Storybook scenarios.
   * @param {string | Date} asOf ISO 8601 string or Date used as the snapshot key
   * @param {number} nodes number of nodes captured at the timestamp
   * @param {number} edges number of edges captured at the timestamp
   */
  put(asOf: string | Date, nodes: number, edges: number) {
    const key = typeof asOf === 'string' ? asOf : asOf.toISOString();
    this.snapshots.set(key, { nodeCount: nodes, edgeCount: edges });
  }

  /**
   * Returns the snapshot metrics that were previously stored for a point in time.
   * @param {TemporalStateParameters} parameters temporal query including asOf, scenario and confidence
   * @returns {Promise<TemporalStateSnapshot>} temporal state snapshot with node/edge counts for the timestamp
   */
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
          nodes: metrics.nodeCount,
          edges: metrics.edgeCount,
        });
      }, 0),
    );
  }

  /**
   * Computes a minimal diff by comparing stored node and edge counts.
   * @param {TemporalDiffParameters} parameters diff request containing from/to references
   * @returns {Promise<TemporalDiffSnapshot>} diff metrics reflecting node/edge additions and deletions
   */
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
            nodeAdds: Math.max(0, b.nodeCount - a.nodeCount),
            nodeMods: 0,
            nodeDels: Math.max(0, a.nodeCount - b.nodeCount),
            edgeAdds: Math.max(0, b.edgeCount - a.edgeCount),
            edgeMods: 0,
            edgeDels: Math.max(0, a.edgeCount - b.edgeCount),
          },
        });
      }, 0),
    );
  }

  private lookupMetrics(reference: string): GraphSnapshotMetrics | undefined {
    return this.snapshots.get(reference);
  }
}
