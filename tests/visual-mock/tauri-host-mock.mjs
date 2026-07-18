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
 * That lets us drive and screenshot the REAL assembled UX — the twin-authoring
 * surface and the React-Flow canvas widgets — with no native build.
 *
 * DTO shapes mirror `src/adapters/ipc-bindings.gen.ts`; keep them in sync if the
 * generated bindings change.
 */

/**
 * Build the fixture data the mocked host returns.
 * @param {{ withGraphTemplate?: boolean }} [options] - When `withGraphTemplate`
 *   is set, `workspace_templates_list` returns a template whose first widget is a
 *   graph; the provider auto-activates `templates[0]`, so `PlatformContent`
 *   renders the real GraphWidget instead of the foundation panel.
 */
export function makeFixtures(options = {}) {
  const status = {
    workspaceId: 'ws-demo-2f9a1c',
    partitionId: 'part-0001',
    workspaceFormatVersion: 1,
    appliedOpCount: 14,
    foundationRebuildHash: 'b3f1a9c7d2e4f60518a9c0b1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7',
  };
  const nodes = [
    { nodeId: 'app-portal', typeId: 'sym-app', typeLabel: 'Application', tombstoned: false },
    { nodeId: 'app-billing', typeId: 'sym-app', typeLabel: 'Application', tombstoned: false },
    { nodeId: 'cap-onboarding', typeId: 'sym-cap', typeLabel: 'Capability', tombstoned: false },
    { nodeId: 'svc-identity', typeId: 'sym-svc', typeLabel: 'Service', tombstoned: false },
  ];
  const edges = [
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
  const metamodelTypes = [
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
  const resolved = [
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
  const graphView = {
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
      {
        id: 'e2',
        from: 'app-portal',
        to: 'svc-identity',
        type: 'uses',
        label: 'uses',
        props: null,
      },
    ],
  };
  const matrixView = {
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
      {
        rowId: 'cap-billing',
        columnId: 'app-portal',
        state: 'missing',
        strength: null,
        value: null,
      },
      {
        rowId: 'cap-billing',
        columnId: 'app-billing',
        state: 'connected',
        strength: 1,
        value: 'realises',
      },
    ],
  };
  const graphTemplate = {
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
  const templates = options.withGraphTemplate ? [graphTemplate] : [];

  return {
    status,
    nodes,
    edges,
    metamodelTypes,
    resolved,
    graphView,
    matrixView,
    templates,
    scenarios: [
      {
        id: 'base',
        name: 'Baseline',
        branch: 'main',
        updatedAt: '2026-07-18T00:00:00Z',
        isDefault: true,
      },
    ],
    projects: [],
    metamodelDocument: {
      version: '1',
      description: null,
      types: [],
      relationships: [],
      validation: null,
    },
  };
}

/**
 * Browser-side installer. Serialised by Playwright `addInitScript` and executed
 * before app scripts, so it must be self-contained (only its `fixtures` arg).
 * @param {ReturnType<typeof makeFixtures>} fixtures - Fixture data to answer with.
 */
export function installTauriHostMock(fixtures) {
  const resultFor = (cmd) => {
    switch (cmd) {
      case 'workspace_open':
      case 'workspace_create':
      case 'workspace_status':
        return fixtures.status;
      case 'workspace_nodes':
        return fixtures.nodes;
      case 'workspace_edges':
        return fixtures.edges;
      case 'workspace_metamodel_types':
        return fixtures.metamodelTypes;
      case 'workspace_state_at':
        return fixtures.resolved;
      case 'workspace_diff':
        return [];
      case 'workspace_author_node':
        return fixtures.nodes[0];
      case 'workspace_projects_list':
        return fixtures.projects;
      case 'workspace_templates_list':
        return fixtures.templates;
      case 'praxis_scenario_list':
        return fixtures.scenarios;
      case 'praxis_metamodel_get':
        return fixtures.metamodelDocument;
      case 'praxis_artefact_execute_graph':
        return fixtures.graphView;
      case 'praxis_artefact_execute_matrix':
        return fixtures.matrixView;
      case 'praxis_canvas_get_scene':
        return { widgets: fixtures.templates[0] ? fixtures.templates[0].widgets : [] };
      case 'praxis_canvas_get_layout':
      case 'praxis_graph_layout_get':
        return null;
      default:
        return null;
    }
  };

  window.__TAURI_INTERNALS__ = {
    metadata: {
      currentWindow: { label: 'main' },
      currentWebview: { windowLabel: 'main', label: 'main' },
    },
    transformCallback(callback, once) {
      const id = Math.floor(Math.random() * 1e9);
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
      return Promise.resolve({ requestId, status: 'ok', result: resultFor(cmd) });
    },
  };
}
