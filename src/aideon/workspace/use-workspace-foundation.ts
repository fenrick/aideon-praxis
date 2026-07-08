import { useCallback, useState } from 'react';

import { invokeIpc } from '@/adapters/ipc';
import type { NodeRecord, WorkspaceStatus } from '@/adapters/ipc-bindings.gen';
import { waitForWorkspaceReady } from '@/adapters/workspace-events';

/** The foundation panel's lifecycle phase. */
export type FoundationPhase = 'closed' | 'busy' | 'open' | 'error';

export interface WorkspaceFoundationState {
  readonly phase: FoundationPhase;
  readonly status: WorkspaceStatus | undefined;
  readonly nodes: readonly NodeRecord[];
  readonly errorMessage: string | undefined;
}

export interface WorkspaceFoundationActions {
  readonly createWorkspace: (root: string) => Promise<void>;
  readonly openWorkspace: (root: string) => Promise<void>;
  readonly authorNode: () => Promise<void>;
  readonly rebuild: () => Promise<void>;
}

/**
 * Read an error's user-facing message without leaking internals.
 * @param error - Whatever the IPC boundary threw.
 */
function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : 'The workspace operation failed.';
}

/**
 * Golden-pattern `[state, actions]` hook over the canonical workspace
 * lifecycle + authoring IPC surface: create/open a workspace, author nodes
 * into the canonical op log, and read the derived twin listing back.
 */
export function useWorkspaceFoundation(): [WorkspaceFoundationState, WorkspaceFoundationActions] {
  const [phase, setPhase] = useState<FoundationPhase>('closed');
  const [status, setStatus] = useState<WorkspaceStatus | undefined>();
  const [nodes, setNodes] = useState<readonly NodeRecord[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | undefined>();

  const refresh = useCallback(async () => {
    const nextStatus = await invokeIpc<WorkspaceStatus>('workspace_status', {});
    const nextNodes = await invokeIpc<NodeRecord[]>('workspace_nodes', {});
    setStatus(nextStatus);
    setNodes(nextNodes);
  }, []);

  const run = useCallback(
    async (operation: () => Promise<void>) => {
      setPhase('busy');
      setErrorMessage(undefined);
      try {
        await operation();
        await refresh();
        setPhase('open');
      } catch (error) {
        setErrorMessage(messageOf(error));
        setPhase('error');
      }
    },
    [refresh],
  );

  const createWorkspace = useCallback(
    async (root: string) => {
      await run(async () => {
        await invokeIpc<WorkspaceStatus>('workspace_create', { root });
      });
    },
    [run],
  );

  const openWorkspace = useCallback(
    async (root: string) => {
      await run(async () => {
        await invokeIpc<WorkspaceStatus>('workspace_open', { root });
      });
    },
    [run],
  );

  const authorNode = useCallback(async () => {
    await run(async () => {
      await invokeIpc<NodeRecord>('workspace_author_node', {});
    });
  }, [run]);

  const rebuild = useCallback(async () => {
    await run(async () => {
      // Accepted work: the command returns immediately; read-write (and the
      // proof-carrying hash) arrives on the readiness event ([ADR-0040]).
      const ready = waitForWorkspaceReady();
      await invokeIpc<unknown>('workspace_rebuild', {});
      await ready;
    });
  }, [run]);

  return [
    { phase, status, nodes, errorMessage },
    { createWorkspace, openWorkspace, authorNode, rebuild },
  ];
}
