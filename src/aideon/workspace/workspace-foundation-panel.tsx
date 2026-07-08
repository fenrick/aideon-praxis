'use client';

import { useState } from 'react';

import {
  Alert,
  AlertDescription,
  AlertTitle,
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
  Skeleton,
} from 'design-system';

import { useWorkspaceFoundation } from './use-workspace-foundation';

/**
 * The M0 end-to-end foundation surface: create/open a canonical workspace,
 * author nodes into the append-only op log, read the derived twin listing
 * back, and rebuild the derived runtime with proof-carrying readiness.
 *
 * This is deliberately the thinnest honest slice of the golden journey
 * (steps 1 + 3 + 8–10) — every row shown here is derived from
 * `model/ops/*.jsonl` on disk, never from renderer state.
 */
export function WorkspaceFoundationPanel() {
  const [{ phase, status, nodes, errorMessage }, actions] = useWorkspaceFoundation();
  const [root, setRoot] = useState('');

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-4 p-4 md:p-6">
      <Card>
        <CardHeader>
          <CardTitle>Workspace foundation</CardTitle>
          <CardDescription>
            Create or open a portable workspace folder. Everything below derives from its canonical
            op log.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <div className="flex gap-2">
            <Input
              aria-label="Workspace folder"
              placeholder="/path/to/workspace"
              value={root}
              onChange={(event) => {
                setRoot(event.target.value);
              }}
            />
            <Button
              disabled={root.trim() === '' || phase === 'busy'}
              onClick={() => {
                void actions.createWorkspace(root.trim());
              }}
            >
              Create
            </Button>
            <Button
              variant="secondary"
              disabled={root.trim() === '' || phase === 'busy'}
              onClick={() => {
                void actions.openWorkspace(root.trim());
              }}
            >
              Open
            </Button>
          </div>
          {phase === 'error' && errorMessage !== undefined ? (
            <Alert variant="destructive">
              <AlertTitle>Workspace operation failed</AlertTitle>
              <AlertDescription>{errorMessage}</AlertDescription>
            </Alert>
          ) : undefined}
        </CardContent>
      </Card>

      {phase === 'busy' ? (
        <Card aria-label="Working">
          <CardContent className="flex flex-col gap-2 pt-6">
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-4 w-1/2" />
          </CardContent>
        </Card>
      ) : undefined}

      {status !== undefined && phase === 'open' ? (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Foundation status</CardTitle>
              <CardDescription>
                Applied operations and the structural rebuild hash — the proof the derived runtime
                matches the canonical log.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-2 text-sm">
              <div className="flex items-center justify-between gap-2">
                <span className="text-muted-foreground">Workspace</span>
                <code className="truncate">{status.workspaceId}</code>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-muted-foreground">Applied operations</span>
                <Badge variant="secondary">{status.appliedOpCount}</Badge>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-muted-foreground">Rebuild hash</span>
                <code className="truncate" title={status.foundationRebuildHash}>
                  {status.foundationRebuildHash.slice(0, 16)}…
                </code>
              </div>
              <div className="pt-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    void actions.rebuild();
                  }}
                >
                  Rebuild derived runtime
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Nodes</CardTitle>
              <CardDescription>
                The derived twin listing — re-derived from the op log on every rebuild.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <div>
                <Button
                  size="sm"
                  onClick={() => {
                    void actions.authorNode();
                  }}
                >
                  Add node
                </Button>
              </div>
              {nodes.length === 0 ? (
                <p className="text-muted-foreground text-sm">
                  No nodes yet. Add one — it lands in the canonical log first, then appears here
                  from the derived projection.
                </p>
              ) : (
                <ul className="flex flex-col gap-1" aria-label="Node list">
                  {nodes.map((node) => (
                    <li
                      key={node.nodeId}
                      className="flex items-center justify-between gap-2 rounded-md border px-3 py-2 text-sm"
                    >
                      <code className="truncate">{node.nodeId}</code>
                      {node.tombstoned ? <Badge variant="outline">tombstoned</Badge> : undefined}
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </>
      ) : undefined}
    </div>
  );
}
