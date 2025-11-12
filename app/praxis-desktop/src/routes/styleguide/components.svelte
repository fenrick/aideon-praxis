<script lang="ts">
  import {
    Button,
    Checkbox,
    Modal,
    Radio,
    Select,
    Switch,
    TextField,
    ToastHost,
    Toolbar as DsToolbar,
    ToolbarButton,
    Tooltip,
    push as toast,
  } from '@aideon/praxis-design-system';
  import AppToolbar from '$lib/components/Toolbar.svelte';
  import MainView from '$lib/components/MainView.svelte';
  import SidebarComponent from '$lib/components/Sidebar.svelte';
  import type { SidebarTreeNode } from '$lib/components/sidebar.types';
  import type { TimeStoreState } from '$lib/stores/time';
  import type { TemporalCommitSummary, TemporalMergeConflict } from '$lib/types';

  const noOp = () => {};

  const regressionSidebarItems: SidebarTreeNode[] = [
    {
      id: 'workspace',
      label: 'Workspace',
      children: [
        { id: 'workspace-overview', label: 'Overview' },
        { id: 'workspace-timeline', label: 'Timeline' },
      ],
    },
    {
      id: 'plan-events',
      label: 'Plan Events',
      children: [
        { id: 'plan-events-drafts', label: 'Drafts' },
        { id: 'plan-events-merged', label: 'Merged' },
      ],
    },
  ];

  const regressionCommits: TemporalCommitSummary[] = [
    {
      id: 'c0ffee1',
      parents: [],
      branch: 'main',
      message: 'Seed topology',
      tags: [],
      changeCount: 12,
      time: '2024-03-01T08:20:00Z',
    },
    {
      id: 'c0ffee2',
      parents: ['c0ffee1'],
      branch: 'feature/token-refactor',
      message: 'Align renderer palette with tokens',
      tags: ['design'],
      changeCount: 5,
      time: '2024-03-05T13:45:00Z',
    },
  ];

  const regressionConflicts: TemporalMergeConflict[] = [
    {
      reference: 'node:billing-service',
      kind: 'Update',
      message: 'Pending validation against staging snapshot',
    },
  ];

  const regressionTimeState: TimeStoreState = {
    branch: 'feature/token-refactor',
    commits: regressionCommits,
    branches: [
      { name: 'main', head: 'c0ffee1' },
      { name: 'feature/token-refactor', head: 'c0ffee2' },
    ],
    currentCommitId: 'c0ffee2',
    snapshot: null,
    diff: {
      from: 'c0ffee1',
      to: 'c0ffee2',
      metrics: {
        nodeAdds: 3,
        nodeMods: 1,
        nodeDels: 0,
        edgeAdds: 4,
        edgeMods: 2,
        edgeDels: 1,
      },
    },
    isComparing: false,
    compare: { from: null, to: null },
    unsavedCount: 2,
    loading: false,
    error: null,
    lastUpdated: Date.now(),
    mergeConflicts: regressionConflicts,
  };

  const regressionStateAt = {
    asOf: '2024-03-05T13:45:00Z',
    scenario: 'Staging',
    confidence: 0.92,
    nodes: 128,
    edges: 256,
  } as const;

  const regressionSidebarActive = 'plan-events';
  let open = false;
</script>

<section>
  <h2>Buttons</h2>
  <div class="row">
    <Button variant="primary">Primary</Button>
    <Button>Secondary</Button>
    <Button variant="ghost">Ghost</Button>
    <Button variant="danger">Danger</Button>
  </div>
</section>

<section>
  <h2>Fields</h2>
  <div class="grid2">
    <TextField id="name" label="Name" placeholder="Component Name" />
    <Select
      id="type"
      label="Type"
      options={[
        { value: 'app', label: 'Application' },
        { value: 'cap', label: 'Capability' },
      ]}
    />
    <Checkbox id="active" label="Active" />
    <div>
      <Radio name="r1" id="r1a" label="A" value="A" />
      <Radio name="r1" id="r1b" label="B" value="B" />
    </div>
    <Switch id="sw1" label="Enabled" />
  </div>
