import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/adapters/ipc', () => ({ invokeIpc: vi.fn() }));
vi.mock('@tauri-apps/api/event', () => ({ listen: vi.fn() }));

import { invokeIpc } from '@/adapters/ipc';
import type {
  EdgeRecord,
  MetaTypeInfo,
  NodeRecord,
  PropertyDelta,
  ResolvedEntity,
  WorkspaceStatus,
} from '@/adapters/ipc-bindings.gen';
import { WorkspaceFoundationPanel } from '@/aideon/workspace/workspace-foundation-panel';

const invokeMock = vi.mocked(invokeIpc);

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

const RESOLVED: ResolvedEntity[] = [
  {
    nodeId: '11111111-0000-4000-8000-000000000003',
    typeLabel: 'Capability',
    properties: [{ field: 'tier', value: 'Strategic', layer: 'plan' }],
  },
];

const DELTAS: PropertyDelta[] = [
  {
    nodeId: '11111111-0000-4000-8000-000000000003',
    typeLabel: 'Capability',
    field: 'tier',
    before: 'Strategic',
    after: 'Core',
  },
];

/** Resolve the workspace status (shared by the create/open/status commands). */
const resolveStatus = () => Promise.resolve(STATUS);

/**
 * Build the per-command IPC response map for a given node listing.
 * @param nodes - Node listing the host returns.
 */
function hostResponses(nodes: NodeRecord[]): Map<string, () => Promise<unknown>> {
  const authoredNode = () => Promise.resolve(nodes[0]);
  return new Map<string, () => Promise<unknown>>([
    ['workspace_create', resolveStatus],
    ['workspace_open', resolveStatus],
    ['workspace_status', resolveStatus],
    ['workspace_nodes', () => Promise.resolve(nodes)],
    ['workspace_edges', () => Promise.resolve(EDGES)],
    ['workspace_author_typed_edge', () => Promise.resolve(EDGES[0])],
    ['workspace_metamodel_types', () => Promise.resolve(TYPES)],
    ['workspace_state_at', () => Promise.resolve(RESOLVED)],
    ['workspace_diff', () => Promise.resolve(DELTAS)],
    ['workspace_set_claim', () => Promise.resolve()],
    ['workspace_author_node', authoredNode],
    ['workspace_author_typed_node', authoredNode],
  ]);
}

/**
 * Route the mocked IPC boundary per command.
 * @param nodes - Node listing the host returns.
 */
function mockHost(nodes: NodeRecord[]) {
  const responses = hostResponses(nodes);
  invokeMock.mockImplementation(
    (command: string) =>
      responses.get(command)?.() ?? Promise.reject(new Error(`unmocked command ${command}`)),
  );
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

  it('opens a workspace and lists the derived twin with its type', async () => {
    mockHost(NODES);
    render(<WorkspaceFoundationPanel />);
    await openWorkspace('Open');

    await waitFor(() => {
      expect(screen.getByText('Foundation status')).toBeInTheDocument();
    });
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(
      within(screen.getByRole('list', { name: 'Node list' })).getAllByRole('listitem'),
    ).toHaveLength(2);
    expect(screen.getByText('tombstoned')).toBeInTheDocument();
    // The derived listing surfaces each node's metamodel type label.
    expect(screen.getAllByText('Capability').length).toBeGreaterThan(0);
    expect(invokeMock).toHaveBeenCalledWith('workspace_open', {
      root: '/Users/demo/workspaces/demo',
    });
  });

  it('offers the metamodel authoring palette once a workspace is open', async () => {
    mockHost([]);
    render(<WorkspaceFoundationPanel />);
    await openWorkspace('Create');

    await waitFor(() => {
      expect(screen.getByText(/No entities yet/)).toBeInTheDocument();
    });
    // The seed metamodel palette drives a typed authoring form; the create
    // action is gated until a type is chosen. (The pick-and-author interaction
    // is exercised in the Storybook play test, where Radix Select works.)
    expect(screen.getByLabelText('Entity type')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Create entity' })).toBeDisabled();
    expect(invokeMock).toHaveBeenCalledWith('workspace_metamodel_types', {});
  });

  it('lists relationships and gates the edge-authoring form', async () => {
    mockHost(NODES);
    render(<WorkspaceFoundationPanel />);
    await openWorkspace('Open');

    await waitFor(() => {
      expect(screen.getByText('Relationships')).toBeInTheDocument();
    });
    // The derived edge inspector re-derives from the op log.
    const edges = screen.getByRole('list', { name: 'Edge list' });
    expect(within(edges).getAllByRole('listitem')).toHaveLength(1);
    expect(screen.getByText('realises')).toBeInTheDocument();
    expect(invokeMock).toHaveBeenCalledWith('workspace_edges', {});
    // The create action is gated until a verb + both endpoints are chosen.
    // (The pick-and-author interaction is exercised in the Storybook play test.)
    expect(screen.getByLabelText('Relationship')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Create relationship' })).toBeDisabled();
  });

  it('shows an empty relationships state before any edge is authored', async () => {
    invokeMock.mockImplementation((command: string) => {
      switch (command) {
        case 'workspace_create':
        case 'workspace_status': {
          return Promise.resolve(STATUS);
        }
        case 'workspace_metamodel_types': {
          return Promise.resolve(TYPES);
        }
        case 'workspace_state_at': {
          return Promise.resolve([]);
        }
        // No nodes, no edges yet.
        default: {
          return Promise.resolve([]);
        }
      }
    });
    render(<WorkspaceFoundationPanel />);
    await openWorkspace('Create');

    await waitFor(() => {
      expect(screen.getByText(/No relationships yet/)).toBeInTheDocument();
    });
  });

  it('renders the catalogue resolved at a viewpoint with layer provenance', async () => {
    mockHost(NODES);
    render(<WorkspaceFoundationPanel />);
    await openWorkspace('Open');

    await waitFor(() => {
      expect(screen.getByText('Catalogue at a viewpoint')).toBeInTheDocument();
    });
    const rows = screen.getByRole('list', { name: 'Catalogue rows' });
    expect(rows).toBeInTheDocument();
    // The resolved slot shows its value and the layer it resolved from.
    expect(screen.getByText('Strategic')).toBeInTheDocument();
    expect(screen.getAllByText('plan').length).toBeGreaterThan(0);
    // The catalogue resolves at the default viewpoint (actual over plan, as-of 0).
    expect(invokeMock).toHaveBeenCalledWith('workspace_state_at', {
      asOf: 0,
      layers: ['actual', 'plan'],
    });
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
