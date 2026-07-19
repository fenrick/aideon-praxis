/**
 * Reusable Tauri-host mock for browser-based visual validation.
 *
 * The Aideon renderer is a Tauri app: it reaches the host through `invoke`
 * (`window.__TAURI_INTERNALS__.invoke`) using a request/response envelope
 * (`{ requestId, status, result }`, see `src/adapters/ipc.ts`). A plain browser
 * has no host, so the app never gets past the "Workspace foundation" gate.
 *
 * This module fabricates that host: `installTauriHostMock` is injected via
 * Playwright `addInitScript` BEFORE the app loads, so `isTauriRuntime()` becomes
 * true and every `invoke(cmd, { request })` is answered from `makeFixtures()`.
 * That lets us drive and screenshot the REAL assembled UX with no native build.
 *
 * DTO shapes mirror `src/adapters/ipc-bindings.gen.ts`; keep them in sync if the
 * generated bindings change. Fixture data lives in module-level constants so the
 * assembler stays small; `installTauriHostMock` is self-contained (it is
 * serialised into the browser and may only read its `fixtures` argument).
 */

const STATUS = {
  workspaceId: 'ws-demo-2f9a1c',
  partitionId: 'part-0001',
  workspaceFormatVersion: 1,
  appliedOpCount: 14,
  foundationRebuildHash: 'b3f1a9c7d2e4f60518a9c0b1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7',
};

const NODES = [
  { nodeId: 'app-portal', typeId: 'sym-app', typeLabel: 'Application', tombstoned: false },
  { nodeId: 'app-billing', typeId: 'sym-app', typeLabel: 'Application', tombstoned: false },
  { nodeId: 'cap-onboarding', typeId: 'sym-cap', typeLabel: 'Capability', tombstoned: false },
  { nodeId: 'svc-identity', typeId: 'sym-svc', typeLabel: 'Service', tombstoned: false },
];

const EDGES = [
  {
    edgeId: 'e1',
    typeId: 'sym-realises',
    typeLabel: 'realises',
    srcId: 'app-portal',
    dstId: 'cap-onboarding',
    tombstoned: false,
  },
  {
    edgeId: 'e2',
    typeId: 'sym-uses',
    typeLabel: 'uses',
    srcId: 'app-portal',
    dstId: 'svc-identity',
    tombstoned: false,
  },
];

const METAMODEL_TYPES = [
  {
    id: 'Application',
    label: 'Application',
    category: 'Application',
    attributes: [
      { name: 'name', required: true, enumValues: [] },
      { name: 'owner', required: false, enumValues: [] },
    ],
  },
  {
    id: 'Capability',
    label: 'Capability',
    category: 'Business',
    attributes: [{ name: 'name', required: true, enumValues: [] }],
  },
  {
    id: 'Service',
    label: 'Service',
    category: 'Application',
    attributes: [{ name: 'name', required: true, enumValues: [] }],
  },
];

const RESOLVED = [
  {
    nodeId: 'app-portal',
    typeLabel: 'Application',
    properties: [
      { field: 'name', value: 'Customer Portal', layer: 'actual' },
      { field: 'owner', value: 'Digital Team', layer: 'plan' },
    ],
  },
  {
    nodeId: 'app-billing',
    typeLabel: 'Application',
    properties: [{ field: 'name', value: 'Billing Engine', layer: 'actual' }],
  },
  {
    nodeId: 'cap-onboarding',
    typeLabel: 'Capability',
    properties: [{ field: 'name', value: 'Customer Onboarding', layer: 'actual' }],
  },
];

const viewMetadata = (id, name) => ({
  id,
  name,
  asOf: '0',
  layer: 'actual',
  scenario: 'base',
  fetchedAt: '2026-07-18T00:00:00Z',
  source: 'mock',
});

const GRAPH_VIEW = {
  metadata: viewMetadata('graph-default', 'Landscape'),
  stats: { nodes: 4, edges: 2 },
  nodes: [
    {
      id: 'app-portal',
      label: 'Customer Portal',
      type: 'Application',
      position: { x: 80, y: 80 },
      props: null,
    },
    {
      id: 'app-billing',
      label: 'Billing Engine',
      type: 'Application',
      position: { x: 380, y: 80 },
      props: null,
    },
    {
      id: 'cap-onboarding',
      label: 'Customer Onboarding',
      type: 'Capability',
      position: { x: 80, y: 320 },
      props: null,
    },
    {
      id: 'svc-identity',
      label: 'Identity Service',
      type: 'Service',
      position: { x: 380, y: 320 },
      props: null,
    },
  ],
  edges: [
    {
      id: 'e1',
      from: 'app-portal',
      to: 'cap-onboarding',
      type: 'realises',
      label: 'realises',
      props: null,
    },
    { id: 'e2', from: 'app-portal', to: 'svc-identity', type: 'uses', label: 'uses', props: null },
  ],
};

