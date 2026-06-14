import type {
  CanvasLayoutGetRequest,
  CanvasLayoutSnapshot,
  GraphLayoutGetRequest,
  GraphLayoutSnapshot,
  Layer,
  MetaModelDocument,
  TemporalDiffParameters,
  TemporalDiffSnapshot,
  TemporalStateParameters,
  TemporalStateSnapshot,
  WorkerHealth,
} from '../../dtos';

import { invokeIpc } from '../../adapters/ipc';

import { toErrorMessage } from './lib/errors';

const COMMANDS = {
  workerHealth: 'system_worker_health',
  graphView: 'praxis_artefact_execute_graph',
  catalogueView: 'praxis_artefact_execute_catalogue',
  matrixView: 'praxis_artefact_execute_matrix',
  chartView: 'praxis_artefact_execute_chart',
  metaModel: 'praxis_metamodel_get',
  canvasGetLayout: 'praxis_canvas_get_layout',
  canvasSaveLayout: 'praxis_canvas_save_layout',
  graphLayoutGet: 'praxis_graph_layout_get',
  graphLayoutSave: 'praxis_graph_layout_save',
  listBranches: 'chrona_temporal_list_branches',
  listCommits: 'chrona_temporal_list_commits',
  stateAt: 'chrona_temporal_state_at',
  diffSummary: 'chrona_temporal_diff',
  mergeBranches: 'chrona_temporal_merge_branches',
  applyOperations: 'praxis_task_apply_operations',
  listScenarios: 'praxis_scenario_list',
} as const;

export const PRAXIS_IPC_COMMANDS = COMMANDS;

export interface TwinNode {
  id: string;
  type?: string;
  props?: Record<string, unknown>;
}

export interface TwinEdge {
  id?: string;
  from: string;
  to: string;
  type?: string;
  directed?: boolean;
  props?: Record<string, unknown>;
}

export interface ViewFilters {
  nodeTypes?: string[];
  edgeTypes?: string[];
  tags?: string[];
  search?: string;
}

interface ViewDefinitionBase {
  id: string;
  name: string;
  kind: string;
  asOf: string;
  scenario?: string;
  confidence?: number;
  layer?: Layer;
  filters?: ViewFilters;
}

export interface GraphViewDefinition extends ViewDefinitionBase {
  kind: 'graph';
  layout?: 'force' | 'hierarchy';
  scope?: {
    rootIds?: string[];
  };
}

export interface CatalogueColumn {
  id: string;
  label: string;
  type: 'string' | 'number' | 'boolean';
}

export interface CatalogueViewDefinition extends ViewDefinitionBase {
  kind: 'catalogue';
  columns: CatalogueColumn[];
  limit?: number;
}

export interface MatrixViewDefinition extends ViewDefinitionBase {
  kind: 'matrix';
  rowType: string;
  columnType: string;
  relationship?: string;
}

export type ChartType = 'kpi' | 'line' | 'bar';

export interface ChartViewDefinition extends ViewDefinitionBase {
  kind: 'chart';
  chartType: ChartType;
  measure: string;
  dimension?: string;
}

export interface ViewMetadata {
  id: string;
  name: string;
  asOf: string;
  scenario?: string;
  layer?: Layer;
  fetchedAt: string;
  source: 'host';
}

export interface ViewStats {
  nodes: number;
  edges: number;
}

export interface GraphNodeView extends TwinNode {
  label: string;
  position?: { x: number; y: number };
}

export interface GraphEdgeView extends TwinEdge {
  label?: string;
}

export interface GraphViewModel {
  metadata: ViewMetadata;
  stats: ViewStats;
  nodes: GraphNodeView[];
  edges: GraphEdgeView[];
}

/**
 * Fetch the Praxis meta-model document from the host.
 *
 * This is a contract surface (DTO) and must remain stable.
 */
export async function getMetaModelDocument(): Promise<MetaModelDocument> {
  return invokeHost<MetaModelDocument>(COMMANDS.metaModel, {});
}

/**
 * Fetch a persisted canvas layout snapshot for the given time context.
 * @param request lookup key (doc + time)
 */
export async function getCanvasLayout(
  request: CanvasLayoutGetRequest,
): Promise<CanvasLayoutSnapshot | undefined> {
  const result = await invokeHost<CanvasLayoutSnapshot | null>(COMMANDS.canvasGetLayout, {
    docId: request.docId,
    asOf: request.asOf,
    scenario: request.scenario,
    layer: request.layer,
  });
  return result ?? undefined;
}

