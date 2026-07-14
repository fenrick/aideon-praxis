import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, mocked, userEvent } from 'storybook/test';

import { invokeIpc } from '@/adapters/ipc';
import type {
  EdgeRecord,
  MetaTypeInfo,
  NodeRecord,
  PropertyDelta,
  ResolvedEntity,
  WorkspaceStatus,
} from '@/adapters/ipc-bindings.gen';

import { WorkspaceFoundationPanel } from './workspace-foundation-panel';

const STATUS: WorkspaceStatus = {
  workspaceId: '9b2f8a10-4c6e-4f5a-9d38-1f4b74a4d001',
  partitionId: '9b2f8a10-4c6e-4f5a-9d38-1f4b74a4d002',
  workspaceFormatVersion: 1,
  appliedOpCount: 3,
  foundationRebuildHash: 'a'.repeat(64),
};

// The generated wire type carries `null` for an absent field (serde Option).
// eslint-disable-next-line unicorn/no-null
const NONE: string | null = null;

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
    nodeId: '11111111-0000-4000-8000-000000000003',
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
    nodeId: '11111111-0000-4000-8000-000000000003',
    typeLabel: 'Capability',
    properties: [
      { field: 'name', value: 'Customer Insight', layer: 'plan' },
      { field: 'tier', value: 'Strategic', layer: 'actual' },
    ],
  },
];

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
  const authoredNode = () => Promise.resolve(nodes[0]);
  return new Map<string, () => Promise<unknown>>([
    ['workspace_create', resolveStatus],
    ['workspace_open', resolveStatus],
    ['workspace_status', resolveStatus],
    ['workspace_nodes', () => Promise.resolve(nodes)],
    ['workspace_edges', () => Promise.resolve(nodes.length > 0 ? EDGES : [])],
    ['workspace_author_typed_edge', () => Promise.resolve(EDGES[0])],
    ['workspace_metamodel_types', () => Promise.resolve(TYPES)],
    ['workspace_state_at', () => Promise.resolve(nodes.length > 0 ? RESOLVED : [])],
    ['workspace_diff', () => Promise.resolve(DELTAS)],
    ['workspace_set_claim', () => Promise.resolve()],
    ['workspace_author_node', authoredNode],
    ['workspace_author_typed_node', authoredNode],
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
  },
};

export const AuthorTypedEntity: Story = {
  name: 'Author a typed entity',
  beforeEach: () => {
    mockHost([]);
  },
  play: async ({ canvas }) => {
    await userEvent.type(canvas.getByLabelText('Workspace folder'), '/Users/demo/workspaces/demo');
    await userEvent.click(canvas.getByRole('button', { name: 'Create' }));
    await expect(await canvas.findByText(/No entities yet/)).toBeVisible();

    // Pick a type from the seed metamodel palette, fill required name, create.
    await userEvent.click(canvas.getByLabelText('Entity type'));
    await userEvent.click(await canvas.findByRole('option', { name: 'Capability' }));
    await userEvent.type(canvas.getByLabelText('name'), 'Customer Insight');
    await userEvent.click(canvas.getByRole('button', { name: /Create Capability/ }));
    await expect(canvas.getByRole('button', { name: /Create Capability/ })).toBeVisible();
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
