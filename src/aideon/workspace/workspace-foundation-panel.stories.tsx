import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, mocked, userEvent, within } from 'storybook/test';

import { invokeIpc } from '@/adapters/ipc';
import type {
  EdgeRecord,
  MetaTypeInfo,
  NodeRecord,
  ObjectInspection,
  PropertyDelta,
  ResolvedEntity,
  RunTerminalEvent,
  WorkspaceStatus,
} from '@/adapters/ipc-bindings.gen';
import { prepareForRunTerminal } from '@/adapters/workspace-events';

import { WorkspaceFoundationPanel } from './workspace-foundation-panel';

const STATUS: WorkspaceStatus = {
  workspaceId: '9b2f8a10-4c6e-4f5a-9d38-1f4b74a4d001',
  partitionId: '9b2f8a10-4c6e-4f5a-9d38-1f4b74a4d002',
  workspaceFormatVersion: 1,
  appliedOpCount: 3,
  foundationRebuildHash: 'a'.repeat(64),
};

// The generated wire type carries JSON null for an absent field (serde Option).
const NONE = JSON.parse('null') as string | null;
const PRIMARY_NODE_ID = '11111111-0000-4000-8000-000000000003';

const TYPES: MetaTypeInfo[] = [
  {
    id: 'Capability',
    label: 'Capability',
    category: 'Business',
    attributes: [
      { name: 'name', required: true, enumValues: [] },
      { name: 'tier', required: false, enumValues: ['Strategic', 'Core', 'Supporting'] },
    ],
  },
];

const NODES: NodeRecord[] = [
  {
    nodeId: PRIMARY_NODE_ID,
    typeId: NONE,
    typeLabel: 'Capability',
    tombstoned: false,
  },
  {
    nodeId: '11111111-0000-4000-8000-000000000004',
    typeId: NONE,
    typeLabel: 'Capability',
    tombstoned: true,
  },
];

const RESOLVED: ResolvedEntity[] = [
  {
    nodeId: PRIMARY_NODE_ID,
    typeLabel: 'Capability',
    properties: [
      { field: 'name', value: 'Customer Insight', layer: 'plan' },
      { field: 'tier', value: 'Strategic', layer: 'actual' },
    ],
  },
];

const INSPECTION: ObjectInspection = {
  objectId: PRIMARY_NODE_ID,
  objectKind: 'entity',
  typeLabel: 'Capability',
  properties: [
    { field: 'name', value: 'Customer Insight', layer: 'plan' },
    { field: 'tier', value: 'Strategic', layer: 'actual' },
  ],
  provenance: {
    changeEventId: '33333333-0000-4000-8000-000000000001',
    transactionOwnerActorId: '44444444-0000-4000-8000-000000000001',
    rationale: 'Model customer insight',
    source: 'desktop.modelling-studio',
    lifecycle: 'applied',
  },
};

const STORY_TERMINAL: RunTerminalEvent = {
  runId: 'run-story-authoring',
  correlationId: 'story-request',
  succeeded: true,
  errorCode: NONE,
};

/** Resolve the deterministic terminal event used by authoring stories. */
function resolveStoryTerminal(): Promise<RunTerminalEvent> {
  return Promise.resolve(STORY_TERMINAL);
}

/** Provide the story implementation of the accepted-work terminal listener. */
function prepareStoryTerminal() {
  return Promise.resolve({ wait: resolveStoryTerminal });
}

const DELTAS: PropertyDelta[] = [
  {
    nodeId: '11111111-0000-4000-8000-000000000003',
    typeLabel: 'Capability',
    field: 'tier',
    before: 'Core',
    after: 'Strategic',
  },
];

const EDGES: EdgeRecord[] = [
  {
    edgeId: '22222222-0000-4000-8000-000000000009',
    typeId: NONE,
    typeLabel: 'realises',
    srcId: '11111111-0000-4000-8000-000000000003',
    dstId: '11111111-0000-4000-8000-000000000004',
    tombstoned: false,
  },
];

/** Resolve the workspace status (shared by the create/open/status commands). */
const resolveStatus = () => Promise.resolve(STATUS);

/**
 * Build the per-command IPC response map for a given node listing.
 * @param nodes - The node listing to return.
 */