/**
 * Persist a canvas layout snapshot to the host store.
 * @param snapshot layout payload
 */
export async function saveCanvasLayout(snapshot: CanvasLayoutSnapshot): Promise<void> {
  await invokeHost<unknown>(COMMANDS.canvasSaveLayout, {
    docId: snapshot.docId,
    asOf: snapshot.asOf,
    scenario: snapshot.scenario,
    layer: snapshot.layer,
    nodes: snapshot.nodes,
    edges: snapshot.edges,
    groups: snapshot.groups,
  });
}

/**
 * Fetch a persisted graph layout snapshot for the given widget and time context.
 * @param request lookup key (doc + widget + time)
 */
export async function getGraphLayout(
  request: GraphLayoutGetRequest,
): Promise<GraphLayoutSnapshot | undefined> {
  const result = await invokeHost<GraphLayoutSnapshot | null>(COMMANDS.graphLayoutGet, {
    docId: request.docId,
    widgetId: request.widgetId,
    asOf: request.asOf,
    scenario: request.scenario,
    layer: request.layer,
  });
  return result ?? undefined;
}

/**
 * Persist a graph layout snapshot to the host store.
 * @param snapshot layout payload
 */
export async function saveGraphLayout(snapshot: GraphLayoutSnapshot): Promise<void> {
  await invokeHost<unknown>(COMMANDS.graphLayoutSave, {
    docId: snapshot.docId,
    widgetId: snapshot.widgetId,
    asOf: snapshot.asOf,
    scenario: snapshot.scenario,
    layer: snapshot.layer,
    nodes: snapshot.nodes,
  });
}

export interface CatalogueRow {
  id: string;
  values: Record<string, string | number | boolean | null>;
}

export interface CatalogueViewModel {
  metadata: ViewMetadata;
  columns: CatalogueColumn[];
  rows: CatalogueRow[];
}

export interface MatrixAxis {
  id: string;
  label: string;
}

export interface MatrixCell {
  rowId: string;
  columnId: string;
  state: 'connected' | 'missing';
  strength?: number;
  value?: string;
}

export interface MatrixViewModel {
  metadata: ViewMetadata;
  rows: MatrixAxis[];
  columns: MatrixAxis[];
  cells: MatrixCell[];
}

export interface ChartPoint {
  label: string;
  value: number;
  timestamp?: string;
}

export interface ChartSeries {
  id: string;
  label: string;
  color?: string;
  points: ChartPoint[];
}

export interface ChartKpiSummary {
  value: number;
  units?: string;
  delta?: number;
  trend?: 'up' | 'down';
}

export interface ChartViewModel {
  metadata: ViewMetadata;
  chartType: ChartType;
  series: ChartSeries[];
  kpi?: ChartKpiSummary;
}

export type StateAtRequest = TemporalStateParameters;
export type StateAtSnapshot = TemporalStateSnapshot;

export interface TemporalBranchSummary {
  name: string;
  head?: string;
}

export interface TemporalCommitSummary {
  id: string;
  branch: string;
  parents: string[];
  author?: string;
  time?: string;
  message: string;
  tags: string[];
  changeCount: number;
}

export type TemporalDiffRequest = TemporalDiffParameters;

export interface TemporalMergeConflict {
  reference: string;
  kind: string;
  message: string;
}

export interface TemporalMergeResult {
  result?: string;
  conflicts?: TemporalMergeConflict[];
}

export type PraxisOperation =
  | { kind: 'createNode'; node: TwinNode }
  | { kind: 'updateNode'; node: TwinNode }
  | { kind: 'deleteNode'; nodeId: string }
  | { kind: 'createEdge'; edge: TwinEdge }
  | { kind: 'updateEdge'; edge: TwinEdge }
  | { kind: 'deleteEdge'; edgeId: string };

export interface OperationBatchResult {
  accepted: boolean;
  message?: string;
  commitId?: string;
}

export interface ScenarioSummary {
  id: string;
  name: string;
  branch: string;
  description?: string;
  updatedAt: string;
  isDefault?: boolean;
}

interface ListBranchesResponse {
  branches?: TemporalBranchSummaryPayload[];
}

interface TemporalBranchSummaryPayload {
  name?: string;
  head?: string | null;
}

interface ListCommitsResponse {
  commits?: TemporalCommitSummaryPayload[];
}

interface TemporalCommitSummaryPayload {
  id?: string;
  branch?: string;
  parents?: unknown;
  author?: string;
  time?: string;
  message?: string;
  tags?: unknown;
  changeCount?: number;
  change_count?: number;
}

