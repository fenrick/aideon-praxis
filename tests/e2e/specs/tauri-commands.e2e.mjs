import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

let requestCounter = 0;
const invokedCommands = new Set();

// Established by waitForMainWindow() — used by ensureActiveWindow() to prefer
// the main window (appcommands-mutating capable) over the splash or other windows
// whose handle order is not guaranteed by WebKitGTK's WebDriver implementation.
let mainWindowHandle;

// Returns true when called inside the Tauri main window (root route, '/').
// Secondary windows (splash, settings, status, etc.) have named sub-paths so
// this is a reliable discriminator that doesn't depend on React render state.
function isMainWindowPathname() {
  const p = window.location.pathname ?? '';
  return p === '/' || p === '' || p === '/index.html';
}

function nextId(prefix) {
  return crypto.randomUUID();
}

function nextRequestId() {
  requestCounter += 1;
  return `e2e-${requestCounter}`;
}

async function invokeCommand(command, payload) {
  invokedCommands.add(command);
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      await ensureActiveWindow();
      // Use execute() + waitUntil polling instead of executeAsync().
      // On WebKitGTK, the two WebDriver endpoints use different internal window
      // routing: execute/sync honours the window set by switchToWindow(), but
      // execute/async may fire in a different webview — causing ACL denials
      // from a context that lacks appcommands-mutating.
      await browser.execute(
        (cmd, args) => {
          window.__e2eResult__ = null;
          const invoke = window.__TAURI_INTERNALS__?.invoke;
          if (!invoke) {
            window.__e2eResult__ = { ok: false, error: 'tauri invoke not available' };
            return;
          }
          invoke(cmd, args)
            .then((result) => {
              window.__e2eResult__ = { ok: true, result };
            })
            .catch((error) => {
              window.__e2eResult__ = { ok: false, error: error?.message ?? String(error) };
            });
        },
        command,
        payload,
      );
      await browser.waitUntil(() => browser.execute(() => window.__e2eResult__ !== null), {
        timeout: 30_000,
        timeoutMsg: `${command} did not resolve within 30 s`,
      });
      return await browser.execute(() => window.__e2eResult__);
    } catch (error) {
      if (String(error).includes('no such window') && attempt === 0) {
        continue;
      }
      throw error;
    }
  }
  throw new Error('failed to invoke command after retry');
}

async function ensureActiveWindow() {
  // Prefer the pinned main window handle established by waitForMainWindow().
  // Verify by URL pathname (root route = main window with appcommands-mutating)
  // rather than by Tauri invoke presence, which all windows share.
  if (mainWindowHandle) {
    try {
      await browser.switchToWindow(mainWindowHandle);
      const isMain = await browser.execute(isMainWindowPathname);
      if (isMain) return;
    } catch {
      // stale or closed handle — fall through to re-scan
    }
    mainWindowHandle = undefined;
  }
  // Re-find the main window by URL pathname.
  const handles = await browser.getWindowHandles();
  if (handles.length === 0) {
    throw new Error('no window handles available');
  }
  for (let i = handles.length - 1; i >= 0; i -= 1) {
    try {
      await browser.switchToWindow(handles[i]);
      const isMain = await browser.execute(isMainWindowPathname);
      if (isMain) {
        mainWindowHandle = handles[i];
        return;
      }
    } catch {
      continue;
    }
  }
  throw new Error('no main window (root route) found among open handles');
}

