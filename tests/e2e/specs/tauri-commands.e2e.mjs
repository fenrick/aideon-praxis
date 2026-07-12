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

// Returns 'main' when evaluated inside the Tauri main window, otherwise the
// actual label or undefined. Tauri window metadata is the primary source
// (set at window-creation time, before React mounts); URL pathname is the fallback.
// Called inside browser.execute(), so the function body runs in the webview.
function getWindowId() {
  const label = window.__TAURI_INTERNALS__?.metadata?.currentWindow?.label;
  if (label) return label;
  const p = window.location.pathname || '';
  if (p === '/' || p === '' || p === '/index.html') return 'main';
  return undefined;
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
  // Verify using Tauri window label ('main') — set at window-creation time and
  // therefore stable even before React mounts. URL pathname is the fallback.
  if (mainWindowHandle) {
    try {
      await browser.switchToWindow(mainWindowHandle);
      const id = await browser.execute(getWindowId);
      if (id === 'main') return;
    } catch {
      // stale or closed handle — fall through to re-scan
    }
    mainWindowHandle = undefined;
  }
  // Re-find the main window by label / pathname.
  const handles = await browser.getWindowHandles();
  if (handles.length === 0) {
    throw new Error('no window handles available');
  }
  for (let i = handles.length - 1; i >= 0; i -= 1) {
    try {
      await browser.switchToWindow(handles[i]);
      const id = await browser.execute(getWindowId);
      if (id === 'main') {
        mainWindowHandle = handles[i];
        return;
      }
    } catch {
      continue;
    }
  }
  throw new Error('no main window found among open handles');
}

