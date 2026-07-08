import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/adapters/ipc', () => ({ invokeIpc: vi.fn() }));
vi.mock('@tauri-apps/api/event', () => ({ listen: vi.fn() }));

import { invokeIpc } from '@/adapters/ipc';
import type { NodeRecord, WorkspaceStatus } from '@/adapters/ipc-bindings.gen';
import { WorkspaceFoundationPanel } from '@/aideon/workspace/workspace-foundation-panel';

const invokeMock = vi.mocked(invokeIpc);

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
 * Route the mocked IPC boundary per command.
 * @param nodes - Node listing the host returns.
 */
function mockHost(nodes: NodeRecord[]) {
  invokeMock.mockImplementation((command: string) => {
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

/**
 * Type a folder path and click the given lifecycle button.
 * @param action - Which lifecycle button to press.
 */
async function openWorkspace(action: 'Create' | 'Open') {
  await userEvent.type(screen.getByLabelText('Workspace folder'), '/Users/demo/workspaces/demo');
  await userEvent.click(screen.getByRole('button', { name: action }));
}

describe('WorkspaceFoundationPanel', () => {
  beforeEach(() => {
    invokeMock.mockReset();
  });

  it('starts closed with lifecycle controls only', () => {
    render(<WorkspaceFoundationPanel />);
    expect(screen.getByLabelText('Workspace folder')).toBeInTheDocument();
    expect(screen.queryByText('Foundation status')).not.toBeInTheDocument();
  });

  it('opens a workspace and lists the derived twin', async () => {
    mockHost(NODES);
    render(<WorkspaceFoundationPanel />);
    await openWorkspace('Open');

    await waitFor(() => {
      expect(screen.getByText('Foundation status')).toBeInTheDocument();
    });
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByRole('list', { name: 'Node list' }).children).toHaveLength(2);
    expect(screen.getByText('tombstoned')).toBeInTheDocument();
    expect(invokeMock).toHaveBeenCalledWith('workspace_open', {
      root: '/Users/demo/workspaces/demo',
    });
  });

  it('creates a workspace then authors a node through the boundary', async () => {
    mockHost([]);
    render(<WorkspaceFoundationPanel />);
    await openWorkspace('Create');

    await waitFor(() => {
      expect(screen.getByText(/No nodes yet/)).toBeInTheDocument();
    });
    mockHost(NODES);
    await userEvent.click(screen.getByRole('button', { name: 'Add node' }));
    await waitFor(() => {
      expect(invokeMock).toHaveBeenCalledWith('workspace_author_node', {});
    });
    expect(screen.getByRole('list', { name: 'Node list' }).children).toHaveLength(2);
  });

  it('shows an honest error state when the host refuses', async () => {
    invokeMock.mockRejectedValue(new Error('the workspace is open in another process'));
    render(<WorkspaceFoundationPanel />);
    await openWorkspace('Open');

    await waitFor(() => {
      expect(screen.getByText('Workspace operation failed')).toBeInTheDocument();
    });
    expect(screen.getByText('the workspace is open in another process')).toBeInTheDocument();
    expect(screen.queryByText('Foundation status')).not.toBeInTheDocument();
  });
});