const MATRIX_VIEW = {
  metadata: viewMetadata('matrix-default', 'Capability x Application'),
  rows: [
    { id: 'cap-onboarding', label: 'Customer Onboarding' },
    { id: 'cap-billing', label: 'Billing' },
  ],
  columns: [
    { id: 'app-portal', label: 'Customer Portal' },
    { id: 'app-billing', label: 'Billing Engine' },
  ],
  cells: [
    {
      rowId: 'cap-onboarding',
      columnId: 'app-portal',
      state: 'connected',
      strength: 1,
      value: 'realises',
    },
    {
      rowId: 'cap-onboarding',
      columnId: 'app-billing',
      state: 'missing',
      strength: null,
      value: null,
    },
    { rowId: 'cap-billing', columnId: 'app-portal', state: 'missing', strength: null, value: null },
    {
      rowId: 'cap-billing',
      columnId: 'app-billing',
      state: 'connected',
      strength: 1,
      value: 'realises',
    },
  ],
};

const GRAPH_TEMPLATE = {
  id: 'landscape',
  documentId: 'doc-landscape',
  name: 'Landscape',
  description: 'Application landscape graph.',
  widgets: [
    {
      id: 'w-graph',
      title: 'Landscape',
      size: 'full',
      kind: 'graph',
      view: { id: 'graph-default', name: 'Landscape', kind: 'graph', asOf: '0' },
    },
  ],
};

const SCENARIOS = [
  {
    id: 'base',
    name: 'Baseline',
    branch: 'main',
    updatedAt: '2026-07-18T00:00:00Z',
    isDefault: true,
  },
];

// Projects carry their scenarios; the provider derives the active scenario (and
// thus the runtime cursor that gates widget instantiation) from here.
const PROJECTS = [{ id: 'proj-demo', name: 'Enterprise Demo', scenarios: SCENARIOS }];

const METAMODEL_DOCUMENT = {
  version: '1',
  description: null,
  types: [],
  relationships: [],
  validation: null,
};

/**
 * Build the fixture data the mocked host returns.
 * @param {{ withGraphTemplate?: boolean }} [options] - When `withGraphTemplate`
 *   is set, `workspace_templates_list` returns a graph template (the provider
 *   auto-activates `templates[0]`), ready for when the canvas surface lands.
 */
export function makeFixtures(options = {}) {
  return {
    status: STATUS,
    nodes: NODES,
    edges: EDGES,
    metamodelTypes: METAMODEL_TYPES,
    resolved: RESOLVED,
    graphView: GRAPH_VIEW,
    matrixView: MATRIX_VIEW,
    scenarios: SCENARIOS,
    projects: PROJECTS,
    metamodelDocument: METAMODEL_DOCUMENT,
    templates: options.withGraphTemplate ? [GRAPH_TEMPLATE] : [],
  };
}

/**
 * Browser-side installer. Serialised by Playwright `addInitScript` and executed
 * before app scripts, so it must be self-contained (only its `fixtures` arg).
 * Command → result is a lookup map (not a switch) to keep complexity low.
 * @param {ReturnType<typeof makeFixtures>} fixtures - Fixture data to answer with.
 */
export function installTauriHostMock(fixtures) {
  const scene = { widgets: fixtures.templates[0] ? fixtures.templates[0].widgets : [] };
  const results = {
    workspace_open: fixtures.status,
    workspace_create: fixtures.status,
    workspace_status: fixtures.status,
    workspace_nodes: fixtures.nodes,
    workspace_edges: fixtures.edges,
    workspace_metamodel_types: fixtures.metamodelTypes,
    workspace_state_at: fixtures.resolved,
    workspace_diff: [],
    workspace_apply_change_event: {
      runId: 'mock-run-1',
      queueClass: 'authoring',
      idempotencyKey: 'mock-idempotency-key',
      ledgerRef: 'ops/runs/mock-run-1/run.json',
      acceptedAt: '1970-01-01T00:00:00.000Z',
    },
    workspace_inspect_object: fixtures.nodes[0],
    workspace_projects_list: fixtures.projects,
    workspace_templates_list: fixtures.templates,
    praxis_scenario_list: fixtures.scenarios,
    praxis_metamodel_get: fixtures.metamodelDocument,
    praxis_artefact_execute_graph: fixtures.graphView,
    praxis_artefact_execute_matrix: fixtures.matrixView,
    praxis_canvas_get_scene: scene,
    praxis_canvas_get_layout: null,
    praxis_graph_layout_get: null,
  };

  let callbackSequence = 0;
  window.__TAURI_INTERNALS__ = {
    metadata: {
      currentWindow: { label: 'main' },
      currentWebview: { windowLabel: 'main', label: 'main' },
    },
    transformCallback(callback, once) {
      const id = (callbackSequence += 1);
      window[`_${id}`] = (result) => {
        if (once) delete window[`_${id}`];
        return typeof callback === 'function' ? callback(result) : undefined;
      };
      return id;
    },
    invoke(cmd, args) {
      // Tauri plugin channels (log, event, dialog, window-state) are best-effort.
      if (typeof cmd === 'string' && cmd.startsWith('plugin:')) {
        return Promise.resolve(null);
      }
      const requestId = args && args.request ? args.request.requestId : undefined;
      const result = cmd in results ? results[cmd] : null;
      return Promise.resolve({ requestId, status: 'ok', result });
    },
  };
}
