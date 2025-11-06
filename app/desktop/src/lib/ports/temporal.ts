import { invoke } from '@tauri-apps/api/core';

import type {
  EdgeTombstone,
  EdgeVersion,
  NodeTombstone,
  NodeVersion,
  StateAtArguments,
  StateAtResult,
  TemporalBranchSummary,
  TemporalChangeSet,
  TemporalCommitRequest,
  TemporalCommitResponse,
  TemporalCommitSummary,
  TemporalCreateBranchRequest,
  TemporalCreateBranchResponse,
  TemporalDiffMetrics,
  TemporalDiffRequest,
  TemporalDiffSnapshot,
  TemporalMergeConflict,
  TemporalMergeRequest,
  TemporalMergeResult,
  TemporalTopologyDeltaMetrics,
  TemporalTopologyDeltaRequest,
  TemporalTopologyDeltaSnapshot,
} from '../types.js';

export interface TemporalPort {
  stateAt(parameters: StateAtArguments): Promise<StateAtResult>;
  listCommits(branch: string): Promise<TemporalCommitSummary[]>;
  listBranches(): Promise<TemporalBranchSummary[]>;
  diff(parameters: TemporalDiffRequest): Promise<TemporalDiffSnapshot>;
  topologyDelta(parameters: TemporalTopologyDeltaRequest): Promise<TemporalTopologyDeltaSnapshot>;
  commit(parameters: TemporalCommitRequest): Promise<TemporalCommitResponse>;
  createBranch(parameters: TemporalCreateBranchRequest): Promise<TemporalCreateBranchResponse>;
  merge(parameters: TemporalMergeRequest): Promise<TemporalMergeResult>;
}

type InvokeFunction = <T>(command: string, arguments_?: Record<string, unknown>) => Promise<T>;

interface HostCommitResponse {
  id?: unknown;
  parents?: unknown;
  branch?: unknown;
  author?: unknown;
  time?: unknown;
  message?: unknown;
  tags?: unknown;
  change_count?: unknown;
}

interface ListCommitsResponse {
  commits?: HostCommitResponse[];
}

interface DiffResponsePayload {
  from?: unknown;
  to?: unknown;
  node_adds?: unknown;
  node_mods?: unknown;
  node_dels?: unknown;
  edge_adds?: unknown;
  edge_mods?: unknown;
  edge_dels?: unknown;
}

interface TopologyDeltaResponsePayload {
  from?: unknown;
  to?: unknown;
  node_adds?: unknown;
  node_dels?: unknown;
  edge_adds?: unknown;
  edge_dels?: unknown;
}

interface CommitResponsePayload {
  id?: unknown;
}

interface BranchResponsePayload {
  name?: unknown;
  head?: unknown;
}

interface ListBranchesPayload {
  branches?: BranchResponsePayload[];
}

interface MergeResponsePayload {
  result?: unknown;
  conflicts?: unknown;
}

interface ConflictPayload {
  reference?: unknown;
  kind?: unknown;
  message?: unknown;
}

interface HostErrorPayload {
  code?: unknown;
  message?: unknown;
}

const toStringArray = (input: unknown): string[] =>
  Array.isArray(input) ? input.filter((value): value is string => typeof value === 'string') : [];

const parseNumber = (value: unknown): number => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string') {
    const parsed = Number.parseInt(value, 10);
    return Number.isNaN(parsed) ? 0 : parsed;
  }
  return 0;
};

const toCommitSummary = (
  payload: HostCommitResponse,
  fallbackBranch: string,
): TemporalCommitSummary => {
  const id = typeof payload.id === 'string' ? payload.id : '';
  const parents = toStringArray(payload.parents);
  const branch = typeof payload.branch === 'string' ? payload.branch : fallbackBranch;
  const author = typeof payload.author === 'string' ? payload.author : undefined;
  const time = typeof payload.time === 'string' ? payload.time : undefined;
  const message = typeof payload.message === 'string' ? payload.message : '';
  const tags = toStringArray(payload.tags);
  if (!id) {
    throw new TypeError('Commit payload missing identifier');
  }
  return {
    id,
    parents,
    branch,
    author,
    time,
    message,
    tags,
    changeCount: parseNumber(payload.change_count),
  } satisfies TemporalCommitSummary;
};

const serialiseNodeVersion = (node: NodeVersion): Record<string, unknown> => {
  const serialised: Record<string, unknown> = { id: node.id };
  if (node.type !== undefined) {
    serialised.type = node.type;
  }
  if (node.props !== undefined) {
    serialised.props = node.props;
  }
  return serialised;
};