function hostResponses(nodes: NodeRecord[]): Map<string, () => Promise<unknown>> {
  return new Map<string, () => Promise<unknown>>([
    ['workspace_create', resolveStatus],
    ['workspace_open', resolveStatus],
    ['workspace_status', resolveStatus],
    ['workspace_nodes', () => Promise.resolve(nodes)],
    ['workspace_edges', () => Promise.resolve(nodes.length > 0 ? EDGES : [])],
    ['workspace_metamodel_types', () => Promise.resolve(TYPES)],
    ['workspace_state_at', () => Promise.resolve(nodes.length > 0 ? RESOLVED : [])],
    ['workspace_inspect_object', () => Promise.resolve(INSPECTION)],
    [
      'workspace_apply_change_event',
      () =>
        Promise.resolve({
          runId: 'run-story-authoring',
          queueClass: 'authoring',
          idempotencyKey: 'story-intent',
          ledgerRef: 'ops/runs/run-story-authoring/run.json',
          acceptedAt: '2026-07-19T00:00:00Z',
        }),
    ],
    ['workspace_diff', () => Promise.resolve(DELTAS)],
    ['workspace_set_claim', () => Promise.resolve()],
  ]);
}

/**
 * Route mocked IPC responses per command.
 * @param nodes - The node listing to return.
 */
function mockHost(nodes: NodeRecord[]) {
  const responses = hostResponses(nodes);
  mocked(invokeIpc).mockImplementation(
    (command: string) =>
      responses.get(command)?.() ?? Promise.reject(new Error(`unmocked command ${command}`)),
  );
  mocked(prepareForRunTerminal).mockImplementation(prepareStoryTerminal);
}

const meta = {
  component: WorkspaceFoundationPanel,
  tags: ['autodocs'],
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof WorkspaceFoundationPanel>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Closed: Story = {};

export const OpenWithNodes: Story = {
  name: 'Open with nodes',
  beforeEach: () => {
    mockHost(NODES);
  },
  play: async ({ canvas }) => {
    await userEvent.type(canvas.getByLabelText('Workspace folder'), '/Users/demo/workspaces/demo');
    await userEvent.click(canvas.getByRole('button', { name: 'Open' }));
    await expect(await canvas.findByText('Foundation status')).toBeVisible();
    await expect(canvas.getByText('3')).toBeVisible();
    const list = await canvas.findByRole('list', { name: 'Node list' });
    await expect(list.children).toHaveLength(2);
    await expect(canvas.getByText('tombstoned')).toBeVisible();
    // Each derived node surfaces its metamodel type label.
    await expect(canvas.getAllByText('Capability').length).toBeGreaterThan(0);
    const inspectButton = canvas.getAllByRole('button', { name: /Inspect Capability/ }).at(0);
    await expect(inspectButton).toBeDefined();
    if (inspectButton !== undefined) {
      await userEvent.click(inspectButton);
    }
    await expect(await canvas.findByText('Model customer insight')).toBeVisible();
  },
};

export const AuthorTypedEntity: Story = {
  name: 'Author a typed entity',
  beforeEach: () => {
    mockHost([]);
  },
  play: async ({ canvas, canvasElement }) => {
    await userEvent.type(canvas.getByLabelText('Workspace folder'), '/Users/demo/workspaces/demo');
    await userEvent.click(canvas.getByRole('button', { name: 'Create' }));
    await expect(await canvas.findByText(/No entities yet/)).toBeVisible();

    // Pick a type from the seed metamodel palette, fill required name, create.
    await userEvent.click(canvas.getByLabelText('Entity type'));
    const documentBody = within(canvasElement.ownerDocument.body);
    await userEvent.click(await documentBody.findByRole('option', { name: 'Capability' }));
    await userEvent.type(canvas.getByLabelText('name'), 'Customer Insight');
    await userEvent.click(canvas.getByRole('button', { name: /Create Capability/ }));
    await expect(await canvas.findByRole('button', { name: 'Create entity' })).toBeVisible();
  },
};

export const OpenEmpty: Story = {
  name: 'Open with no nodes',
  beforeEach: () => {
    mockHost([]);
  },
  play: async ({ canvas }) => {
    await userEvent.type(canvas.getByLabelText('Workspace folder'), '/Users/demo/workspaces/demo');
    await userEvent.click(canvas.getByRole('button', { name: 'Open' }));
    await expect(await canvas.findByText(/No entities yet/)).toBeVisible();
  },
};

export const HostError: Story = {
  name: 'Host error',
  beforeEach: () => {
    mocked(invokeIpc).mockRejectedValue(new Error('the workspace is open in another process'));
  },
  play: async ({ canvas }) => {
    await userEvent.type(canvas.getByLabelText('Workspace folder'), '/Users/demo/workspaces/demo');
    await userEvent.click(canvas.getByRole('button', { name: 'Open' }));
    await expect(await canvas.findByText('Workspace operation failed')).toBeVisible();
    await expect(canvas.getByText('the workspace is open in another process')).toBeVisible();
  },
};