// Wait until the main window's shell content is rendered, then switch to it
// and pin the handle in mainWindowHandle so ensureActiveWindow() always returns
// to this window instead of scanning and potentially landing on the splash window.
//
// Identification: Tauri window label 'main' (primary, stable before React mounts)
// with URL pathname '/' as fallback. DOM-content check confirms shell is ready.
async function waitForMainWindow() {
  await browser.waitUntil(
    async () => {
      const handles = await browser.getWindowHandles();
      for (let i = handles.length - 1; i >= 0; i -= 1) {
        try {
          await browser.switchToWindow(handles[i]);
          // Identify the main window by Tauri label or URL pathname.
          const id = await browser.execute(getWindowId);
          if (id !== 'main') continue;
          // Confirm shell content is rendered — verifies React + IPC are up.
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
      timeoutMsg: 'main window shell content did not appear within 60 s',
    },
  );
  await browser.switchToWindow(mainWindowHandle);
}

// Wait until only the main window remains open (splash has fully closed).
//
// On WebKitGTK, the WebDriver execute/sync endpoint sometimes routes to a
// different webview than the one set by switchToWindow when multiple windows
// exist simultaneously. Once only one window handle remains, there is no
// routing ambiguity — all execute() calls must go to the main window.
// Call this before any appcommands-mutating invocations.
async function waitForSplashClosed() {
  await browser.waitUntil(
    async () => {
      const handles = await browser.getWindowHandles();
      return handles.length === 1;
    },
    {
      timeout: 15_000,
      timeoutMsg: 'splash window did not close within 15 s of shell content appearing',
    },
  );
  const [handle] = await browser.getWindowHandles();
  mainWindowHandle = handle;
  await browser.switchToWindow(handle);
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
    // Block until splash is fully closed. On WebKitGTK, execute/sync sometimes
    // routes to a different webview when multiple windows are open simultaneously.
    // Once only one handle exists there is no routing ambiguity.
    await waitForSplashClosed();

    const hasInvoke = await browser.execute(
      () => typeof window.__TAURI_INTERNALS__?.invoke === 'function',
    );
    assert.equal(hasInvoke, true, 'expected tauri internals invoke to be available');

    const ids = {
      nodeA: nextId('node-a'),
      nodeB: nextId('node-b'),
      widgetId: nextId('widget'),
      docId: nextId('doc'),
    };

    assertOk(await invokeIpc('system_worker_health', {}), 'system_worker_health');

    // system_logging_context and system_metrics_snapshot bypass the IpcRequest/IpcResponse
    // envelope — they are raw Tauri commands returning their payload directly (not wrapped
    // in IpcResponse<T>). Invoke via invokeCommand (no envelope wrapper) and assert the
    // JS promise resolved rather than threw.
    const loggingCtx = await invokeCommand('system_logging_context', {});
    assert.equal(loggingCtx.ok, true, loggingCtx.error ?? 'system_logging_context failed');
    const metricsSnap = await invokeCommand('system_metrics_snapshot', {});
    assert.equal(metricsSnap.ok, true, metricsSnap.error ?? 'system_metrics_snapshot failed');

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

    // Workspace lifecycle — independent of the in-process WorkerState used by
    // chrona/praxis, so these calls do not affect the engine commands above.
    // workspace_create writes a real workspace to /tmp; ok-or-error is used
    // because create may fail in constrained CI environments.
    assertOkOrError(
      await invokeIpc('workspace_create', { root: `/tmp/e2e-wksp-${nextId('wksp')}` }),
      'workspace_create',
    );
    assertOkOrError(await invokeIpc('workspace_status', {}), 'workspace_status');
    assertOkOrError(await invokeIpc('workspace_rebuild', {}), 'workspace_rebuild');
    assertOkOrError(await invokeIpc('workspace_close', {}), 'workspace_close');
    // workspace_open with a non-existent path exercises the command over the
    // real bridge; a WORKSPACE_NOT_FOUND error response is a valid outcome.
    assertOkOrError(
      await invokeIpc('workspace_open', { root: '/tmp/e2e-wksp-nonexistent' }),
      'workspace_open',
    );

    // M1–M3 authoring/temporal surface (metamodel-typed authoring, plan/actual
    // claims, viewpoint resolution + diff). ok-or-error: with no open workspace
    // most return WORKSPACE_NOT_OPEN — a valid outcome that still exercises the
    // command over the real bridge.
    assertOkOrError(await invokeIpc('workspace_metamodel_types', {}), 'workspace_metamodel_types');
    assertOkOrError(await invokeIpc('workspace_nodes', {}), 'workspace_nodes');
    assertOkOrError(
      await invokeIpc('workspace_author_node', { typeId: null }),
      'workspace_author_node',
    );
    assertOkOrError(
      await invokeIpc('workspace_author_typed_node', { typeId: 'Capability', props: {} }),
      'workspace_author_typed_node',
    );
    assertOkOrError(
      await invokeIpc('workspace_set_claim', {
        entityId: '00000000-0000-4000-8000-000000000000',
        typeId: 'Capability',
        attribute: 'tier',
        value: 'Strategic',
        layer: 'plan',
        validFrom: 0,
        validTo: null,
      }),
      'workspace_set_claim',
    );
    assertOkOrError(
      await invokeIpc('workspace_state_at', { asOf: 0, layers: ['actual', 'plan'] }),
      'workspace_state_at',
    );
    assertOkOrError(
      await invokeIpc('workspace_diff', {
        before: { asOf: 0, layers: ['actual', 'plan'] },
        after: { asOf: 1, layers: ['actual', 'plan'] },
      }),
      'workspace_diff',
    );

    // -------------------------------------------------------------------------
    // Manifest parity guards
    //
    // The authoritative IPC surface is ipc-manifest.json. Two invariants:
    // 1. Every manifest command is exercised — no registered command is silently
    //    dropped from the e2e gate.
    // 2. No invoked command is absent from the manifest — guards against aspirational
    //    calls referencing commands not yet implemented and registered.
    //    (mvp-command-registry.md is design intent; ipc-manifest.json is the
    //    current executable surface.)
    // -------------------------------------------------------------------------
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

    const aspirational = [...invokedCommands].filter(
      (command) => !manifest.commands.includes(command),
    );
    assert.equal(
      aspirational.length,
      0,
      aspirational.length
        ? `Commands invoked but absent from ipc-manifest.json: ${aspirational.join(', ')}`
        : undefined,
    );
  });
});