interface DiffSummaryResponse {
  from?: string;
  to?: string;
  nodeAdds?: number;
  nodeMods?: number;
  nodeDels?: number;
  edgeAdds?: number;
  edgeMods?: number;
  edgeDels?: number;
  node_adds?: number;
  node_mods?: number;
  node_dels?: number;
  edge_adds?: number;
  edge_mods?: number;
  edge_dels?: number;
}

interface MergeResponsePayload {
  result?: string;
  conflicts?: TemporalMergeConflictPayload[];
}

interface TemporalMergeConflictPayload {
  reference?: string;
  kind?: string;
  message?: string;
}

/**
 * Return worker health from the host.
 */
export async function getWorkerHealth(): Promise<WorkerHealth> {
  return invokeHost(COMMANDS.workerHealth, {});
}

/**
 * Fetch a time-sliced graph view from the host.
 * @param definition Graph view request parameters.
 */
export async function getGraphView(definition: GraphViewDefinition): Promise<GraphViewModel> {
  return invokeHost(COMMANDS.graphView, definition);
}

/**
 * Fetch catalogue rows/columns for the requested definition.
 * @param definition catalogue view definition (columns, filters, pagination).
 */
export async function getCatalogueView(
  definition: CatalogueViewDefinition,
): Promise<CatalogueViewModel> {
  return invokeHost(COMMANDS.catalogueView, definition);
}

/**
 * Fetch a matrix view (row/column axes plus cells).
 * @param definition matrix view definition.
 */
export async function getMatrixView(definition: MatrixViewDefinition): Promise<MatrixViewModel> {
  return invokeHost(COMMANDS.matrixView, definition);
}

/**
 * Fetch a chart view from the host.
 * @param definition chart view definition.
 */
export async function getChartView(definition: ChartViewDefinition): Promise<ChartViewModel> {
  return invokeHost(COMMANDS.chartView, definition);
}

/**
 * List temporal branches (scenarios) from the host.
 */
export async function listTemporalBranches(): Promise<TemporalBranchSummary[]> {
  const response = await invokeHost<ListBranchesResponse>(COMMANDS.listBranches, {});
  const entries = Array.isArray(response.branches) ? response.branches : [];
  return entries.map((entry) => ({
    name: requireStringField(entry.name, 'branch.name'),
    head: typeof entry.head === 'string' ? entry.head : undefined,
  }));
}

/**
 * List commits for a branch, normalising host payloads into strict types.
 * @param branch branch name to query.
 */
export async function listTemporalCommits(branch: string): Promise<TemporalCommitSummary[]> {
  const response = await invokeHost<ListCommitsResponse>(COMMANDS.listCommits, { branch });
  const commits = Array.isArray(response.commits) ? response.commits : [];
  return commits.map((entry) => normalizeCommit(entry));
}

/**
 * Fetch a state-at snapshot for the given request; ensures optional fields are undefined when absent.
 * @param request timestamp/scenario/confidence payload.
 */
export async function getStateAtSnapshot(request: StateAtRequest): Promise<StateAtSnapshot> {
  const snapshot = await invokeHost<StateAtSnapshot>(
    COMMANDS.stateAt,
    serializeStateAtArguments(request),
  );
  return {
    ...snapshot,
    scenario: snapshot.scenario ?? undefined,
    confidence: snapshot.confidence ?? undefined,
    layer: snapshot.layer ?? undefined,
  };
}

/**
 * Fetch diff summary metrics between two references.
 * @param request diff request containing `from`, `to`, and optional scope.
 */
export async function getTemporalDiff(request: TemporalDiffRequest): Promise<TemporalDiffSnapshot> {
  const summary = await invokeHost<DiffSummaryResponse>(
    COMMANDS.diffSummary,
    serializeDiffArguments(request),
  );
  return {
    from: summary.from ?? request.from,
    to: summary.to ?? request.to,
    metrics: {
      nodeAdds: summary.nodeAdds ?? summary.node_adds ?? 0,
      nodeMods: summary.nodeMods ?? summary.node_mods ?? 0,
      nodeDels: summary.nodeDels ?? summary.node_dels ?? 0,
      edgeAdds: summary.edgeAdds ?? summary.edge_adds ?? 0,
      edgeMods: summary.edgeMods ?? summary.edge_mods ?? 0,
      edgeDels: summary.edgeDels ?? summary.edge_dels ?? 0,
    },
  };
}