// Wait until the main window's shell content is rendered, then switch to it
// and pin the handle in mainWindowHandle so ensureActiveWindow() always returns
// to this window instead of scanning and potentially landing on the splash window.
//
// Identification strategy: URL pathname '/' (main window's root route) is
// checked first, which is more stable than DOM-content probing — it is available
// even before React has mounted. The DOM check then confirms the shell is ready.
async function waitForMainWindow() {
  await browser.waitUntil(
    async () => {
      const handles = await browser.getWindowHandles();
      for (let i = handles.length - 1; i >= 0; i -= 1) {
        try {
          await browser.switchToWindow(handles[i]);
          // Skip windows that are not the root route (splash/, settings/, etc.).
          const isMain = await browser.execute(isMainWindowPathname);
          if (!isMain) continue;
          // Confirm shell content is rendered — this verifies IPC is wired up.
          const hasContent = await browser.execute(() =>
            Boolean(document.querySelector('[data-testid="aideon-shell-content"]')),
          );
          if (hasContent) {
            mainWindowHandle = handles[i];
            return true;
          }
        } catch {
          // window not yet ready — try next
        }
      }
      return false;
    },
    {
      timeout: 60_000,
      timeoutMsg: 'main window (root route) shell content did not appear within 60 s',
    },
  );
  await browser.switchToWindow(mainWindowHandle);
}

async function invokeIpc(command, payload) {
  return invokeCommand(command, {
    request: {
      requestId: nextRequestId(),
      payload,
    },
  });
}

function assertOk(response, label) {
  assert.equal(response.ok, true, response.error ?? `${label} invoke failed`);
  assert.equal(response.result.status, 'ok', `${label} expected ok`);
  return response.result.result;
}

function assertOkOrError(response, label) {
  assert.equal(response.ok, true, response.error ?? `${label} invoke failed`);
  assert.ok(
    response.result.status === 'ok' || response.result.status === 'error',
    `${label} expected ok or error`,
  );
  return response.result;
}

