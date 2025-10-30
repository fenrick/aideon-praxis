import type { GraphAdapter } from './index';

/**
 * In-memory dev adapter implementing minimal time semantics for the UI.
 * Not for production use; intended for local demos and tests.
 */
export class DevelopmentMemoryGraph implements GraphAdapter {
  private snapshots = new Map<string, { nodes: number; edges: number }>();

  put(asOf: string, nodes: number, edges: number) {
    this.snapshots.set(asOf, { nodes, edges });
  }

  async stateAt(parameters: {
    asOf: string;
  }): Promise<{ asOf: string; nodes: number; edges: number }> {
    const snap = this.snapshots.get(parameters.asOf) ?? { nodes: 0, edges: 0 };
    // Simulate async path
    return new Promise((resolve) =>
      setTimeout(() => {
        resolve({ asOf: parameters.asOf, nodes: snap.nodes, edges: snap.edges });
      }, 0),
    );
  }

  async diff(parameters: {
    from: string;
    to: string;
  }): Promise<{ added: number; removed: number }> {
    const a = this.snapshots.get(parameters.from) ?? { nodes: 0, edges: 0 };
    const b = this.snapshots.get(parameters.to) ?? { nodes: 0, edges: 0 };
    return new Promise((resolve) =>
      setTimeout(() => {
        resolve({
          added: Math.max(0, b.nodes - a.nodes),
          removed: Math.max(0, a.nodes - b.nodes),
        });
      }, 0),
    );
  }
}
