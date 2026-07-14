'use client';

import { useState } from 'react';

import { useTranslations } from 'next-intl';

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

import type {
  EdgeRecord,
  MetaTypeInfo,
  NodeRecord,
  PropertyDelta,
  ResolvedEntity,
  Viewpoint,
} from '@/adapters/ipc-bindings.gen';

import { pickWorkspaceFolder } from '@/adapters/dialog';

import type { ClaimInput } from './use-workspace-foundation';
import { useWorkspaceFoundation } from './use-workspace-foundation';

/** The two layer-priority presets the viewpoint control offers. */
type LayerPreset = 'actual-first' | 'plan-only';

/**
 * Narrow a Select's onValueChange string to a known layer preset.
 * @param value - Raw value from the preset Select.
 */
function isLayerPreset(value: string): value is LayerPreset {
  return value === 'actual-first' || value === 'plan-only';
}

/**
 * Resolve the layer list for a preset.
 * @param preset - Layer preset to resolve.
 */
function layersForPreset(preset: LayerPreset): string[] {
  switch (preset) {
    case 'actual-first': {
      return ['actual', 'plan'];
    }
    case 'plan-only': {
      return ['plan'];
    }
  }
}

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
  const t = useTranslations('workspace');
  const [typeId, setTypeId] = useState('');
  const [values, setValues] = useState<Record<string, string>>({});
  const selected = types.find((entry) => entry.id === typeId);

  const setValue = (name: string, value: string) => {
    setValues((previous) => ({ ...previous, [name]: value }));
  };

  return (
    <div className="flex flex-col gap-3 rounded-md border p-3">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="entity-type">{t('entities.entityType')}</Label>
        <Select
          value={typeId}
          onValueChange={(next) => {
            setTypeId(next);
            setValues({});
          }}
        >
          <SelectTrigger id="entity-type" aria-label={t('entities.entityType')}>
            <SelectValue placeholder={t('entities.chooseTypePlaceholder')} />
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
          {t('entities.createLabel', { label: selected?.label ?? 'entity' })}
        </Button>
      </div>
    </div>
  );
}

/** The seed metamodel's relationship vocabulary (Praxis owns the verbs). */
const SEED_RELATIONSHIPS = ['serves', 'realises', 'accesses', 'hosts', 'plan_effect'] as const;

/**
 * Author one metamodel-typed relationship: pick a verb and two endpoints, create.
 * Endpoint-type, self-link, duplicate, and attribute rules are checked host-side
 * against the compiled effective schema before any operation is appended.
 * @param root0 - Form props.
 * @param root0.nodes - The authored entities to choose endpoints from.
 * @param root0.onAuthor - Called with the verb, endpoints, and any attributes.
 */
