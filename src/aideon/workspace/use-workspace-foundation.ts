import { useCallback, useRef, useState } from 'react';

import { invokeIpc } from '@/adapters/ipc';
import type {
  MetaTypeInfo,
  NodeRecord,
  PropertyDelta,
  ResolvedEntity,
  Viewpoint,
  WorkspaceStatus,
} from '@/adapters/ipc-bindings.gen';
import { waitForWorkspaceReady } from '@/adapters/workspace-events';

/** The foundation panel's lifecycle phase. */
export type FoundationPhase = 'closed' | 'busy' | 'open' | 'error';

/** One temporal claim to assert (a plan or actual value over an interval). */
export interface ClaimInput {
  readonly entityId: string;
  readonly typeId: string;
  readonly attribute: string;
  readonly value: string;
  readonly layer: string;
  readonly validFrom: number;
  /** `undefined` for an open-ended interval (serialises to an absent field). */
  readonly validTo: number | undefined;
}

export interface WorkspaceFoundationState {
  readonly phase: FoundationPhase;
  readonly status: WorkspaceStatus | undefined;
  readonly nodes: readonly NodeRecord[];
  /** The seed metamodel's authorable entity types (the authoring palette). */
  readonly metamodelTypes: readonly MetaTypeInfo[];
  /** The viewpoint the catalogue currently resolves at. */
  readonly viewpoint: Viewpoint;
  /** The twin resolved at `viewpoint` — the catalogue artefact rows. */
  readonly resolved: readonly ResolvedEntity[];
  readonly errorMessage: string | undefined;
}

export interface WorkspaceFoundationActions {
  readonly createWorkspace: (root: string) => Promise<void>;
  readonly openWorkspace: (root: string) => Promise<void>;
  readonly authorNode: () => Promise<void>;
  /** Author a metamodel-validated typed entity; rejects invalid at the boundary. */
  readonly authorTypedNode: (typeId: string, properties: Record<string, string>) => Promise<void>;
  /** Assert a plan/actual claim on a slot over a valid-time interval. */
  readonly setClaim: (claim: ClaimInput) => Promise<void>;
  /** Re-resolve the catalogue at a new viewpoint. */
  readonly setViewpoint: (viewpoint: Viewpoint) => Promise<void>;
  /** Compare two viewpoints; returns the changed slots. */
  readonly diff: (before: Viewpoint, after: Viewpoint) => Promise<PropertyDelta[]>;
  readonly rebuild: () => Promise<void>;
}

const DEFAULT_VIEWPOINT: Viewpoint = { asOf: 0, layers: ['actual', 'plan'] };

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
  const [metamodelTypes, setMetamodelTypes] = useState<readonly MetaTypeInfo[]>([]);
  // eslint-disable-next-line react/hook-use-state -- the public setter is the `setViewpoint` action below, which also re-resolves
  const [viewpoint, setViewpointState] = useState<Viewpoint>(DEFAULT_VIEWPOINT);
  const [resolved, setResolved] = useState<readonly ResolvedEntity[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | undefined>();

  const refresh = useCallback(async (view: Viewpoint) => {
    const nextStatus = await invokeIpc<WorkspaceStatus>('workspace_status', {});
    const nextNodes = await invokeIpc<NodeRecord[]>('workspace_nodes', {});
    // The metamodel is embedded host-side and workspace-independent; fetching
    // it on refresh keeps the authoring palette in sync without a separate effect.
    const nextTypes = await invokeIpc<MetaTypeInfo[]>('workspace_metamodel_types', {});
    // The catalogue artefact: the twin resolved at the active viewpoint.
    const nextResolved = await invokeIpc<ResolvedEntity[]>('workspace_state_at', view);
    setStatus(nextStatus);
    setNodes(nextNodes);
    setMetamodelTypes(nextTypes);
    setResolved(nextResolved);
  }, []);

  // The latest viewpoint, read by refresh() without re-creating callbacks.
  const viewpointReference = useRef<Viewpoint>(DEFAULT_VIEWPOINT);

  const run = useCallback(
    async (operation: () => Promise<void>) => {
      setPhase('busy');
      setErrorMessage(undefined);
      try {
        await operation();
        await refresh(viewpointReference.current);
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

  const authorTypedNode = useCallback(
    async (typeId: string, properties: Record<string, string>) => {
      await run(async () => {
        await invokeIpc<NodeRecord>('workspace_author_typed_node', { typeId, props: properties });
      });
    },
    [run],
  );

  const setClaim = useCallback(
    async (claim: ClaimInput) => {
      await run(async () => {
        await invokeIpc<null>('workspace_set_claim', {
          entityId: claim.entityId,
          typeId: claim.typeId,
          attribute: claim.attribute,
          value: claim.value,
          layer: claim.layer,
          validFrom: claim.validFrom,
          validTo: claim.validTo,
        });
      });
    },
    [run],
  );

  const setViewpoint = useCallback(async (next: Viewpoint) => {
    viewpointReference.current = next;
    setViewpointState(next);
    const nextResolved = await invokeIpc<ResolvedEntity[]>('workspace_state_at', next);
    setResolved(nextResolved);
  }, []);

  const diff = useCallback(
    async (before: Viewpoint, after: Viewpoint) =>
      invokeIpc<PropertyDelta[]>('workspace_diff', { before, after }),
    [],
  );

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
    { phase, status, nodes, metamodelTypes, viewpoint, resolved, errorMessage },
    {
      createWorkspace,
      openWorkspace,
      authorNode,
      authorTypedNode,
      setClaim,
      setViewpoint,
      diff,
      rebuild,
    },
  ];
}