/**
 * Merge source into target branch, returning conflicts when the host reports them.
 * @param request merge parameters including strategy passthrough.
 * @param request.source
 * @param request.target
 * @param request.strategy
 */
export async function mergeTemporalBranches(request: {
  source: string;
  target: string;
  strategy?: string;
}): Promise<TemporalMergeResult> {
  const response = await invokeHost<MergeResponsePayload>(COMMANDS.mergeBranches, request);
  const conflicts = Array.isArray(response.conflicts)
    ? response.conflicts
        .map((conflict) => normalizeConflict(conflict))
        .filter((conflict): conflict is TemporalMergeConflict => conflict !== undefined)
    : undefined;
  return {
    result: response.result ?? (conflicts && conflicts.length > 0 ? 'conflicts' : 'ok'),
    conflicts,
  };
}

/**
 * Apply a batch of graph operations; host handles commit creation.
 * @param operations list of operations to apply.
 * @param options optional context (e.g. branch/scenario).
 * @param options.branch
 */
export async function applyOperations(
  operations: PraxisOperation[],
  options?: { branch?: string },
): Promise<OperationBatchResult> {
  return invokeHost(COMMANDS.applyOperations, { operations, branch: options?.branch });
}

/**
 * List available scenarios.
 */
export async function listScenarios(): Promise<ScenarioSummary[]> {
  return invokeHost(COMMANDS.listScenarios, {});
}

/**
 * Invoke a host command through the Tauri bridge.
 * Wraps host errors with a readable message.
 * @param command Tauri command name.
 * @param payload payload for the command.
 */
async function invokeHost<T>(command: string, payload: object): Promise<T> {
  try {
    const result = await invokeIpc<T>(command, payload as Record<string, unknown>);
    return result;
  } catch (error) {
    const message = toErrorMessage(error);
    throw new Error(`Host command '${command}' failed: ${message}`);
  }
}

/**
 * Normalise a commit payload into the strict `TemporalCommitSummary` shape.
 * @param payload raw host commit payload.
 */
function normalizeCommit(payload: TemporalCommitSummaryPayload): TemporalCommitSummary {
  const id = requireStringField(payload.id, 'commit.id');
  const branch = requireStringField(payload.branch, 'commit.branch');
  const message = requireStringField(payload.message, 'commit.message');
  const parents = Array.isArray(payload.parents)
    ? (payload.parents as unknown[]).filter((value): value is string => typeof value === 'string')
    : [];
  const tags = Array.isArray(payload.tags)
    ? (payload.tags as unknown[]).filter((value): value is string => typeof value === 'string')
    : [];
  let changeCount: number | undefined;
  if (typeof payload.changeCount === 'number') {
    changeCount = payload.changeCount;
  } else if (typeof payload.change_count === 'number') {
    changeCount = payload.change_count;
  }
  if (changeCount === undefined) {
    throw new Error('Host commit payload missing changeCount.');
  }
  return {
    id,
    branch,
    parents,
    author: payload.author ?? undefined,
    time: payload.time ?? undefined,
    message,
    tags,
    changeCount,
  };
}

/**
 * Require a non-empty string field from host payloads.
 * @param value
 * @param label
 */
function requireStringField(value: unknown, label: string): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(`Host commit payload missing ${label}.`);
  }
  return value;
}

/**
 * Convert a host merge-conflict payload to a strongly typed object.
 * @param payload raw conflict payload from host.
 */
function normalizeConflict(
  payload: TemporalMergeConflictPayload,
): TemporalMergeConflict | undefined {
  if (!payload.reference || typeof payload.reference !== 'string') {
    return undefined;
  }
  return {
    reference: payload.reference,
    kind: typeof payload.kind === 'string' ? payload.kind : 'unknown',
    message:
      typeof payload.message === 'string' ? payload.message : 'Conflict requires manual resolution',
  };
}

/**
 * Serialize `stateAt` arguments for host invocation.
 * @param request
 */
function serializeStateAtArguments(request: StateAtRequest): Record<string, unknown> {
  return {
    asOf: { id: request.asOf },
    scenario: request.scenario ?? undefined,
    confidence: request.confidence ?? undefined,
    layer: request.layer ?? undefined,
  };
}

/**
 * Serialize `diff` arguments for host invocation.
 * @param request
 */
function serializeDiffArguments(request: TemporalDiffRequest): Record<string, unknown> {
  return {
    from: { id: request.from },
    to: { id: request.to },
    scope: request.scope ?? undefined,
  };
}

export { type TemporalDiffMetrics, type TemporalDiffSnapshot, type WorkerHealth } from '../../dtos';
