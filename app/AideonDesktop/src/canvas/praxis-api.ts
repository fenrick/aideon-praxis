import type {
  TemporalDiffParameters,
  TemporalDiffSnapshot,
  TemporalStateParameters,
  TemporalStateSnapshot,
  WorkerHealth,
} from '../dtos';
import { invoke } from '@tauri-apps/api/core';

import { isTauri } from './platform';

const COMMANDS = {
  workerHealth: 'worker_health',
  graphView: 'praxis_graph_view',
  catalogueView: 'praxis_catalogue_view',
  matrixView: 'praxis_matrix_view',
  chartView: 'praxis_chart_view',
  listBranches: 'list_branches',
  listCommits: 'list_commits',
  stateAt: 'temporal_state_at',
  diffSummary: 'temporal_diff',
  mergeBranches: 'merge_branches',
  applyOperations: 'praxis_apply_operations',
  listScenarios: 'praxis_list_scenarios',
} as const;

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
  fetchedAt: string;
  source: 'host' | 'mock';
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
  head: string | null;
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

const MOCK_HEALTH: WorkerHealth = {
  ok: true,
  timestamp_ms: Date.now(),
  status: 'mock',
  notes: 'Using mock health state outside Tauri',
};

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
  change_count?: number;
}

interface DiffSummaryResponse {
  from?: string;
  to?: string;
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

export async function getWorkerHealth(): Promise<WorkerHealth> {
  if (!isTauri()) {
    return { ...MOCK_HEALTH, timestamp_ms: Date.now() };
  }
  return invoke<WorkerHealth>(COMMANDS.workerHealth, {});
}

export async function getGraphView(definition: GraphViewDefinition): Promise<GraphViewModel> {
  return callOrMock(COMMANDS.graphView, { definition }, () => mockGraphView(definition));
}

export async function getCatalogueView(
  definition: CatalogueViewDefinition,
): Promise<CatalogueViewModel> {
  return callOrMock(COMMANDS.catalogueView, { definition }, () => mockCatalogueView(definition));
}

export async function getMatrixView(definition: MatrixViewDefinition): Promise<MatrixViewModel> {
  return callOrMock(COMMANDS.matrixView, { definition }, () => mockMatrixView(definition));
}

export async function getChartView(definition: ChartViewDefinition): Promise<ChartViewModel> {
  return callOrMock(COMMANDS.chartView, { definition }, () => mockChartView(definition));
}

export async function listTemporalBranches(): Promise<TemporalBranchSummary[]> {
  const response = await callOrMock<ListBranchesResponse | TemporalBranchSummary[]>(
    COMMANDS.listBranches,
    undefined,
    () => mockBranches(),
  );
  if (Array.isArray(response)) {
    return response;
  }
  const entries = Array.isArray(response.branches) ? response.branches : [];
  return entries.map((entry) => ({
    name: typeof entry.name === 'string' ? entry.name : '',
    head: typeof entry.head === 'string' ? entry.head : null,
  }));
}

export async function listTemporalCommits(branch: string): Promise<TemporalCommitSummary[]> {
  const response = await callOrMock<ListCommitsResponse | TemporalCommitSummary[]>(
    COMMANDS.listCommits,
    { branch },
    () => mockCommits(branch),
  );
  if (Array.isArray(response)) {
    return response;
  }
  const commits = Array.isArray(response.commits) ? response.commits : [];
  return commits.map((entry) => normalizeCommit(entry, branch));
}

export async function getStateAtSnapshot(request: StateAtRequest): Promise<StateAtSnapshot> {
  const snapshot = await callOrMock<StateAtSnapshot>(
    COMMANDS.stateAt,
    { payload: serializeStateAtArguments(request) },
    () => mockStateAt(request),
  );
  return {
    ...snapshot,
    scenario: snapshot.scenario ?? undefined,
    confidence: snapshot.confidence ?? undefined,
  };
}

export async function getTemporalDiff(request: TemporalDiffRequest): Promise<TemporalDiffSnapshot> {
  const payload: Record<string, unknown> = {
    payload: {
      from: request.from,
      to: request.to,
    },
  };
  if (request.scope) {
    (payload.payload as Record<string, unknown>).scope = request.scope;
  }
  const summary = await callOrMock<DiffSummaryResponse>(COMMANDS.diffSummary, payload, () =>
    mockDiffSummary(request),
  );
  return {
    from: summary.from ?? request.from,
    to: summary.to ?? request.to,
    metrics: {
      nodeAdds: summary.node_adds ?? 0,
      nodeMods: summary.node_mods ?? 0,
      nodeDels: summary.node_dels ?? 0,
      edgeAdds: summary.edge_adds ?? 0,
      edgeMods: summary.edge_mods ?? 0,
      edgeDels: summary.edge_dels ?? 0,
    },
  };
}

export async function mergeTemporalBranches(request: {
  source: string;
  target: string;
  strategy?: string;
}): Promise<TemporalMergeResult> {
  const response = await callOrMock<MergeResponsePayload>(
    COMMANDS.mergeBranches,
    { payload: request },
    () => mockMerge(request),
  );
  const conflicts = Array.isArray(response.conflicts)
    ? response.conflicts
        .map((conflict) => normalizeConflict(conflict))
        .filter((conflict): conflict is TemporalMergeConflict => conflict !== null)
    : undefined;
  return {
    result: response.result ?? (conflicts && conflicts.length > 0 ? 'conflicts' : 'ok'),
    conflicts,
  };
}

export async function applyOperations(
  operations: PraxisOperation[],
): Promise<OperationBatchResult> {
  return callOrMock(COMMANDS.applyOperations, { operations }, () =>
    mockApplyOperations(operations),
  );
}

export async function listScenarios(): Promise<ScenarioSummary[]> {
  return callOrMock(COMMANDS.listScenarios, undefined, () => mockScenarios());
}

async function callOrMock<T>(
  command: string,
  payload: Record<string, unknown> | undefined,
  fallback: () => T | Promise<T>,
): Promise<T> {
  if (!isTauri()) {
    return await fallback();
  }
  try {
    return await invoke<T>(command, payload ?? {});
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Host command '${command}' failed: ${message}`);
  }
}

function normalizeCommit(
  payload: TemporalCommitSummaryPayload,
  fallbackBranch: string,
): TemporalCommitSummary {
  const parents = Array.isArray(payload.parents)
    ? (payload.parents as unknown[]).filter((value): value is string => typeof value === 'string')
    : [];
  const tags = Array.isArray(payload.tags)
    ? (payload.tags as unknown[]).filter((value): value is string => typeof value === 'string')
    : [];
  return {
    id: payload.id ?? 'unknown',
    branch: payload.branch ?? fallbackBranch,
    parents,
    author: payload.author ?? undefined,
    time: payload.time ?? undefined,
    message: payload.message ?? 'Commit',
    tags,
    changeCount: typeof payload.change_count === 'number' ? payload.change_count : 0,
  };
}

function normalizeConflict(payload: TemporalMergeConflictPayload): TemporalMergeConflict | null {
  if (!payload.reference || typeof payload.reference !== 'string') {
    return null;
  }
  return {
    reference: payload.reference,
    kind: typeof payload.kind === 'string' ? payload.kind : 'unknown',
    message:
      typeof payload.message === 'string' ? payload.message : 'Conflict requires manual resolution',
  };
}

const GRAPH_NODE_IDS = {
  onboarding: 'cap-customer-onboarding',
  support: 'cap-customer-support',
  workflow: 'app-workflow',
  identity: 'svc-auth',
} as const;

function mockGraphView(definition: GraphViewDefinition): GraphViewModel {
  const nodes: GraphNodeView[] = [
    {
      id: GRAPH_NODE_IDS.onboarding,
      label: 'Customer Onboarding',
      type: 'Capability',
      position: { x: 120, y: 200 },
    },
    {
      id: GRAPH_NODE_IDS.support,
      label: 'Customer Support',
      type: 'Capability',
      position: { x: 420, y: 120 },
    },
    {
      id: GRAPH_NODE_IDS.workflow,
      label: 'Workflow Engine',
      type: 'Application',
      position: { x: 420, y: 320 },
    },
    {
      id: GRAPH_NODE_IDS.identity,
      label: 'Identity Service',
      type: 'Service',
      position: { x: 680, y: 220 },
    },
  ];

  const edges: GraphEdgeView[] = [
    {
      id: 'edge-1',
      from: GRAPH_NODE_IDS.onboarding,
      to: GRAPH_NODE_IDS.support,
      type: 'supports',
      label: 'handoff',
    },
    {
      id: 'edge-2',
      from: GRAPH_NODE_IDS.support,
      to: GRAPH_NODE_IDS.workflow,
      type: 'depends_on',
      label: 'tickets',
    },
    {
      id: 'edge-3',
      from: GRAPH_NODE_IDS.workflow,
      to: GRAPH_NODE_IDS.identity,
      type: 'depends_on',
      label: 'auth',
    },
  ];

  return {
    metadata: buildMetadata(definition),
    stats: {
      nodes: nodes.length,
      edges: edges.length,
    },
    nodes,
    edges,
  };
}

function mockCatalogueView(definition: CatalogueViewDefinition): CatalogueViewModel {
  const columns =
    definition.columns.length > 0
      ? definition.columns
      : [
          { id: 'name', label: 'Name', type: 'string' as const },
          { id: 'owner', label: 'Owner', type: 'string' as const },
          { id: 'state', label: 'State', type: 'string' as const },
        ];

  const rows: CatalogueRow[] = [
    {
      id: 'cap-customer-onboarding',
      values: { name: 'Customer Onboarding', owner: 'CX', state: 'Pilot' },
    },
    {
      id: 'cap-customer-support',
      values: { name: 'Customer Support', owner: 'Ops', state: 'Production' },
    },
    {
      id: 'cap-incident-response',
      values: { name: 'Incident Response', owner: 'SRE', state: 'In Flight' },
    },
  ];

  return {
    metadata: buildMetadata(definition),
    columns,
    rows,
  };
}

const MATRIX_AXIS_IDS = {
  onboarding: 'cap-customer-onboarding',
  incident: 'cap-incident-response',
  identity: 'svc-auth',
  search: 'svc-search',
} as const;

function mockMatrixView(definition: MatrixViewDefinition): MatrixViewModel {
  const rows: MatrixAxis[] = [
    { id: MATRIX_AXIS_IDS.onboarding, label: 'Customer Onboarding' },
    { id: MATRIX_AXIS_IDS.incident, label: 'Incident Response' },
  ];
  const columns: MatrixAxis[] = [
    { id: MATRIX_AXIS_IDS.identity, label: 'Identity Service' },
    { id: MATRIX_AXIS_IDS.search, label: 'Search Platform' },
  ];
  const cells: MatrixCell[] = [
    {
      rowId: MATRIX_AXIS_IDS.onboarding,
      columnId: MATRIX_AXIS_IDS.identity,
      state: 'connected',
      strength: 0.8,
    },
    { rowId: MATRIX_AXIS_IDS.onboarding, columnId: MATRIX_AXIS_IDS.search, state: 'missing' },
    {
      rowId: MATRIX_AXIS_IDS.incident,
      columnId: MATRIX_AXIS_IDS.identity,
      state: 'connected',
      strength: 0.4,
    },
    { rowId: MATRIX_AXIS_IDS.incident, columnId: MATRIX_AXIS_IDS.search, state: 'missing' },
  ];
  return {
    metadata: buildMetadata(definition),
    rows,
    columns,
    cells,
  };
}

function mockChartView(definition: ChartViewDefinition): ChartViewModel {
  const metadata = buildMetadata(definition);
  if (definition.chartType === 'kpi') {
    return {
      metadata,
      chartType: 'kpi',
      series: [],
      kpi: {
        value: 128,
        units: 'services',
        delta: 6,
        trend: 'up',
      },
    };
  }
  if (definition.chartType === 'line') {
    const baseTimestamp = Date.now() - 6 * 24 * 60 * 60 * 1000;
    const points: ChartPoint[] = Array.from({ length: 7 }).map((_, index) => {
      const timestamp = new Date(baseTimestamp + index * 24 * 60 * 60 * 1000);
      return {
        label: timestamp.toLocaleDateString('en-US', { weekday: 'short' }),
        value: 80 + index * 5 + (index % 2 === 0 ? 3 : -4),
        timestamp: timestamp.toISOString(),
      };
    });
    return {
      metadata,
      chartType: 'line',
      series: [
        {
          id: 'velocity',
          label: 'Delivery velocity',
          color: '#2563eb',
          points,
        },
      ],
    };
  }
  const categories = ['Security', 'Resilience', 'Efficiency', 'Experience'];
  const series: ChartSeries[] = [
    {
      id: 'current',
      label: 'Current',
      color: '#0f172a',
      points: categories.map((category) => ({ label: category, value: randomScore(category) })),
    },
    {
      id: 'target',
      label: 'Target',
      color: '#10b981',
      points: categories.map((category) => ({ label: category, value: 95 })),
    },
  ];
  return {
    metadata,
    chartType: 'bar',
    series,
  };
}

function mockBranches(): TemporalBranchSummary[] {
  return [
    { name: 'main', head: 'commit-main-004' },
    { name: 'chronaplay', head: 'commit-chronaplay-002' },
  ];
}

function mockCommits(branch: string): TemporalCommitSummary[] {
  if (branch === 'chronaplay') {
    return [
      mockCommit('commit-chronaplay-001', 'chronaplay', 'Chrona staging', -3),
      mockCommit('commit-chronaplay-002', 'chronaplay', 'Chrona overlays', -1),
    ];
  }
  return [
    mockCommit('commit-main-001', 'main', 'Initial snapshot', -14),
    mockCommit('commit-main-002', 'main', 'Capability ingest', -7),
    mockCommit('commit-main-003', 'main', 'Application links', -2),
    mockCommit('commit-main-004', 'main', 'Plan Events sync', 0),
  ];
}

function mockDiffSummary(request: TemporalDiffRequest): DiffSummaryResponse {
  return {
    from: request.from,
    to: request.to,
    node_adds: 3,
    node_mods: 2,
    node_dels: 1,
    edge_adds: 4,
    edge_mods: 1,
    edge_dels: 0,
  };
}

function mockMerge(request: { source: string; target: string }): MergeResponsePayload {
  if (request.source === 'chronaplay' && request.target === 'main') {
    return {
      result: 'conflicts',
      conflicts: [
        {
          reference: 'cap-customer-onboarding',
          kind: 'node',
          message: 'Capability already diverged in main',
        },
      ],
    };
  }
  return { result: 'merged', conflicts: [] };
}

function mockCommit(
  id: string,
  branch: string,
  message: string,
  daysOffset: number,
): TemporalCommitSummary {
  const time = new Date(Date.now() + daysOffset * 24 * 60 * 60 * 1000).toISOString();
  return {
    id,
    branch,
    parents: [],
    author: 'Praxis Bot',
    time,
    message,
    tags: [],
    changeCount: 12,
  };
}

function mockStateAt(request: StateAtRequest): StateAtSnapshot {
  const asOf = request.asOf;
  const scenario = request.scenario ?? 'main';
  const base = seededMetric(`${asOf}-${scenario}`);
  const nodes = 220 + (base % 60);
  const edges = 430 + (base % 90);
  return {
    asOf,
    scenario,
    confidence: request.confidence ?? undefined,
    nodes,
    edges,
  };
}

function mockApplyOperations(operations: PraxisOperation[]): OperationBatchResult {
  if (operations.length === 0) {
    return { accepted: false, message: 'No operations provided' };
  }
  return {
    accepted: true,
    commitId: `mock-commit-${nextOperationId()}`,
    message: 'Mock commit created',
  };
}

function mockScenarios(): ScenarioSummary[] {
  const now = nowIso();
  return [
    {
      id: 'scenario-mainline',
      name: 'Mainline FY25',
      branch: 'main',
      description: 'Authoritative twin data for production decisions.',
      updatedAt: now,
      isDefault: true,
    },
    {
      id: 'scenario-chrona',
      name: 'Chrona Playground',
      branch: 'chronaplay',
      description: 'Prototype scenario for Chrona overlays.',
      updatedAt: now,
    },
  ];
}

function buildMetadata(definition: ViewDefinitionBase): ViewMetadata {
  return {
    id: definition.id,
    name: definition.name,
    asOf: definition.asOf,
    scenario: definition.scenario,
    fetchedAt: nowIso(),
    source: isTauri() ? 'host' : 'mock',
  };
}

const nextOperationId = (() => {
  let counter = 1;
  return () => {
    counter += 1;
    return counter.toString().padStart(4, '0');
  };
})();

function nowIso(): string {
  return new Date().toISOString();
}

function randomScore(seed: string): number {
  let hash = 0;
  for (const character of seed) {
    hash = (hash << 5) - hash + (character.codePointAt(0) ?? 0);
    hash = Math.trunc(hash);
  }
  const normalized = Math.abs(hash % 40);
  return 60 + normalized;
}

function serializeStateAtArguments(request: StateAtRequest): Record<string, unknown> {
  return {
    asOf: request.asOf,
    scenario: request.scenario ?? null,
    confidence: request.confidence ?? null,
  };
}

function seededMetric(key: string): number {
  return randomScore(key) * 10;
}

export {
  type TemporalDiffMetrics,
  type TemporalDiffSnapshot,
  type WorkerHealth,
} from '../dtos';
