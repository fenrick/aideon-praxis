import { invoke } from '@tauri-apps/api/core';

import { isTauri } from './platform';

const COMMANDS = {
  workerHealth: 'worker_health',
  graphView: 'praxis_graph_view',
  catalogueView: 'praxis_catalogue_view',
  matrixView: 'praxis_matrix_view',
  applyOperations: 'praxis_apply_operations',
  listScenarios: 'praxis_list_scenarios',
} as const;

export interface WorkerHealth {
  ok: boolean;
  timestamp_ms: number;
  latency_ms?: number;
  status?: string;
  notes?: string;
}

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

export async function getWorkerHealth(): Promise<WorkerHealth> {
  if (!isTauri()) {
    return { ...MOCK_HEALTH, timestamp_ms: Date.now() };
  }
  return invoke<WorkerHealth>(COMMANDS.workerHealth);
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
