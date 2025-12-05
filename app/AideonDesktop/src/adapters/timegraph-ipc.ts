import { invoke } from '@tauri-apps/api/core'

import type {
  MetaModelDocument,
  MetaModelProvider,
  MutableGraphAdapter,
  TemporalDiffParameters,
  TemporalDiffSnapshot,
  TemporalStateParameters,
  TemporalStateSnapshot,
  TemporalTopologyDeltaParameters,
  TemporalTopologyDeltaSnapshot,
} from './index'

interface StateAtResp {
  asOf: string
  scenario: string | null
  confidence: number | null
  nodes: number
  edges: number
}

interface CommitResp {
  id: string
}
interface CommitListItem {
  id: string
  branch: string
  parents: string[]
  author?: string
  time?: string
  message: string
  tags: string[]
  change_count: number
}
interface ListCommitsResp {
  commits: CommitListItem[]
}

interface ListBranchesResp {
  branches: BranchResponse[]
}

interface BranchResponse {
  name?: unknown
  head?: unknown
}

interface DiffSummaryResp {
  from: string
  to: string
  node_adds: number
  node_mods: number
  node_dels: number
  edge_adds: number
  edge_mods: number
  edge_dels: number
}

interface MergeResponsePayload {
  result?: unknown
  conflicts?: unknown
}

interface ConflictPayload {
  reference?: unknown
  kind?: unknown
  message?: unknown
}

interface TopologyDeltaResp {
  from?: unknown
  to?: unknown
  node_adds?: unknown
  node_dels?: unknown
  edge_adds?: unknown
  edge_dels?: unknown
}

type InvokeFunction = <T>(command: string, arguments_?: Record<string, unknown>) => Promise<T>

const call: InvokeFunction = (command, arguments_) => invoke(command, arguments_)
// To-do: introduce streaming support when temporal_diff grows beyond summary metrics.

/**
 * Tauri IPC-backed implementation of the temporal adapter. Bridges renderer calls
 * to the Rust host using typed invoke payloads.
 */
export class IpcTemporalAdapter implements MutableGraphAdapter, MetaModelProvider {
  /**
   * Fetch a time-sliced graph snapshot via the host.
   * @param {TemporalStateParameters} parameters temporal query
   * @returns {Promise<TemporalStateSnapshot>} snapshot metrics for the timestamp
   */
  async stateAt(parameters: TemporalStateParameters): Promise<TemporalStateSnapshot> {
    const payload: Record<string, unknown> = { asOf: parameters.asOf }
    if (parameters.scenario !== undefined) {
      payload.scenario = parameters.scenario
    }
    if (parameters.confidence !== undefined) {
      payload.confidence = parameters.confidence
    }
    const result = await call<StateAtResp>('temporal_state_at', { payload })
    return {
      asOf: result.asOf,
      scenario: result.scenario ?? undefined,
      confidence: result.confidence ?? undefined,
      nodes: result.nodes,
      edges: result.edges,
    }
  }

  /**
   * Retrieve summary diff metrics between two references.
   * @param {TemporalDiffParameters} parameters diff request
   * @returns {Promise<TemporalDiffSnapshot>} diff summary with node/edge counts
   */
  async diff(parameters: TemporalDiffParameters): Promise<TemporalDiffSnapshot> {
    const payload: Record<string, unknown> = {
      from: parameters.from,
      to: parameters.to,
    }
    if (parameters.scope !== undefined) {
      payload.scope = parameters.scope
    }
    const summary = await call<DiffSummaryResp>('temporal_diff', { payload })
    return {
      from: summary.from,
      to: summary.to,
      metrics: {
        nodeAdds: summary.node_adds,
        nodeMods: summary.node_mods,
        nodeDels: summary.node_dels,
        edgeAdds: summary.edge_adds,
        edgeMods: summary.edge_mods,
        edgeDels: summary.edge_dels,
      },
    }
  }

  /**
   * Create a commit on a branch via the host adapter.
   * @param {object} parameters commit payload
   * @param {string} parameters.branch branch name
   * @param {string} [parameters.parent] parent commit id
   * @param {string} [parameters.author] author display name
   * @param {string} parameters.message commit message
   * @param {string[]} [parameters.tags] tags to apply
   * @param {string} [parameters.time] ISO timestamp
   * @param {object} parameters.changes change set with node/edge operations
   * @param {string[]} [parameters.changes.nodeCreates] nodes to create
   * @param {string[]} [parameters.changes.nodeDeletes] nodes to delete
   * @param {{from: string, to: string}[]} [parameters.changes.edgeCreates] edges to create
   * @param {{from: string, to: string}[]} [parameters.changes.edgeDeletes] edges to delete
   * @returns {Promise<CommitResp>} created commit identifier
   */
  async commit(parameters: {
    branch: string
    parent?: string
    author?: string
    message: string
    tags?: string[]
    time?: string
    changes: {
      nodeCreates?: string[]
      nodeDeletes?: string[]
      edgeCreates?: { from: string, to: string }[]
      edgeDeletes?: { from: string, to: string }[]
    }
  }): Promise<CommitResp> {
    const changeSet: Record<string, unknown> = {}
    if (parameters.changes.nodeCreates?.length) {
      changeSet.nodeCreates = parameters.changes.nodeCreates.map(id => ({ id }))
    }
    if (parameters.changes.nodeDeletes?.length) {
      changeSet.nodeDeletes = parameters.changes.nodeDeletes.map(id => ({ id }))
    }
    if (parameters.changes.edgeCreates?.length) {
      changeSet.edgeCreates = parameters.changes.edgeCreates.map(edge => ({
        from: edge.from,
        to: edge.to,
      }))
    }
    if (parameters.changes.edgeDeletes?.length) {
      changeSet.edgeDeletes = parameters.changes.edgeDeletes.map(edge => ({
        from: edge.from,
        to: edge.to,
      }))
    }
    const payload = {
      payload: {
        branch: parameters.branch,
        ...(parameters.parent === undefined ? {} : { parent: parameters.parent }),
        ...(parameters.author === undefined ? {} : { author: parameters.author }),
        message: parameters.message,
        tags: parameters.tags ?? [],
        ...(parameters.time === undefined ? {} : { time: parameters.time }),
        changes: changeSet,
      },
    }
    const result = await call<CommitResp>('commit_changes', payload)
    return result
  }