</section>

<section>
  <h2>Toolbar</h2>
  <DsToolbar title="Demo">
    <Tooltip text="New">
      <ToolbarButton icon="ph:plus" title="New" onClick={() => (open = true)} />
    </Tooltip>
    <div class="separator"></div>
    <Tooltip text="Toast">
      <ToolbarButton icon="ph:bell" title="Toast" onClick={() => toast('Hello from Toast!')} />
    </Tooltip>
  </DsToolbar>
</section>

<section>
  <h2>Renderer Regression</h2>
  <p class="regression-note">
    Token-aligned previews of the desktop shell. Toggle your system theme to verify light and dark
    parity.
  </p>
  <div class="regression-grid">
    <div class="regression-frame">
      <h3>Toolbar</h3>
      <div class="frame-body frame-toolbar">
        <AppToolbar
          version="2024.5.0"
          onOpenSettings={noOp}
          onOpenAbout={noOp}
          onOpenStatus={noOp}
          onToggleSidebar={noOp}
          sidebarActive={true}
          branch={regressionTimeState.branch}
          unsavedCount={regressionTimeState.unsavedCount}
        />
      </div>
    </div>
    <div class="regression-frame">
      <h3>Sidebar</h3>
      <div class="frame-body frame-sidebar">
        <SidebarComponent items={regressionSidebarItems} activeId={regressionSidebarActive} />
      </div>
    </div>
    <div class="regression-frame regression-mainview">
      <h3>Main View</h3>
      <div class="frame-body frame-mainview">
        <MainView
          version="2024.5.0"
          stateAt={regressionStateAt}
          errorMsg={null}
          timeState={regressionTimeState}
        />
      </div>
    </div>
  </div>
</section>

<!-- SplitPane demo temporarily removed from style guide to keep type/lint clean -->

<Modal title="Create Item" {open} onClose={() => (open = false)}>
  <TextField id="n2" label="Name" />
  <div style="display:flex; gap: 8px; justify-content: end; margin-top: 12px;">
    <Button variant="ghost" onClick={() => (open = false)}>Cancel</Button>
    <Button variant="primary" onClick={() => (open = false)}>Create</Button>
  </div>
  <ToastHost />
</Modal>

<style>
  .row {
    display: flex;
    gap: var(--space-2);
    align-items: center;
  }
  .grid2 {
    display: grid;
    grid-template-columns: repeat(2, minmax(220px, 1fr));
    gap: var(--space-4);
  }
  .regression-note {
    margin: 0 0 var(--space-3);
    color: var(--color-muted);
  }
  .regression-grid {
    display: grid;
    gap: var(--space-4);
    grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  }
  .regression-frame {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
    padding: var(--space-3);
    border-radius: var(--radius-2, 10px);
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    box-shadow: var(--shadow-1);
    color: var(--color-text);
  }
  .regression-frame h3 {
    margin: 0;
    font-size: 1rem;
  }
  .frame-body {
    border-radius: var(--radius-2, 10px);
    overflow: hidden;
    background: var(--color-bg);
    border: 1px solid color-mix(in srgb, var(--color-border) 75%, transparent);
  }
  .frame-toolbar :global(.toolbar) {
    position: static;
    border-radius: var(--radius-2, 10px);
    box-shadow: none;
  }
  .frame-sidebar {
    min-height: 220px;
  }
  .frame-sidebar :global(.sidebar) {
    width: 100%;
    height: 100%;
    border-right: none;
    border-radius: var(--radius-2, 10px);
    box-shadow: none;
  }
  .regression-mainview {
    grid-column: span 1;
  }
  .frame-mainview {
    min-height: 520px;
  }
  .frame-mainview :global(.workspace) {
    min-height: 100%;
    border-radius: var(--radius-2, 10px);
  }
  @media (max-width: 900px) {
    .frame-mainview {
      min-height: 420px;
    }
  }
  /* removed unused .pane-eg and .box */
</style>
