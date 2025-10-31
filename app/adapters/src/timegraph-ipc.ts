import { ensureIsoDateTime } from './contracts';
import type {
  GraphSnapshotMetrics,
  MutableGraphAdapter,
  TemporalDiffParameters,
  TemporalDiffSnapshot,
  TemporalStateParameters,
  TemporalStateSnapshot,
} from './index';

interface StateAtResp {
  asOf: string;
  scenario: string | null;
  confidence: number | null;
  nodes: number;
  edges: number;
}

interface CommitResp {
  id: string;
}
interface CommitListItem {
  id: string;
  branch: string;
  asOf: string;
  parentId?: string;
  message?: string;
}
interface ListCommitsResp {
  commits: CommitListItem[];
}

interface DiffSummaryResp {
  from: string;
  to: string;
  nodesAdded: number;
  nodesRemoved: number;
  edgesAdded: number;
  edgesRemoved: number;
}

async function safeInvoke<T>(command: string, arguments_?: Record<string, unknown>): Promise<T> {
  const module_ = (await import('@tauri-apps/api/core')) as {
    invoke: (c: string, a?: Record<string, unknown>) => Promise<T>;
  };
  return arguments_ ? module_.invoke(command, arguments_) : module_.invoke(command);
}

export class IpcTemporalAdapter implements MutableGraphAdapter {
  async stateAt(parameters: TemporalStateParameters): Promise<TemporalStateSnapshot> {
    const result = await safeInvoke<StateAtResp>('temporal_state_at', {
      asOf: parameters.asOf,
      scenario: parameters.scenario ?? null,
      confidence: parameters.confidence ?? null,
    });
    const metrics: GraphSnapshotMetrics = {
      nodeCount: result.nodes,
      edgeCount: result.edges,
    };
    return {
      asOf: ensureIsoDateTime(result.asOf),
      scenario: result.scenario ?? undefined,
      confidence: result.confidence ?? undefined,
      metrics,
    };
  }
  async diff(parameters: TemporalDiffParameters): Promise<TemporalDiffSnapshot> {
    const arguments_: Record<string, unknown> = {
      from: parameters.from,
      to: parameters.to,
    };
    if (parameters.scope !== undefined) {
      arguments_.scope = parameters.scope;
    }
    const summary = await safeInvoke<DiffSummaryResp>('temporal_diff', arguments_);
    return {
      from: summary.from,
      to: summary.to,
      metrics: {
        nodesAdded: summary.nodesAdded,
        nodesRemoved: summary.nodesRemoved,
        edgesAdded: summary.edgesAdded,
        edgesRemoved: summary.edgesRemoved,
      },
    };
  }
  async commit(parameters: {
    branch: string;
    asOf: string;
    message?: string;
    addNodes?: string[];
    removeNodes?: string[];
    addEdges?: { source: string; target: string }[];
    removeEdges?: { source: string; target: string }[];
  }): Promise<CommitResp> {
    const payload = {
      branch: parameters.branch,
      asOf: parameters.asOf,
      message: parameters.message,
      changes: {
        addNodes: (parameters.addNodes ?? []).map((id) => ({ id })),
        removeNodes: (parameters.removeNodes ?? []).map((id) => ({ id })),
        addEdges: parameters.addEdges ?? [],
        removeEdges: parameters.removeEdges ?? [],
      },
    };
    const result = await safeInvoke<CommitResp>(
      'commit_changes',
      payload as Record<string, unknown>,
    );
    return result;
  }
  async listCommits(parameters: { branch: string }): Promise<CommitListItem[]> {
    const result = await safeInvoke<ListCommitsResp>('list_commits', { branch: parameters.branch });
    return result.commits;
  }
  async createBranch(parameters: { name: string; from?: string }): Promise<void> {
    await safeInvoke('create_branch', { name: parameters.name, from: parameters.from ?? null });
  }
}