  /**
   * List commits for a branch.
   * @param {object} parameters filter
   * @param {string} parameters.branch branch name
   * @returns {Promise<Array<CommitResp>>} commit list
   */
  async listCommits(parameters: { branch: string }): Promise<
    {
      id: string
      branch: string
      parents: string[]
      author?: string
      time?: string
      message: string
      tags: string[]
      changeCount: number
    }[]
  > {
    const result = await call<ListCommitsResp>('list_commits', { branch: parameters.branch })
    return result.commits.map(commit => ({
      id: commit.id,
      branch: commit.branch,
      parents: commit.parents,
      author: commit.author,
      time: commit.time,
      message: commit.message,
      tags: commit.tags,
      changeCount: commit.change_count,
    }))
  }

  /**
   * Create a branch anchored from an optional commit.
   * @param {object} parameters branch request
   * @param {string} parameters.name branch name
   * @param {string} [parameters.from] base commit id
   * @returns {Promise<{name: string, head?: string}>} created branch handle
   */
  async createBranch(parameters: {
    name: string
    from?: string
  }): Promise<{ name: string, head?: string }> {
    return call<{ name: string, head?: string }>('create_branch', {
      payload: {
        name: parameters.name,
        ...(parameters.from === undefined ? {} : { from: parameters.from }),
      },
    })
  }

  /**
   * Fetch available branches and their heads.
   * @returns {Promise<Array<{name: string, head?: string}>>} list of branches
   */
  async listBranches(): Promise<{ name: string, head?: string }[]> {
    const response = await call<ListBranchesResp>('list_branches')
    const entries = Array.isArray(response.branches) ? response.branches : []
    return entries.map(branch => ({
      name: typeof branch.name === 'string' ? branch.name : '',
      head: typeof branch.head === 'string' ? branch.head : undefined,
    }))
  }

  /**
   * Merge a source branch into a target branch.
   * @param {object} parameters merge request
   * @param {string} parameters.source source branch
   * @param {string} parameters.target target branch
   * @param {string} [parameters.strategy] merge strategy
   * @returns {Promise<{result?: string, conflicts?: Array<{reference: string, kind: string, message: string}>}>} merge outcome
   */
  async mergeBranches(parameters: { source: string, target: string, strategy?: string }): Promise<{
    result?: string
    conflicts?: { reference: string, kind: string, message: string }[]
  }> {
    const response = await call<MergeResponsePayload>('merge_branches', {
      payload: parameters,
    })
    const conflicts = Array.isArray(response.conflicts)
      ? (response.conflicts as ConflictPayload[])
          .map((conflict) => {
            const reference = typeof conflict.reference === 'string' ? conflict.reference : ''
            if (!reference) {
              return
            }
            return {
              reference,
              kind: typeof conflict.kind === 'string' ? conflict.kind : 'unknown',
              message:
                typeof conflict.message === 'string'
                  ? conflict.message
                  : 'Conflict requires manual resolution',
            }
          })
          .filter(
            (conflict): conflict is { reference: string, kind: string, message: string } =>
              conflict !== undefined,
          )
      : undefined
    return {
      result: typeof response.result === 'string' ? response.result : undefined,
      conflicts,
    }
  }

  /**
   * Retrieve topology delta summary between two references.
   * @param {TemporalTopologyDeltaParameters} parameters delta parameters
   * @returns {Promise<TemporalTopologyDeltaSnapshot>} topology delta summary
   */
  async topologyDelta(
    parameters: TemporalTopologyDeltaParameters,
  ): Promise<TemporalTopologyDeltaSnapshot> {
    const response = await call<TopologyDeltaResp>('topology_delta', {
      payload: parameters,
    })
    const from = typeof response.from === 'string' ? response.from : ''
    const to = typeof response.to === 'string' ? response.to : ''
    const metrics = {
      nodeAdds: typeof response.node_adds === 'number' ? response.node_adds : 0,
      nodeDels: typeof response.node_dels === 'number' ? response.node_dels : 0,
      edgeAdds: typeof response.edge_adds === 'number' ? response.edge_adds : 0,
      edgeDels: typeof response.edge_dels === 'number' ? response.edge_dels : 0,
    }
    return {
      from,
      to,
      metrics,
    }
  }

  /**
   * Load the meta-model document from the host.
   * @returns {Promise<MetaModelDocument>} meta-model document
   */
  async getMetaModel(): Promise<MetaModelDocument> {
    return call<MetaModelDocument>('temporal_metamodel_get')
  }
}
