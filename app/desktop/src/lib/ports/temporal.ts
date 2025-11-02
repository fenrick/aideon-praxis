import { invoke } from '@tauri-apps/api/core';

import type {
  StateAtArguments,
  StateAtResult,
  TemporalCommitRequest,
  TemporalCommitResponse,
  TemporalCommitSummary,
  TemporalCreateBranchRequest,
  TemporalCreateBranchResponse,
  TemporalDiffRequest,
  TemporalDiffSnapshot,
} from '../types.js';

export interface TemporalPort {
  stateAt(parameters: StateAtArguments): Promise<StateAtResult>;
  listCommits(branch: string): Promise<TemporalCommitSummary[]>;
  diff(parameters: TemporalDiffRequest): Promise<TemporalDiffSnapshot>;
  commit(parameters: TemporalCommitRequest): Promise<TemporalCommitResponse>;
  createBranch(parameters: TemporalCreateBranchRequest): Promise<TemporalCreateBranchResponse>;
}

type InvokeFunction = <T>(command: string, arguments_?: Record<string, unknown>) => Promise<T>;

interface HostCommitResponse {
  id?: string;
  branch?: string;
  as_of?: string;
  asOf?: string;
  parent_id?: string;
  parentId?: string;
  message?: string;
}

interface ListCommitsResponse {
  commits?: HostCommitResponse[];
}

interface CommitResponsePayload {
  id?: string;
}

interface BranchResponsePayload {
  name?: string;
  head?: string | null;
}

const normaliseAsOf = (value: string): string => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toISOString();
};

const toCommitSummary = (
  commit: HostCommitResponse,
  fallbackBranch: string,
): TemporalCommitSummary => {
  const id = typeof commit.id === 'string' ? commit.id : '';
  const branch = typeof commit.branch === 'string' ? commit.branch : fallbackBranch;
  let rawAsOf: string | undefined;
  if (typeof commit.asOf === 'string') {
    rawAsOf = commit.asOf;
  } else if (typeof commit.as_of === 'string') {
    rawAsOf = commit.as_of;
  }
  if (!id || !rawAsOf) {
    throw new TypeError('Commit payload missing required fields');
  }
  let parentId: string | undefined;
  if (typeof commit.parentId === 'string') {
    parentId = commit.parentId;
  } else if (typeof commit.parent_id === 'string') {
    parentId = commit.parent_id;
  }
  const message = typeof commit.message === 'string' ? commit.message : undefined;
  return {
    id,
    branch,
    asOf: normaliseAsOf(rawAsOf),
    parentId,
    message,
  } satisfies TemporalCommitSummary;
};

export function createTemporalPort(call: InvokeFunction = invoke as InvokeFunction): TemporalPort {
  // To-do: extend port to support streaming payloads once the Rust layer emits chunked results.
  return {
    stateAt(parameters: StateAtArguments): Promise<StateAtResult> {
      const arguments_: Record<string, unknown> = {
        as_of: parameters.asOf,
        scenario: parameters.scenario ?? null,
        confidence: parameters.confidence ?? null,
      };
      return call<StateAtResult>('temporal_state_at', arguments_);
    },
    async listCommits(branch: string): Promise<TemporalCommitSummary[]> {
      const response = await call<ListCommitsResponse>('list_commits', { branch });
      const entries = Array.isArray(response.commits) ? response.commits : [];
      return entries.map((commit) => toCommitSummary(commit, branch));
    },
    diff(parameters: TemporalDiffRequest): Promise<TemporalDiffSnapshot> {
      const arguments_: Record<string, unknown> = {
        from: parameters.from,
        to: parameters.to,
      };
      if (parameters.scope !== undefined) {
        arguments_.scope = parameters.scope;
      }
      return call<TemporalDiffSnapshot>('temporal_diff', arguments_);
    },
    async commit(parameters: TemporalCommitRequest): Promise<TemporalCommitResponse> {
      const payload: Record<string, unknown> = {
        branch: parameters.branch,
        as_of: parameters.asOf,
        message: parameters.message ?? null,
        changes: {
          add_nodes: (parameters.addNodes ?? []).map((id) => ({ id })),
          remove_nodes: (parameters.removeNodes ?? []).map((id) => ({ id })),
          add_edges: parameters.addEdges ?? [],
          remove_edges: parameters.removeEdges ?? [],
        },
      };
      const response = await call<CommitResponsePayload>('commit_changes', payload);
      if (typeof response.id !== 'string' || !response.id) {
        throw new TypeError('Commit payload missing identifier');
      }
      return { id: response.id } satisfies TemporalCommitResponse;
    },
    async createBranch(
      parameters: TemporalCreateBranchRequest,
    ): Promise<TemporalCreateBranchResponse> {
      const response = await call<BranchResponsePayload>('create_branch', {
        name: parameters.name,
        from: parameters.from ?? null,
      });
      const name = typeof response.name === 'string' ? response.name : parameters.name;
      const head =
        typeof response.head === 'string' || response.head === null
          ? (response.head ?? null)
          : null;
      return {
        name,
        head,
      } satisfies TemporalCreateBranchResponse;
    },
  };
}

export const temporalPort: TemporalPort = createTemporalPort();