describe('tauri e2e command coverage', () => {
  it('executes all IPC commands over the tauri bridge', async () => {
    // Block until the main window (appcommands-mutating capable) is visible and
    // fully rendered. The splash window, which lacks mutating permissions, may be
    // the only WebDriver-accessible window during the first seconds of startup.
    await waitForMainWindow();

    const hasInvoke = await browser.execute(
      () => typeof window.__TAURI_INTERNALS__?.invoke === 'function',
    );
    assert.equal(hasInvoke, true, 'expected tauri internals invoke to be available');

    const ids = {
      partitionId: nextId('partition'),
      actorId: nextId('actor'),
      typeNodeId: nextId('type-node'),
      typeEdgeId: nextId('type-edge'),
      fieldId: nextId('field'),
      nodeA: nextId('node-a'),
      nodeB: nextId('node-b'),
      edgeId: nextId('edge'),
      scenarioId: nextId('scenario'),
      widgetId: nextId('widget'),
      docId: nextId('doc'),
    };
    const emptyPartitionId = nextId('partition-empty');
    const assertedAt = '1';
    const validTime = '1';

    assertOk(await invokeIpc('system_worker_health', {}), 'system_worker_health');
    assertOk(await invokeIpc('system_setup_state', {}), 'system_setup_state');
    assertOk(
      await invokeIpc('system_setup_complete', { task: 'frontend' }),
      'system_setup_complete',
    );
    assertOk(await invokeIpc('system_window_open', { window: 'settings' }), 'system_window_open');

    assertOk(await invokeIpc('workspace_projects_list', {}), 'workspace_projects_list');
    const templates = assertOk(
      await invokeIpc('workspace_templates_list', {}),
      'workspace_templates_list',
    );
    assert.ok(Array.isArray(templates) && templates.length > 0, 'expected default templates');
    assertOk(
      await invokeIpc('workspace_templates_save', {
        id: nextId('template'),
        documentId: ids.docId,
        name: 'E2E Template',
        description: 'E2E template payload',
        widgets: [
          {
            id: ids.widgetId,
            title: 'Graph',
            size: 'full',
            kind: 'graph',
            view: { id: 'graph-view', kind: 'graph' },
          },
        ],
      }),
      'workspace_templates_save',
    );

    const commits = assertOk(
      await invokeIpc('chrona_temporal_list_commits', { branch: 'main' }),
      'chrona_temporal_list_commits',
    );
    const latestCommitId =
      Array.isArray(commits) && commits.length > 0 ? (commits.at(-1)?.id ?? 'main') : 'main';

    assertOk(
      await invokeIpc('praxis_canvas_save_layout', {
        docId: ids.docId,
        asOf: latestCommitId,
        scenario: 'main',
        layer: null,
        nodes: [
          {
            id: ids.widgetId,
            typeId: 'widget',
            x: 10,
            y: 20,
            w: 100,
            h: 80,
            z: 0,
            label: null,
            groupId: null,
          },
        ],
        edges: [],
        groups: [],
      }),
      'praxis_canvas_save_layout',
    );
    assertOk(
      await invokeIpc('praxis_canvas_get_layout', {
        docId: ids.docId,
        asOf: latestCommitId,
        scenario: 'main',
        layer: null,
      }),
      'praxis_canvas_get_layout',
    );
    assertOk(
      await invokeIpc('praxis_graph_layout_save', {
        docId: ids.docId,
        widgetId: ids.widgetId,
        asOf: latestCommitId,
        scenario: null,
        layer: null,
        nodes: [
          {
            id: ids.nodeA,
            x: 12,
            y: 24,
          },
        ],
      }),
      'praxis_graph_layout_save',
    );
    assertOk(
      await invokeIpc('praxis_graph_layout_get', {
        docId: ids.docId,
        widgetId: ids.widgetId,
        asOf: latestCommitId,
        scenario: null,
        layer: null,
      }),
      'praxis_graph_layout_get',
    );
    assertOk(
      await invokeIpc('praxis_canvas_get_scene', {
        asOf: null,
      }),
      'praxis_canvas_get_scene',
    );

    assertOk(await invokeIpc('praxis_metamodel_get', {}), 'praxis_metamodel_get');

    assertOk(
      await invokeIpc('praxis_artefact_execute_graph', {
        id: 'graph-1',
        name: 'Graph',
        kind: 'graph',
        asOf: latestCommitId,
        layout: null,
        scenario: 'main',
        confidence: 0.9,
        layer: null,
        filters: null,
        scope: null,
      }),
      'praxis_artefact_execute_graph',
    );
    assertOk(
      await invokeIpc('praxis_artefact_execute_catalogue', {
        id: 'cat-1',
        name: 'Catalogue',
        kind: 'catalogue',
        asOf: latestCommitId,
        scenario: 'main',
        confidence: null,
        layer: null,
        filters: null,
        columns: [],
        limit: null,
      }),
      'praxis_artefact_execute_catalogue',
    );
    assertOk(
      await invokeIpc('praxis_artefact_execute_matrix', {
        id: 'matrix-1',
        name: 'Matrix',
        kind: 'matrix',
        asOf: latestCommitId,
        rowType: 'Capability',
        columnType: 'Application',
        relationship: 'realises',
        scenario: 'main',
        confidence: null,
        layer: null,
        filters: null,
      }),
      'praxis_artefact_execute_matrix',
    );
    assertOk(
      await invokeIpc('praxis_artefact_execute_chart', {
        id: 'chart-1',
        name: 'Chart',
        kind: 'chart',
        asOf: latestCommitId,
        chartType: 'kpi',
        measure: 'count',
        dimension: null,
        scenario: 'main',
        confidence: null,
        layer: null,
        filters: null,
      }),
      'praxis_artefact_execute_chart',
    );
    assertOk(
      await invokeIpc('praxis_task_apply_operations', {
        branch: null,
        operations: [
          {
            kind: 'createNode',
            node: {
              id: ids.nodeA,
              type: 'Capability',
              props: { name: 'E2E Node A' },
            },
          },
          {
            kind: 'createNode',
            node: {
              id: ids.nodeB,
              type: 'Capability',
              props: { name: 'E2E Node B' },
            },
          },
        ],
      }),
      'praxis_task_apply_operations',
    );
    assertOk(await invokeIpc('praxis_scenario_list', {}), 'praxis_scenario_list');

    const stateAt = assertOk(
      await invokeIpc('chrona_temporal_state_at', {
        asOf: { id: latestCommitId },
        scenario: 'main',
        confidence: null,
        layer: null,
      }),
      'chrona_temporal_state_at',
    );
    assertOk(
      await invokeIpc('chrona_temporal_diff', {
        from: { id: stateAt.asOf ?? latestCommitId },
        to: { id: stateAt.asOf ?? latestCommitId },
        scope: null,
      }),
      'chrona_temporal_diff',
    );
    assertOk(await invokeIpc('chrona_temporal_list_branches', {}), 'chrona_temporal_list_branches');
    assertOk(
      await invokeIpc('chrona_temporal_topology_delta', {
        from: { id: stateAt.asOf ?? latestCommitId },
        to: { id: stateAt.asOf ?? latestCommitId },
      }),
      'chrona_temporal_topology_delta',
    );
    assertOk(
      await invokeIpc('chrona_temporal_commit_changes', {
        branch: 'main',
        parent: null,
        author: 'e2e',
        time: null,
        message: 'e2e commit',
        tags: [],
        changes: {
          nodeCreates: [
            {
              id: nextId('commit-node'),
              type: 'Capability',
              props: { name: 'E2E Commit Node' },
            },
          ],
          nodeUpdates: [],
          nodeDeletes: [],
          edgeCreates: [],
          edgeUpdates: [],
          edgeDeletes: [],
        },
      }),
      'chrona_temporal_commit_changes',
    );
    assertOkOrError(
      await invokeIpc('chrona_temporal_create_branch', {
        name: nextId('branch'),
        from: null,
      }),
      'chrona_temporal_create_branch',
    );
    assertOkOrError(
      await invokeIpc('chrona_temporal_merge_branches', {
        source: 'main',
        target: 'main',
      }),
      'chrona_temporal_merge_branches',
    );

    assertOk(
      await invokeIpc('mneme_store_upsert_metamodel_batch', {
        partitionId: ids.partitionId,
        actorId: ids.actorId,
        assertedAt,
        batch: {
          types: [
            {
              type_id: ids.typeNodeId,
              applies_to: 'Node',
              label: 'Capability',
              is_abstract: false,
              parent_type_id: null,
            },
            {
              type_id: ids.typeEdgeId,
              applies_to: 'Edge',
              label: 'relates',
              is_abstract: false,
              parent_type_id: null,
            },
          ],
          fields: [
            {
              field_id: ids.fieldId,
              label: 'name',
              value_type: 'Str',
              cardinality_multi: false,
              merge_policy: 'Lww',
              is_indexed: true,
              disallow_overlap: false,
            },
          ],
          type_fields: [
            {
              type_id: ids.typeNodeId,
              field_id: ids.fieldId,
              is_required: false,
              default_value: null,
              override_default: false,
              tighten_required: false,
              disallow_overlap: null,
            },
          ],
          edge_type_rules: [
            {
              edge_type_id: ids.typeEdgeId,
              allowed_src_type_ids: [ids.typeNodeId],
              allowed_dst_type_ids: [ids.typeNodeId],
              semantic_direction: 'out',
            },
          ],
          metamodel_version: 'e2e',
          metamodel_source: 'e2e',
        },
        scenarioId: null,
      }),
      'mneme_store_upsert_metamodel_batch',
    );
    assertOk(
      await invokeIpc('mneme_store_compile_effective_schema', {
        partitionId: ids.partitionId,
        actorId: ids.actorId,
        assertedAt,
        typeId: ids.typeNodeId,
        scenarioId: null,
      }),
      'mneme_store_compile_effective_schema',
    );
    assertOk(
      await invokeIpc('mneme_store_get_effective_schema', {
        partitionId: ids.partitionId,
        typeId: ids.typeNodeId,
      }),
      'mneme_store_get_effective_schema',
    );
    assertOk(
      await invokeIpc('mneme_store_list_edge_type_rules', {
        partitionId: ids.partitionId,
        edgeTypeId: null,
      }),
      'mneme_store_list_edge_type_rules',
    );
    assertOk(
      await invokeIpc('mneme_store_create_node', {
        partitionId: ids.partitionId,
        scenarioId: null,
        actorId: ids.actorId,
        assertedAt,
        nodeId: ids.nodeA,
        typeId: ids.typeNodeId,
        aclGroupId: null,
        ownerActorId: null,
        visibility: null,
      }),
      'mneme_store_create_node',
    );
    assertOk(
      await invokeIpc('mneme_store_create_node', {
        partitionId: ids.partitionId,
        scenarioId: null,
        actorId: ids.actorId,
        assertedAt,
        nodeId: ids.nodeB,
        typeId: ids.typeNodeId,
        aclGroupId: null,
        ownerActorId: null,
        visibility: null,
      }),
      'mneme_store_create_node',
    );
    assertOk(
      await invokeIpc('mneme_store_create_edge', {
        partitionId: ids.partitionId,
        scenarioId: null,
        actorId: ids.actorId,
        assertedAt,
        edgeId: ids.edgeId,
        typeId: ids.typeEdgeId,
        srcId: ids.nodeA,
        dstId: ids.nodeB,
        existsValidFrom: validTime,
        existsValidTo: null,
        layer: null,
        weight: null,
        aclGroupId: null,
        ownerActorId: null,
        visibility: null,
      }),
      'mneme_store_create_edge',
    );
    assertOk(
      await invokeIpc('mneme_store_set_edge_existence_interval', {
        partitionId: ids.partitionId,
        scenarioId: null,
        actorId: ids.actorId,
        assertedAt,
        edgeId: ids.edgeId,
        validFrom: validTime,
        validTo: null,
        layer: null,
        isTombstone: false,
      }),
      'mneme_store_set_edge_existence_interval',
    );
    assertOk(
      await invokeIpc('mneme_store_set_property_interval', {
        partitionId: ids.partitionId,
        scenarioId: null,
        actorId: ids.actorId,
        assertedAt,
        entityId: ids.nodeA,
        fieldId: ids.fieldId,
        value: { Str: 'Node A' },
        validFrom: validTime,
        validTo: null,
        layer: null,
      }),
      'mneme_store_set_property_interval',
    );
    assertOk(
      await invokeIpc('mneme_store_clear_property_interval', {
        partitionId: ids.partitionId,
        scenarioId: null,
        actorId: ids.actorId,
        assertedAt,
        entityId: ids.nodeA,
        fieldId: ids.fieldId,
        validFrom: validTime,
        validTo: null,
        layer: null,
      }),
      'mneme_store_clear_property_interval',
    );
    assertOkOrError(
      await invokeIpc('mneme_store_or_set_update', {
        partitionId: ids.partitionId,
        scenarioId: null,
        actorId: ids.actorId,
        assertedAt,
        entityId: ids.nodeA,
        fieldId: ids.fieldId,
        op: 'Add',
        element: { Str: 'tag-a' },
        validFrom: validTime,
        validTo: null,
        layer: null,
      }),
      'mneme_store_or_set_update',
    );
    assertOkOrError(
      await invokeIpc('mneme_store_counter_update', {
        partitionId: ids.partitionId,
        scenarioId: null,
        actorId: ids.actorId,
        assertedAt,
        entityId: ids.nodeA,
        fieldId: ids.fieldId,
        delta: 1,
        validFrom: validTime,
        validTo: null,
        layer: null,
      }),
      'mneme_store_counter_update',
    );
    assertOk(
      await invokeIpc('mneme_store_read_entity_at_time', {
        partitionId: ids.partitionId,
        scenarioId: null,
        entityId: ids.nodeA,
        at: validTime,
        asOfAssertedAt: null,
        fieldIds: null,
        includeDefaults: true,
      }),
      'mneme_store_read_entity_at_time',
    );
    assertOk(
      await invokeIpc('mneme_store_traverse_at_time', {
        partitionId: ids.partitionId,
        scenarioId: null,
        fromEntityId: ids.nodeA,
        direction: 'Out',
        edgeTypeId: null,
        at: validTime,
        asOfAssertedAt: null,
        limit: 10,
      }),
      'mneme_store_traverse_at_time',
    );
    assertOk(
      await invokeIpc('mneme_store_list_entities', {
        partitionId: ids.partitionId,
        scenarioId: null,
        kind: 'Node',
        typeId: ids.typeNodeId,
        at: validTime,
        asOfAssertedAt: null,
        filters: [
          {
            fieldId: ids.fieldId,
            op: 'Eq',
            value: { Str: 'Node A' },
          },
        ],
        limit: 25,
        cursor: null,
      }),
      'mneme_store_list_entities',
    );
    assertOk(
      await invokeIpc('mneme_store_get_changes_since', {
        partitionId: ids.partitionId,
        fromSequence: null,
        limit: 50,
      }),
      'mneme_store_get_changes_since',
    );
    const subscription = assertOk(
      await invokeIpc('mneme_store_subscribe_partition', {
        partitionId: ids.partitionId,
        fromSequence: null,
        eventName: 'mneme_change_event',
      }),
      'mneme_store_subscribe_partition',
    );
    assertOk(
      await invokeIpc('mneme_store_unsubscribe_partition', {
        subscriptionId: subscription.subscriptionId,
      }),
      'mneme_store_unsubscribe_partition',
    );
    assertOk(
      await invokeIpc('mneme_store_get_projection_edges', {
        partitionId: ids.partitionId,
        scenarioId: null,
        asOfValidTime: null,
        asOfAssertedAt: null,
        edgeTypeFilter: null,
        limit: 25,
      }),
      'mneme_store_get_projection_edges',
    );
    assertOk(
      await invokeIpc('mneme_store_get_graph_degree_stats', {
        partitionId: ids.partitionId,
        scenarioId: null,
        asOfValidTime: null,
        entityIds: null,
        limit: 25,
      }),
      'mneme_store_get_graph_degree_stats',
    );
    assertOk(
      await invokeIpc('mneme_store_get_graph_edge_type_counts', {
        partitionId: ids.partitionId,
        scenarioId: null,
        edgeTypeIds: null,
        limit: 25,
      }),
      'mneme_store_get_graph_edge_type_counts',
    );
    const pagerank = assertOk(
      await invokeIpc('mneme_store_store_pagerank_scores', {
        partitionId: ids.partitionId,
        actorId: ids.actorId,
        assertedAt,
        asOfValidTime: null,
        asOfAssertedAt: null,
        params: {
          damping: 0.85,
          maxIters: 20,
          tol: 0.0001,
          personalisedSeed: null,
        },
        scores: [
          {
            id: ids.nodeA,
            score: 0.5,
          },
        ],
        scenarioId: null,
      }),
      'mneme_store_store_pagerank_scores',
    );
    assertOk(
      await invokeIpc('mneme_store_get_pagerank_scores', {
        partitionId: ids.partitionId,
        runId: pagerank.runId,
        topN: 10,
      }),
      'mneme_store_get_pagerank_scores',
    );
    assertOk(
      await invokeIpc('mneme_store_export_ops', {
        partitionId: ids.partitionId,
        scenarioId: null,
        sinceAssertedAt: null,
        limit: 100,
      }),
      'mneme_store_export_ops',
    );
    assertOk(
      await invokeIpc('mneme_store_ingest_ops', {
        partitionId: ids.partitionId,
        scenarioId: null,
        ops: [],
      }),
      'mneme_store_ingest_ops',
    );
    assertOk(
      await invokeIpc('mneme_store_get_partition_head', {
        partitionId: ids.partitionId,
        scenarioId: null,
      }),
      'mneme_store_get_partition_head',
    );
    assertOkOrError(
      await invokeIpc('mneme_store_create_scenario', {
        partitionId: ids.partitionId,
        actorId: ids.actorId,
        assertedAt,
        name: ids.scenarioId,
      }),
      'mneme_store_create_scenario',
    );
    assertOkOrError(
      await invokeIpc('mneme_store_delete_scenario', {
        partitionId: ids.partitionId,
        actorId: ids.actorId,
        assertedAt,
        scenarioId: ids.scenarioId,
      }),
      'mneme_store_delete_scenario',
    );
    assertOk(
      await invokeIpc('mneme_store_export_ops_stream', {
        partitionId: ids.partitionId,
        scenarioId: null,
        sinceAssertedAt: null,
        untilAssertedAt: null,
        includeSchema: true,
        includeDataOps: true,
        includeScenarios: true,
      }),
      'mneme_store_export_ops_stream',
    );
    assertOk(
      await invokeIpc('mneme_store_import_ops_stream', {
        targetPartition: ids.partitionId,
        scenarioId: null,
        allowPartitionCreate: true,
        remapActorIds: null,
        strictSchema: false,
        records: [],
      }),
      'mneme_store_import_ops_stream',
    );
    assertOk(
      await invokeIpc('mneme_store_export_snapshot_stream', {
        partitionId: ids.partitionId,
        scenarioId: null,
        asOfAssertedAt: assertedAt,
        includeFacts: true,
        includeEntities: true,
      }),
      'mneme_store_export_snapshot_stream',
    );
    assertOk(
      await invokeIpc('mneme_store_import_snapshot_stream', {
        targetPartition: emptyPartitionId,
        scenarioId: null,
        allowPartitionCreate: true,
        remapActorIds: null,
        strictSchema: false,
        records: [
          {
            record_type: 'snapshot_header',
            data: {
              partition_id: emptyPartitionId,
              scenario_id: null,
              as_of_asserted_at: 1,
            },
          },
          {
            record_type: 'snapshot_footer',
            data: { complete: true },
          },
        ],
      }),
      'mneme_store_import_snapshot_stream',
    );
    assertOk(
      await invokeIpc('mneme_store_upsert_validation_rules', {
        partitionId: ids.partitionId,
        actorId: ids.actorId,
        assertedAt,
        rules: [],
      }),
      'mneme_store_upsert_validation_rules',
    );
    assertOk(
      await invokeIpc('mneme_store_list_validation_rules', {
        partitionId: ids.partitionId,
      }),
      'mneme_store_list_validation_rules',
    );
    assertOk(
      await invokeIpc('mneme_store_upsert_computed_rules', {
        partitionId: ids.partitionId,
        actorId: ids.actorId,
        assertedAt,
        rules: [],
      }),
      'mneme_store_upsert_computed_rules',
    );
    assertOk(
      await invokeIpc('mneme_store_list_computed_rules', {
        partitionId: ids.partitionId,
      }),
      'mneme_store_list_computed_rules',
    );
    assertOk(
      await invokeIpc('mneme_store_upsert_computed_cache', {
        partitionId: ids.partitionId,
        entries: [],
      }),
      'mneme_store_upsert_computed_cache',
    );
    assertOk(
      await invokeIpc('mneme_store_list_computed_cache', {
        partitionId: ids.partitionId,
        entityId: null,
        fieldId: ids.fieldId,
        atValidTime: null,
        limit: 25,
      }),
      'mneme_store_list_computed_cache',
    );
    assertOk(
      await invokeIpc('mneme_store_trigger_rebuild_effective_schema', {
        partitionId: ids.partitionId,
        scenarioId: null,
        reason: 'e2e rebuild',
      }),
      'mneme_store_trigger_rebuild_effective_schema',
    );
    assertOk(
      await invokeIpc('mneme_store_trigger_refresh_integrity', {
        partitionId: ids.partitionId,
        scenarioId: null,
        reason: 'e2e integrity',
      }),
      'mneme_store_trigger_refresh_integrity',
    );
    assertOk(
      await invokeIpc('mneme_store_trigger_refresh_analytics_projections', {
        partitionId: ids.partitionId,
        scenarioId: null,
        reason: 'e2e analytics',
      }),
      'mneme_store_trigger_refresh_analytics_projections',
    );
    assertOk(
      await invokeIpc('mneme_store_trigger_retention', {
        partitionId: ids.partitionId,
        scenarioId: null,
        policy: {
          keepOpsDays: null,
          keepFactsDays: null,
          keepFailedJobsDays: null,
          keepPagerankRunsDays: null,
        },
        reason: 'e2e retention',
      }),
      'mneme_store_trigger_retention',
    );
    assertOk(
      await invokeIpc('mneme_store_trigger_compaction', {
        partitionId: ids.partitionId,
        scenarioId: null,
        reason: 'e2e compaction',
      }),
      'mneme_store_trigger_compaction',
    );
    assertOkOrError(
      await invokeIpc('mneme_store_run_processing_worker', {
        maxJobs: 1,
        leaseMillis: 1000,
      }),
      'mneme_store_run_processing_worker',
    );
    assertOk(
      await invokeIpc('mneme_store_list_jobs', {
        partitionId: ids.partitionId,
        status: null,
        limit: 25,
      }),
      'mneme_store_list_jobs',
    );
    assertOk(
      await invokeIpc('mneme_store_get_integrity_head', {
        partitionId: ids.partitionId,
        scenarioId: null,
      }),
      'mneme_store_get_integrity_head',
    );
    assertOk(
      await invokeIpc('mneme_store_get_last_schema_compile', {
        partitionId: ids.partitionId,
        typeId: ids.typeNodeId,
      }),
      'mneme_store_get_last_schema_compile',
    );
    assertOk(
      await invokeIpc('mneme_store_list_failed_jobs', {
        partitionId: ids.partitionId,
        limit: 25,
      }),
      'mneme_store_list_failed_jobs',
    );
    assertOk(
      await invokeIpc('mneme_store_get_schema_manifest', {
        partitionId: ids.partitionId,
      }),
      'mneme_store_get_schema_manifest',
    );
    assertOkOrError(
      await invokeIpc('mneme_store_explain_resolution', {
        partitionId: ids.partitionId,
        scenarioId: null,
        entityId: ids.nodeA,
        fieldId: ids.fieldId,
        at: validTime,
        asOfAssertedAt: null,
      }),
      'mneme_store_explain_resolution',
    );
    assertOkOrError(
      await invokeIpc('mneme_store_explain_traversal', {
        partitionId: ids.partitionId,
        scenarioId: null,
        edgeId: ids.edgeId,
        at: validTime,
        asOfAssertedAt: null,
      }),
      'mneme_store_explain_traversal',
    );
    assertOk(
      await invokeIpc('mneme_store_tombstone_entity', {
        partitionId: ids.partitionId,
        scenarioId: null,
        actorId: ids.actorId,
        assertedAt,
        entityId: ids.nodeB,
      }),
      'mneme_store_tombstone_entity',
    );

    const manifestRaw = await fs.readFile(
      path.resolve(process.cwd(), 'docs/contracts/ipc-manifest.json'),
      'utf8',
    );
    const manifest = JSON.parse(manifestRaw);
    const missing = manifest.commands.filter((command) => !invokedCommands.has(command));
    assert.equal(
      missing.length,
      0,
      missing.length ? `Missing command coverage: ${missing.join(', ')}` : undefined,
    );
  });
});