const serialiseNodeTombstone = (node: NodeTombstone): Record<string, unknown> => ({
  id: node.id,
});

const serialiseEdgeVersion = (edge: EdgeVersion): Record<string, unknown> => {
  const serialised: Record<string, unknown> = {
    from: edge.from,
    to: edge.to,
  };
  if (edge.id !== undefined) {
    serialised.id = edge.id;
  }
  if (edge.type !== undefined) {
    serialised.type = edge.type;
  }
  if (edge.directed !== undefined) {
    serialised.directed = edge.directed;
  }
  if (edge.props !== undefined) {
    serialised.props = edge.props;
  }
  return serialised;
};

const serialiseEdgeTombstone = (edge: EdgeTombstone): Record<string, unknown> => ({
  from: edge.from,
  to: edge.to,
});

const serialiseChangeSet = (changes: TemporalChangeSet | undefined): Record<string, unknown> => {
  const payload: Record<string, unknown> = {};
  if (!changes) {
    return payload;
  }
  if (changes.nodeCreates?.length) {
    payload.nodeCreates = changes.nodeCreates.map((node) => serialiseNodeVersion(node));
  }
  if (changes.nodeUpdates?.length) {
    payload.nodeUpdates = changes.nodeUpdates.map((node) => serialiseNodeVersion(node));
  }
  if (changes.nodeDeletes?.length) {
    payload.nodeDeletes = changes.nodeDeletes.map((node) => serialiseNodeTombstone(node));
  }
  if (changes.edgeCreates?.length) {
    payload.edgeCreates = changes.edgeCreates.map((edge) => serialiseEdgeVersion(edge));
  }
  if (changes.edgeUpdates?.length) {
    payload.edgeUpdates = changes.edgeUpdates.map((edge) => serialiseEdgeVersion(edge));
  }
  if (changes.edgeDeletes?.length) {
    payload.edgeDeletes = changes.edgeDeletes.map((edge) => serialiseEdgeTombstone(edge));
  }
  return payload;
};

const toDiffMetrics = (payload: DiffResponsePayload): TemporalDiffMetrics => ({
  nodeAdds: parseNumber(payload.node_adds),
  nodeMods: parseNumber(payload.node_mods),
  nodeDels: parseNumber(payload.node_dels),
  edgeAdds: parseNumber(payload.edge_adds),
  edgeMods: parseNumber(payload.edge_mods),
  edgeDels: parseNumber(payload.edge_dels),
});

const toBranchSummary = (payload: BranchResponsePayload): TemporalBranchSummary => ({
  name: typeof payload.name === 'string' ? payload.name : '',
  head: typeof payload.head === 'string' ? payload.head : null,
});

const toTopologyDeltaMetrics = (
  payload: TopologyDeltaResponsePayload,
): TemporalTopologyDeltaMetrics => ({
  nodeAdds: parseNumber(payload.node_adds),
  nodeDels: parseNumber(payload.node_dels),
  edgeAdds: parseNumber(payload.edge_adds),
  edgeDels: parseNumber(payload.edge_dels),
});

const toConflicts = (value: unknown): TemporalMergeConflict[] | undefined => {
  if (!Array.isArray(value)) {
    return undefined;
  }
  return value
    .map((item): TemporalMergeConflict | null => {
      const conflict = item as ConflictPayload;
      const reference = typeof conflict.reference === 'string' ? conflict.reference : '';
      const kind = typeof conflict.kind === 'string' ? conflict.kind : 'unknown';
      const message = typeof conflict.message === 'string' ? conflict.message : 'conflict detected';
      if (!reference) {
        return null;
      }
      return { reference, kind, message };
    })
    .filter((conflict): conflict is TemporalMergeConflict => conflict !== null);
};

const toHostError = (error: unknown): Error => {
  if (typeof error === 'object' && error && 'code' in error && 'message' in error) {
    const payload = error as HostErrorPayload;
    const code = typeof payload.code === 'string' ? payload.code : 'unknown_error';
    const message = typeof payload.message === 'string' ? payload.message : 'Unknown error';
    return new Error(`${code}: ${message}`);
  }
  if (error instanceof Error) {
    return error;
  }
  return new Error(String(error));
};

