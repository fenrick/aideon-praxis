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
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Skeleton,
} from 'design-system';

import type { MetaTypeInfo } from '@/adapters/ipc-bindings.gen';

import { useWorkspaceFoundation } from './use-workspace-foundation';

/**
 * Author one metamodel-typed entity: pick a type, fill its attributes, create.
 * The write is validated host-side against the seed effective schema before any
 * operation is appended — an invalid one is refused and never enters the log.
 * @param root0 - Form props.
 * @param root0.types - The seed metamodel's authorable entity types.
 * @param root0.onAuthor - Called with the chosen type and non-empty attributes.
 */
function TypedAuthoringForm({
  types,
  onAuthor,
}: {
  readonly types: readonly MetaTypeInfo[];
  readonly onAuthor: (typeId: string, properties: Record<string, string>) => void;
}) {
  const [typeId, setTypeId] = useState('');
  const [values, setValues] = useState<Record<string, string>>({});
  const selected = types.find((t) => t.id === typeId);

  const setValue = (name: string, value: string) => {
    setValues((previous) => ({ ...previous, [name]: value }));
  };

  return (
    <div className="flex flex-col gap-3 rounded-md border p-3">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="entity-type">Entity type</Label>
        <Select
          value={typeId}
          onValueChange={(next) => {
            setTypeId(next);
            setValues({});
          }}
        >
          <SelectTrigger id="entity-type" aria-label="Entity type">
            <SelectValue placeholder="Choose a type…" />
          </SelectTrigger>
          <SelectContent>
            {types.map((type) => (
              <SelectItem key={type.id} value={type.id}>
                {type.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {selected?.attributes.map((attribute) => (
        <div key={attribute.name} className="flex flex-col gap-1.5">
          <Label htmlFor={`attr-${attribute.name}`}>
            {attribute.name}
            {attribute.required ? <span className="text-destructive"> *</span> : undefined}
          </Label>
          {attribute.enumValues.length > 0 ? (
            <Select
              value={values[attribute.name] ?? ''}
              onValueChange={(next) => {
                setValue(attribute.name, next);
              }}
            >
              <SelectTrigger id={`attr-${attribute.name}`} aria-label={attribute.name}>
                <SelectValue placeholder={`Choose ${attribute.name}…`} />
              </SelectTrigger>
              <SelectContent>
                {attribute.enumValues.map((choice) => (
                  <SelectItem key={choice} value={choice}>
                    {choice}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <Input
              id={`attr-${attribute.name}`}
              aria-label={attribute.name}
              value={values[attribute.name] ?? ''}
              onChange={(event) => {
                setValue(attribute.name, event.target.value);
              }}
            />
          )}
        </div>
      ))}

      <div>
        <Button
          size="sm"
          disabled={typeId === ''}
          onClick={() => {
            const properties = Object.fromEntries(
              Object.entries(values).filter(([, value]) => value.trim() !== ''),
            );
            onAuthor(typeId, properties);
          }}
        >
          Create {selected?.label ?? 'entity'}
        </Button>
      </div>
    </div>
  );
}

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
  const [{ phase, status, nodes, metamodelTypes, errorMessage }, actions] =
    useWorkspaceFoundation();
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
              <CardTitle>Entities</CardTitle>
              <CardDescription>
                Author entities against the seed metamodel. A write is validated before it enters
                the canonical log; the listing below is re-derived from the op log on every rebuild.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <TypedAuthoringForm
                types={metamodelTypes}
                onAuthor={(typeId, properties) => {
                  void actions.authorTypedNode(typeId, properties);
                }}
              />
              {nodes.length === 0 ? (
                <p className="text-muted-foreground text-sm">
                  No entities yet. Create one — it lands in the canonical log first, then appears
                  here from the derived projection.
                </p>
              ) : (
                <ul className="flex flex-col gap-1" aria-label="Node list">
                  {nodes.map((node) => (
                    <li
                      key={node.nodeId}
                      className="flex items-center justify-between gap-2 rounded-md border px-3 py-2 text-sm"
                    >
                      <span className="flex items-center gap-2">
                        {node.typeLabel === null ? undefined : (
                          <Badge variant="secondary">{node.typeLabel}</Badge>
                        )}
                        <code className="truncate">{node.nodeId.slice(0, 8)}…</code>
                      </span>
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