function EdgeAuthoringForm({
  nodes,
  onAuthor,
}: {
  readonly nodes: readonly NodeRecord[];
  readonly onAuthor: (
    relationshipType: string,
    sourceId: string,
    destinationId: string,
    properties: Record<string, string>,
  ) => void;
}) {
  const t = useTranslations('workspace');
  const [relationshipType, setRelationshipType] = useState('');
  const [sourceId, setSourceId] = useState('');
  const [destinationId, setDestinationId] = useState('');
  const [mode, setMode] = useState('');

  const nodeLabel = (node: NodeRecord) =>
    `${node.typeLabel ?? 'node'} · ${node.nodeId.slice(0, 8)}…`;

  return (
    <div className="flex flex-col gap-3 rounded-md border p-3">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="rel-type">{t('relationships.relationship')}</Label>
        <Select value={relationshipType} onValueChange={setRelationshipType}>
          <SelectTrigger id="rel-type" aria-label={t('relationships.relationship')}>
            <SelectValue placeholder={t('relationships.chooseRelationshipPlaceholder')} />
          </SelectTrigger>
          <SelectContent>
            {SEED_RELATIONSHIPS.map((verb) => (
              <SelectItem key={verb} value={verb}>
                {verb}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="edge-src">{t('relationships.source')}</Label>
        <Select value={sourceId} onValueChange={setSourceId}>
          <SelectTrigger id="edge-src" aria-label={t('relationships.source')}>
            <SelectValue placeholder={t('relationships.chooseSourcePlaceholder')} />
          </SelectTrigger>
          <SelectContent>
            {nodes.map((node) => (
              <SelectItem key={node.nodeId} value={node.nodeId}>
                {nodeLabel(node)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="edge-dst">{t('relationships.destination')}</Label>
        <Select value={destinationId} onValueChange={setDestinationId}>
          <SelectTrigger id="edge-dst" aria-label={t('relationships.destination')}>
            <SelectValue placeholder={t('relationships.chooseDestinationPlaceholder')} />
          </SelectTrigger>
          <SelectContent>
            {nodes.map((node) => (
              <SelectItem key={node.nodeId} value={node.nodeId}>
                {nodeLabel(node)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {relationshipType === 'accesses' ? (
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="edge-mode">
            {t('relationships.mode')}
            <span className="text-destructive"> *</span>
          </Label>
          <Input
            id="edge-mode"
            aria-label={t('relationships.mode')}
            value={mode}
            onChange={(event) => {
              setMode(event.target.value);
            }}
          />
        </div>
      ) : undefined}

      <div>
        <Button
          size="sm"
          disabled={relationshipType === '' || sourceId === '' || destinationId === ''}
          onClick={() => {
            const properties: Record<string, string> =
              mode.trim() === '' ? {} : { mode: mode.trim() };
            onAuthor(relationshipType, sourceId, destinationId, properties);
          }}
        >
          {t('relationships.create')}
        </Button>
      </div>
    </div>
  );
}

/**
 * The relationship authoring form plus the derived edge inspector.
 * @param root0 - Card props.
 * @param root0.edges - The projected relationships (re-derived from the op log).
 * @param root0.nodes - The authored entities (endpoint choices).
 * @param root0.onAuthor - Called with the verb, endpoints, and any attributes.
 */
function RelationshipsCard({
  edges,
  nodes,
  onAuthor,
}: {
  readonly edges: readonly EdgeRecord[];
  readonly nodes: readonly NodeRecord[];
  readonly onAuthor: (
    relationshipType: string,
    sourceId: string,
    destinationId: string,
    properties: Record<string, string>,
  ) => void;
}) {
  const t = useTranslations('workspace');
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('relationships.title')}</CardTitle>
        <CardDescription>{t('relationships.description')}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <EdgeAuthoringForm nodes={nodes} onAuthor={onAuthor} />
        {edges.length === 0 ? (
          <p className="text-muted-foreground text-sm">{t('relationships.empty')}</p>
        ) : (
          <ul className="flex flex-col gap-1" aria-label="Edge list">
            {edges.map((edge) => (
              <li
                key={edge.edgeId}
                className="flex items-center justify-between gap-2 rounded-md border px-3 py-2 text-sm"
              >
                <span className="flex items-center gap-2">
                  {edge.typeLabel === null ? undefined : (
                    <Badge variant="secondary">{edge.typeLabel}</Badge>
                  )}
                  <code className="truncate">
                    {edge.srcId.slice(0, 8)}… → {edge.dstId.slice(0, 8)}…
                  </code>
                </span>
                {edge.tombstoned ? <Badge variant="outline">tombstoned</Badge> : undefined}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * Assert a plan/actual claim on one entity's slot over a valid-time interval.
 * @param root0 - Claim form props.
 * @param root0.nodes - The authored entities to choose from.
 * @param root0.types - The seed metamodel (for attribute + enum choices).
 * @param root0.onClaim - Called with the assembled claim.
 */
function ClaimForm({
  nodes,
  types,
  onClaim,
}: {
  readonly nodes: readonly NodeRecord[];
  readonly types: readonly MetaTypeInfo[];
  readonly onClaim: (claim: ClaimInput) => void;
}) {
  const t = useTranslations('workspace');
  const [entityId, setEntityId] = useState('');
  const [attribute, setAttribute] = useState('');
  const [value, setValue] = useState('');
  const [layer, setLayer] = useState('plan');
  const [validFrom, setValidFrom] = useState('0');
  const [validTo, setValidTo] = useState('');

  const entity = nodes.find((n) => n.nodeId === entityId);
  const type = types.find((entry) => entry.id === entity?.typeLabel);
  const attribute_ = type?.attributes.find((a) => a.name === attribute);

  const submit = () => {
    const typeLabel = entity?.typeLabel;
    if (entityId === '' || attribute === '' || value.trim() === '' || !typeLabel) {
      return;
    }
    onClaim({
      entityId,
      typeId: typeLabel,
      attribute,
      value: value.trim(),
      layer,
      validFrom: Number(validFrom) || 0,
      validTo: validTo.trim() === '' ? undefined : Number(validTo),
    });
  };

  return (
    <div className="flex flex-col gap-3 rounded-md border p-3">
      <p className="text-sm font-medium">{t('claims.assertTitle')}</p>
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="claim-entity">{t('claims.entity')}</Label>
          <Select
            value={entityId}
            onValueChange={(next) => {
              setEntityId(next);
              setAttribute('');
              setValue('');
            }}
          >
            <SelectTrigger id="claim-entity" aria-label={t('claims.entity')}>
              <SelectValue placeholder={t('claims.chooseEntityPlaceholder')} />
            </SelectTrigger>
            <SelectContent>
              {nodes.map((node) => (
                <SelectItem key={node.nodeId} value={node.nodeId}>
                  {node.typeLabel ?? 'entity'} · {node.nodeId.slice(0, 8)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="claim-attr">{t('claims.attribute')}</Label>
          <Select
            value={attribute}
            onValueChange={(next) => {
              setAttribute(next);
              setValue('');
            }}
          >
            <SelectTrigger id="claim-attr" aria-label={t('claims.attribute')}>
              <SelectValue placeholder={t('claims.chooseAttributePlaceholder')} />
            </SelectTrigger>
            <SelectContent>
              {(type?.attributes ?? []).map((a) => (
                <SelectItem key={a.name} value={a.name}>
                  {a.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="claim-value">{t('claims.value')}</Label>
          {attribute_ && attribute_.enumValues.length > 0 ? (
            <Select value={value} onValueChange={setValue}>
              <SelectTrigger id="claim-value" aria-label={t('claims.value')}>
                <SelectValue placeholder={t('claims.chooseValuePlaceholder')} />
              </SelectTrigger>
              <SelectContent>
                {attribute_.enumValues.map((choice) => (
                  <SelectItem key={choice} value={choice}>
                    {choice}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <Input
              id="claim-value"
              aria-label={t('claims.value')}
              value={value}
              onChange={(event) => {
                setValue(event.target.value);
              }}
            />
          )}
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="claim-layer">{t('claims.layer')}</Label>
          <Select value={layer} onValueChange={setLayer}>
            <SelectTrigger id="claim-layer" aria-label={t('claims.layer')}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="plan">plan</SelectItem>
              <SelectItem value="actual">actual</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="claim-from">{t('claims.validFrom')}</Label>
          <Input
            id="claim-from"
            aria-label={t('claims.validFrom')}
            type="number"
            value={validFrom}
            onChange={(event) => {
              setValidFrom(event.target.value);
            }}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="claim-to">{t('claims.validTo')}</Label>
          <Input
            id="claim-to"
            aria-label={t('claims.validTo')}
            type="number"
            value={validTo}
            onChange={(event) => {
              setValidTo(event.target.value);
            }}
          />
        </div>
      </div>
      <div>
        <Button size="sm" disabled={entityId === '' || attribute === ''} onClick={submit}>
          {t('claims.assert')}
        </Button>
      </div>
    </div>
  );
}

/**
 * The catalogue artefact: the twin resolved at a viewpoint, rendered as a
 * deterministic table where each cell carries its winning layer as provenance.
 * The viewpoint control re-resolves against the canonical facts; the claim form
 * asserts new plan/actual facts.
 * @param root0 - Catalogue props.
 * @param root0.entities - The entities resolved at the current viewpoint.
 * @param root0.nodes - All authored entities (for the claim form).
 * @param root0.types - The seed metamodel.
 * @param root0.viewpoint - The active viewpoint.
 * @param root0.onViewpoint - Re-resolve at a new viewpoint.
 * @param root0.onClaim - Assert a new claim.
 */
function CatalogueCard({
  entities,
  nodes,
  types,
  viewpoint,
  onViewpoint,
  onClaim,
}: {
  readonly entities: readonly ResolvedEntity[];
  readonly nodes: readonly NodeRecord[];
  readonly types: readonly MetaTypeInfo[];
  readonly viewpoint: Viewpoint;
  readonly onViewpoint: (next: Viewpoint) => void;
  readonly onClaim: (claim: ClaimInput) => void;
}) {
  const t = useTranslations('workspace');
  const preset = viewpoint.layers.length === 1 ? 'plan-only' : 'actual-first';

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('catalogue.title')}</CardTitle>
        <CardDescription>{t('catalogue.description')}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="vp-asof">{t('catalogue.asOfValidTime')}</Label>
            <Input
              id="vp-asof"
              aria-label={t('catalogue.asOfValidTime')}
              type="number"
              className="w-40"
              value={String(viewpoint.asOf)}
              onChange={(event) => {
                onViewpoint({ asOf: Number(event.target.value) || 0, layers: viewpoint.layers });
              }}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="vp-layers">{t('catalogue.layerPolicy')}</Label>
            <Select
              value={preset}
              onValueChange={(next) => {
                onViewpoint({
                  asOf: viewpoint.asOf,
                  layers: isLayerPreset(next) ? layersForPreset(next) : ['actual', 'plan'],
                });
              }}
            >
              <SelectTrigger
                id="vp-layers"
                aria-label={t('catalogue.layerPolicy')}
                className="w-48"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="actual-first">{t('catalogue.actualOverPlan')}</SelectItem>
                <SelectItem value="plan-only">{t('catalogue.planOnly')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {entities.length === 0 ? (
          <p className="text-muted-foreground text-sm">{t('catalogue.emptyAtViewpoint')}</p>
        ) : (
          <ul className="flex flex-col gap-2" aria-label="Catalogue rows">
            {entities.map((entity) => (
              <li key={entity.nodeId} className="rounded-md border px-3 py-2 text-sm">
                <div className="flex items-center gap-2">
                  {entity.typeLabel === null ? undefined : (
                    <Badge variant="secondary">{entity.typeLabel}</Badge>
                  )}
                  <code className="truncate">{entity.nodeId.slice(0, 8)}…</code>
                </div>
                {entity.properties.length > 0 ? (
                  <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1">
                    {entity.properties.map((property) => (
                      <span key={property.field} className="flex items-center gap-1.5">
                        <span className="text-muted-foreground">{property.field}:</span>
                        <span>{property.value}</span>
                        <Badge variant="outline">{property.layer}</Badge>
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground mt-1 text-xs">{t('catalogue.emptySlot')}</p>
                )}
              </li>
            ))}
          </ul>
        )}

        <ClaimForm nodes={nodes} types={types} onClaim={onClaim} />
      </CardContent>
    </Card>
  );
}

/**
 * Compare the twin at two viewpoints and list the slots whose resolved value
 * changed — the diff over the same layer policy at two as-of times.
 * @param root0 - Diff props.
 * @param root0.layers - The layer policy both viewpoints share.
 * @param root0.onDiff - Resolve the delta set for two viewpoints.
 */
function DiffCard({
  layers,
  onDiff,
}: {
  readonly layers: readonly string[];
  readonly onDiff: (before: Viewpoint, after: Viewpoint) => Promise<PropertyDelta[]>;
}) {
  const t = useTranslations('workspace');
  const [before, setBefore] = useState('0');
  const [after, setAfter] = useState('100');
  const [deltas, setDeltas] = useState<PropertyDelta[] | undefined>();

  const compare = async () => {
    const result = await onDiff(
      { asOf: Number(before) || 0, layers: [...layers] },
      { asOf: Number(after) || 0, layers: [...layers] },
    );
    setDeltas(result);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('diff.title')}</CardTitle>
        <CardDescription>{t('diff.description')}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="diff-before">{t('diff.before')}</Label>
            <Input
              id="diff-before"
              aria-label={t('diff.before')}
              type="number"
              className="w-32"
              value={before}
              onChange={(event) => {
                setBefore(event.target.value);
              }}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="diff-after">{t('diff.after')}</Label>
            <Input
              id="diff-after"
              aria-label={t('diff.after')}
              type="number"
              className="w-32"
              value={after}
              onChange={(event) => {
                setAfter(event.target.value);
              }}
            />
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              void compare();
            }}
          >
            {t('diff.compare')}
          </Button>
        </div>
        {deltas?.length === 0 ? (
          <p className="text-muted-foreground text-sm">{t('diff.empty')}</p>
        ) : undefined}
        {deltas !== undefined && deltas.length > 0 ? (
          <ul className="flex flex-col gap-1" aria-label="Diff deltas">
            {deltas.map((delta) => (
              <li
                key={`${delta.nodeId}-${delta.field}`}
                className="flex items-center justify-between gap-2 rounded-md border px-3 py-2 text-sm"
              >
                <span className="flex items-center gap-2">
                  {delta.typeLabel === null ? undefined : (
                    <Badge variant="secondary">{delta.typeLabel}</Badge>
                  )}
                  <span className="text-muted-foreground">{delta.field}</span>
                </span>
                <span className="flex items-center gap-2">
                  <span className="text-muted-foreground line-through">{delta.before ?? '∅'}</span>
                  <span>→</span>
                  <span>{delta.after ?? '∅'}</span>
                </span>
              </li>
            ))}
          </ul>
        ) : undefined}
      </CardContent>
    </Card>
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
  const t = useTranslations('workspace');
  const [
    { phase, status, nodes, edges, metamodelTypes, viewpoint, resolved, errorMessage },
    actions,
  ] = useWorkspaceFoundation();
  const [root, setRoot] = useState('');

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-4 p-4 md:p-6">
      <Card>
        <CardHeader>
          <CardTitle>{t('foundation.title')}</CardTitle>
          <CardDescription>{t('foundation.description')}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <div className="flex gap-2">
            <Input
              aria-label={t('foundation.folderAriaLabel')}
              placeholder={t('foundation.pathPlaceholder')}
              value={root}
              onChange={(event) => {
                setRoot(event.target.value);
              }}
            />
            <Button
              variant="outline"
              disabled={phase === 'busy'}
              onClick={() => {
                void (async () => {
                  const picked = await pickWorkspaceFolder();
                  if (picked !== undefined) {
                    setRoot(picked);
                  }
                })();
              }}
            >
              {t('foundation.browse')}
            </Button>
            <Button
              disabled={root.trim() === '' || phase === 'busy'}
              onClick={() => {
                void actions.createWorkspace(root.trim());
              }}
            >
              {t('foundation.create')}
            </Button>
            <Button
              variant="secondary"
              disabled={root.trim() === '' || phase === 'busy'}
              onClick={() => {
                void actions.openWorkspace(root.trim());
              }}
            >
              {t('foundation.open')}
            </Button>
          </div>
          {phase === 'error' && errorMessage !== undefined ? (
            <Alert variant="destructive">
              <AlertTitle>{t('foundation.operationFailed')}</AlertTitle>
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
              <CardTitle>{t('foundation.status.title')}</CardTitle>
              <CardDescription>{t('foundation.status.description')}</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-2 text-sm">
              <div className="flex items-center justify-between gap-2">
                <span className="text-muted-foreground">{t('foundation.status.workspace')}</span>
                <code className="truncate">{status.workspaceId}</code>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-muted-foreground">
                  {t('foundation.status.appliedOperations')}
                </span>
                <Badge variant="secondary">{status.appliedOpCount}</Badge>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-muted-foreground">{t('foundation.status.rebuildHash')}</span>
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
                  {t('foundation.status.rebuildDerivedRuntime')}
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t('entities.title')}</CardTitle>
              <CardDescription>{t('entities.description')}</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <TypedAuthoringForm
                types={metamodelTypes}
                onAuthor={(typeId, properties) => {
                  void actions.authorTypedNode(typeId, properties);
                }}
              />
              {nodes.length === 0 ? (
                <p className="text-muted-foreground text-sm">{t('entities.empty')}</p>
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

          <RelationshipsCard
            edges={edges}
            nodes={nodes}
            onAuthor={(relationshipType, sourceId, destinationId, properties) => {
              void actions.authorTypedEdge(relationshipType, sourceId, destinationId, properties);
            }}
          />

          <CatalogueCard
            entities={resolved}
            nodes={nodes}
            types={metamodelTypes}
            viewpoint={viewpoint}
            onViewpoint={(next) => {
              void actions.setViewpoint(next);
            }}
            onClaim={(claim) => {
              void actions.setClaim(claim);
            }}
          />

          <DiffCard layers={viewpoint.layers} onDiff={actions.diff} />
        </>
      ) : undefined}
    </div>
  );
}