export function createTemporalPort(call: InvokeFunction = invoke as InvokeFunction): TemporalPort {
  // To-do: extend port to support streaming payloads once the Rust layer emits chunked results.
  return {
    async stateAt(parameters: StateAtArguments): Promise<StateAtResult> {
      const payload: Record<string, unknown> = {
        asOf: parameters.asOf,
      };
      if (parameters.scenario !== undefined) {
        payload.scenario = parameters.scenario;
      }
      if (parameters.confidence !== undefined) {
        payload.confidence = parameters.confidence;
      }
      try {
        return await call<StateAtResult>('temporal_state_at', { payload });
      } catch (error) {
        throw toHostError(error);
      }
    },
    async listCommits(branch: string): Promise<TemporalCommitSummary[]> {
      try {
        const response = await call<ListCommitsResponse>('list_commits', { branch });
        const entries = Array.isArray(response.commits) ? response.commits : [];
        return entries.map((commit) => toCommitSummary(commit, branch));
      } catch (error) {
        throw toHostError(error);
      }
    },
    async listBranches(): Promise<TemporalBranchSummary[]> {
      try {
        const response = await call<ListBranchesPayload>('list_branches');
        const entries = Array.isArray(response.branches) ? response.branches : [];
        return entries.map((branch) => toBranchSummary(branch));
      } catch (error) {
        throw toHostError(error);
      }
    },
    async diff(parameters: TemporalDiffRequest): Promise<TemporalDiffSnapshot> {
      const payload: Record<string, unknown> = {
        from: parameters.from,
        to: parameters.to,
      };
      if (parameters.scope !== undefined) {
        payload.scope = parameters.scope;
      }
      try {
        const response = await call<DiffResponsePayload>('temporal_diff', { payload });
        if (typeof response.from !== 'string' || typeof response.to !== 'string') {
          throw new TypeError('Diff response missing commit identifiers');
        }
        return {
          from: response.from,
          to: response.to,
          metrics: toDiffMetrics(response),
        } satisfies TemporalDiffSnapshot;
      } catch (error) {
        throw toHostError(error);
      }
    },
    async topologyDelta(
      parameters: TemporalTopologyDeltaRequest,
    ): Promise<TemporalTopologyDeltaSnapshot> {
      const payload: Record<string, unknown> = {
        from: parameters.from,
        to: parameters.to,
      };
      try {
        const response = await call<TopologyDeltaResponsePayload>('topology_delta', { payload });
        if (typeof response.from !== 'string' || typeof response.to !== 'string') {
          throw new TypeError('Topology delta response missing commit identifiers');
        }
        return {
          from: response.from,
          to: response.to,
          metrics: toTopologyDeltaMetrics(response),
        } satisfies TemporalTopologyDeltaSnapshot;
      } catch (error) {
        throw toHostError(error);
      }
    },
    async commit(parameters: TemporalCommitRequest): Promise<TemporalCommitResponse> {
      const payload = {
        payload: {
          branch: parameters.branch,
          parent: parameters.parent ?? null,
          author: parameters.author ?? null,
          time: parameters.time ?? null,
          message: parameters.message,
          tags: parameters.tags ?? [],
          changes: serialiseChangeSet(parameters.changes),
        },
      } satisfies Record<string, unknown>;
      try {
        const response = await call<CommitResponsePayload>('commit_changes', payload);
        if (typeof response.id !== 'string' || !response.id) {
          throw new TypeError('Commit response missing identifier');
        }
        return { id: response.id } satisfies TemporalCommitResponse;
      } catch (error) {
        throw toHostError(error);
      }
    },
    async createBranch(
      parameters: TemporalCreateBranchRequest,
    ): Promise<TemporalCreateBranchResponse> {
      try {
        const response = await call<BranchResponsePayload>('create_branch', {
          payload: {
            name: parameters.name,
            from: parameters.from ?? null,
          },
        });
        const name = typeof response.name === 'string' ? response.name : parameters.name;
        const head = typeof response.head === 'string' ? response.head : null;
        return {
          name,
          head,
        } satisfies TemporalCreateBranchResponse;
      } catch (error) {
        throw toHostError(error);
      }
    },
    async merge(parameters: TemporalMergeRequest): Promise<TemporalMergeResult> {
      try {
        const response = await call<MergeResponsePayload>('merge_branches', {
          payload: parameters,
        });
        const conflicts = toConflicts(response.conflicts);
        return {
          result: typeof response.result === 'string' ? response.result : undefined,
          conflicts,
        } satisfies TemporalMergeResult;
      } catch (error) {
        throw toHostError(error);
      }
    },
  };
}

export const temporalPort: TemporalPort = createTemporalPort();
