import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, mocked, userEvent } from 'storybook/test';

import { invokeIpc } from '@/adapters/ipc';
import type { NodeRecord, WorkspaceStatus } from '@/adapters/ipc-bindings.gen';

import { WorkspaceFoundationPanel } from './workspace-foundation-panel';

const STATUS: WorkspaceStatus = {
  workspaceId: '9b2f8a10-4c6e-4f5a-9d38-1f4b74a4d001',
  partitionId: '9b2f8a10-4c6e-4f5a-9d38-1f4b74a4d002',
  workspaceFormatVersion: 1,
  appliedOpCount: 3,
  foundationRebuildHash: 'a'.repeat(64),
};

// The generated wire type carries `null` for an absent typeId (serde Option).
// eslint-disable-next-line unicorn/no-null
const NO_TYPE: string | null = null;

const NODES: NodeRecord[] = [
  { nodeId: '11111111-0000-4000-8000-000000000003', typeId: NO_TYPE, tombstoned: false },
  { nodeId: '11111111-0000-4000-8000-000000000004', typeId: NO_TYPE, tombstoned: true },
];

/**
 * Route mocked IPC responses per command.
 * @param nodes - The node listing to return.
 */
function mockHost(nodes: NodeRecord[]) {
  mocked(invokeIpc).mockImplementation((command: string) => {
    switch (command) {
      case 'workspace_create':
      case 'workspace_open':
      case 'workspace_status': {
        return Promise.resolve(STATUS);
      }
      case 'workspace_nodes': {
        return Promise.resolve(nodes);
      }
      case 'workspace_author_node': {
        return Promise.resolve(nodes[0]);
      }
      default: {
        return Promise.reject(new Error(`unmocked command ${command}`));
      }
    }
  });
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
    await expect(await canvas.findByText(/No nodes yet/)).toBeVisible();
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
