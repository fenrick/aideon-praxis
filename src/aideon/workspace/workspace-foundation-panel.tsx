'use client';

import { useState, type ReactNode } from 'react';

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
  ObjectInspection,
  PropertyDelta,
  ResolvedEntity,
  Viewpoint,
  WorkspaceStatus,
} from '@/adapters/ipc-bindings.gen';

import { pickWorkspaceFolder } from '@/adapters/dialog';

import type { ClaimInput, FoundationPhase } from './use-workspace-foundation';
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

/** One value/label pair for {@link SelectField}. */
interface SelectOption {
  readonly value: string;
  readonly label: ReactNode;
}

/**
 * The repeated Label-over-control layout used by every field in this panel.
 * @param root0 - Field props.
 * @param root0.id - The control id the label points at.
 * @param root0.label - The field label content.
 * @param root0.children - The control itself.
 */
function Field({
  id,
  label,
  children,
}: {
  readonly id: string;
  readonly label: ReactNode;
  readonly children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      {children}
    </div>
  );
}

/**
 * A labelled Select over a list of options — the panel's recurring select field.
 * @param root0 - Select field props.
 * @param root0.id - The control id (shared by label and trigger).
 * @param root0.label - The field label content.
 * @param root0.ariaLabel - The trigger's accessible name.
 * @param root0.value - The current value.
 * @param root0.onValueChange - Called with the chosen value.
 * @param root0.options - The selectable options.
 * @param root0.placeholder - Placeholder shown when nothing is selected.
 * @param root0.triggerClassName - Optional class on the trigger.
 */
function SelectField({
  id,
  label,
  ariaLabel,
  value,
  onValueChange,
  options,
  placeholder,
  triggerClassName,
}: {
  readonly id: string;
  readonly label: ReactNode;
  readonly ariaLabel: string;
  readonly value: string;
  readonly onValueChange: (value: string) => void;
  readonly options: readonly SelectOption[];
  readonly placeholder?: ReactNode;
  readonly triggerClassName?: string;
}) {
  return (
    <Field id={id} label={label}>
      <Select value={value} onValueChange={onValueChange}>
        <SelectTrigger id={id} aria-label={ariaLabel} className={triggerClassName}>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </Field>
  );
}

/**
 * A single attribute editor: an enum Select when the attribute is enumerated,
 * a free-text Input otherwise.
 * @param root0 - Field props.
 * @param root0.id - The control id (shared by label and control).
 * @param root0.label - The field label content.
 * @param root0.ariaLabel - The control's accessible name.
 * @param root0.value - The current value.
 * @param root0.onValueChange - Called with the next value.
 * @param root0.enumValues - The permitted enum values, or empty for free text.
 * @param root0.selectPlaceholder - Placeholder for the enum Select.
 */
function EnumOrInputField({
  id,
  label,
  ariaLabel,
  value,
  onValueChange,
  enumValues,
  selectPlaceholder,
}: {
  readonly id: string;
  readonly label: ReactNode;
  readonly ariaLabel: string;
  readonly value: string;
  readonly onValueChange: (value: string) => void;
  readonly enumValues: readonly string[];
  readonly selectPlaceholder?: ReactNode;
}) {
  if (enumValues.length > 0) {
    return (
      <SelectField
        id={id}
        label={label}
        ariaLabel={ariaLabel}
        value={value}
        onValueChange={onValueChange}
        placeholder={selectPlaceholder}
        options={enumValues.map((choice) => ({ value: choice, label: choice }))}
      />
    );
  }
  return (
    <Field id={id} label={label}>
      <Input
        id={id}
        aria-label={ariaLabel}
        value={value}
        onChange={(event) => {
          onValueChange(event.target.value);
        }}
      />
    </Field>
  );
}

/**
 * A derived list row: an optional type badge, a truncated identifier, and an
 * optional tombstone marker — shared by the node and edge inspectors.
 * @param root0 - Row props.
 * @param root0.typeLabel - The metamodel type label, or `null` when untyped.
 * @param root0.code - The truncated identifier content.
 * @param root0.tombstoned - Whether the record is tombstoned.
 * @param root0.onInspect - Select this object in the shared inspector.
 */
function ListRow({
  typeLabel,
  code,
  tombstoned,
  onInspect,
}: {
  readonly typeLabel: string | null;
  readonly code: ReactNode;
  readonly tombstoned: boolean;
  readonly onInspect: () => void;
}) {
  return (
    <li className="flex items-center justify-between gap-2 rounded-md border px-3 py-2 text-sm">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        aria-label={`Inspect ${typeLabel ?? 'object'}`}
        onClick={onInspect}
      >
        <span className="flex items-center gap-2">
          {typeLabel === null ? undefined : <Badge variant="secondary">{typeLabel}</Badge>}
          <code className="truncate">{code}</code>
        </span>
      </Button>
      {tombstoned ? <Badge variant="outline">tombstoned</Badge> : undefined}
    </li>
  );
}

/**
 * A titled card with the panel's standard header + gap-3 content layout.
 * @param root0 - Card props.
 * @param root0.title - The card title.
 * @param root0.description - The card description.
 * @param root0.children - The card body.
 */
function SectionCard({
  title,
  description,
  children,
}: {
  readonly title: string;
  readonly description: string;
  readonly children: ReactNode;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">{children}</CardContent>
    </Card>
  );
}

/**
 * A derived listing: an empty-state paragraph, or a labelled list of rows.
 * @param root0 - List props.
 * @param root0.isEmpty - Whether the listing has no rows.
 * @param root0.emptyText - The empty-state message.
 * @param root0.label - The list's accessible name.
 * @param root0.children - The rendered rows when non-empty.
 */
function ItemList({
  isEmpty,
  emptyText,
  label,
  children,
}: {
  readonly isEmpty: boolean;
  readonly emptyText: string;
  readonly label: string;
  readonly children: ReactNode;
}) {
  if (isEmpty) {
    return <p className="text-muted-foreground text-sm">{emptyText}</p>;
  }
  return (
    <ul className="flex flex-col gap-1" aria-label={label}>
      {children}
    </ul>
  );
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

  const submit = () => {
    const properties = Object.fromEntries(
      Object.entries(values).filter(([, value]) => value.trim() !== ''),
    );
    onAuthor(typeId, properties);
  };

  return (
    <div className="flex flex-col gap-3 rounded-md border p-3">
      <SelectField
        id="entity-type"
        label={t('entities.entityType')}
        ariaLabel={t('entities.entityType')}
        value={typeId}
        onValueChange={(next) => {
          setTypeId(next);
          setValues({});
        }}
        placeholder={t('entities.chooseTypePlaceholder')}
        options={types.map((type) => ({ value: type.id, label: type.label }))}
      />

      {selected?.attributes.map((attribute) => (
        <EnumOrInputField
          key={attribute.name}
          id={`attr-${attribute.name}`}
          label={
            <>
              {attribute.name}
              {attribute.required ? <span className="text-destructive"> *</span> : undefined}
            </>
          }
          ariaLabel={attribute.name}
          value={values[attribute.name] ?? ''}
          onValueChange={(next) => {
            setValue(attribute.name, next);
          }}
          enumValues={attribute.enumValues}
          selectPlaceholder={`Choose ${attribute.name}…`}
        />
      ))}

      <div>
        <Button size="sm" disabled={typeId === ''} onClick={submit}>
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
 * @param root0.onInspect - Select a relationship in the shared inspector.
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

  const nodeOptions = nodes.map((node) => ({
    value: node.nodeId,
    label: `${node.typeLabel ?? 'node'} · ${node.nodeId.slice(0, 8)}…`,
  }));

  const submit = () => {
    const properties: Record<string, string> = mode.trim() === '' ? {} : { mode: mode.trim() };
    onAuthor(relationshipType, sourceId, destinationId, properties);
  };

  return (
    <div className="flex flex-col gap-3 rounded-md border p-3">
      <SelectField
        id="rel-type"
        label={t('relationships.relationship')}
        ariaLabel={t('relationships.relationship')}
        value={relationshipType}
        onValueChange={setRelationshipType}
        placeholder={t('relationships.chooseRelationshipPlaceholder')}
        options={SEED_RELATIONSHIPS.map((verb) => ({ value: verb, label: verb }))}
      />

      <SelectField
        id="edge-src"
        label={t('relationships.source')}
        ariaLabel={t('relationships.source')}
        value={sourceId}
        onValueChange={setSourceId}
        placeholder={t('relationships.chooseSourcePlaceholder')}
        options={nodeOptions}
      />

      <SelectField
        id="edge-dst"
        label={t('relationships.destination')}
        ariaLabel={t('relationships.destination')}
        value={destinationId}
        onValueChange={setDestinationId}
        placeholder={t('relationships.chooseDestinationPlaceholder')}
        options={nodeOptions}
      />

      {relationshipType === 'accesses' ? (
        <Field
          id="edge-mode"
          label={
            <>
              {t('relationships.mode')}
              <span className="text-destructive"> *</span>
            </>
          }
        >
          <Input
            id="edge-mode"
            aria-label={t('relationships.mode')}
            value={mode}
            onChange={(event) => {
              setMode(event.target.value);
            }}
          />
        </Field>
      ) : undefined}

      <div>
        <Button
          size="sm"
          disabled={relationshipType === '' || sourceId === '' || destinationId === ''}
          onClick={submit}
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
 * @param root0.onInspect - Select a relationship in the shared inspector.
 */
function RelationshipsCard({
  edges,
  nodes,
  onAuthor,
  onInspect,
}: {
  readonly edges: readonly EdgeRecord[];
  readonly nodes: readonly NodeRecord[];
  readonly onAuthor: (
    relationshipType: string,
    sourceId: string,
    destinationId: string,
    properties: Record<string, string>,
  ) => void;
  readonly onInspect: (objectId: string) => void;
}) {
  const t = useTranslations('workspace');
  return (
    <SectionCard title={t('relationships.title')} description={t('relationships.description')}>
      <EdgeAuthoringForm nodes={nodes} onAuthor={onAuthor} />
      <ItemList isEmpty={edges.length === 0} emptyText={t('relationships.empty')} label="Edge list">
        {edges.map((edge) => (
          <ListRow
            key={edge.edgeId}
            typeLabel={edge.typeLabel}
            tombstoned={edge.tombstoned}
            onInspect={() => {
              onInspect(edge.edgeId);
            }}
            code={
              <>
                {edge.srcId.slice(0, 8)}… → {edge.dstId.slice(0, 8)}…
              </>
            }
          />
        ))}
      </ItemList>
    </SectionCard>
  );
}

/** Layer options offered by the claim form. */
const CLAIM_LAYERS: readonly SelectOption[] = [
  { value: 'plan', label: 'plan' },
  { value: 'actual', label: 'actual' },
];

/** The claim form's raw (string-valued) draft state. */
interface ClaimDraft {
  readonly entityId: string;
  readonly attribute: string;
  readonly value: string;
  readonly layer: string;
  readonly validFrom: string;
  readonly validTo: string;
}

/**
 * Assemble a claim from the form draft, or `undefined` when a required field is
 * missing (entity, attribute, value, or a resolvable entity type).
 * @param draft - The current claim form values.
 * @param typeLabel - The chosen entity's metamodel type, if any.
 */
function assembleClaim(
  draft: ClaimDraft,
  typeLabel: string | null | undefined,
): ClaimInput | undefined {
  if (draft.entityId === '' || draft.attribute === '') {
    return undefined;
  }
  if (draft.value.trim() === '' || !typeLabel) {
    return undefined;
  }
  return {
    entityId: draft.entityId,
    typeId: typeLabel,
    attribute: draft.attribute,
    value: draft.value.trim(),
    layer: draft.layer,
    validFrom: Number(draft.validFrom) || 0,
    validTo: draft.validTo.trim() === '' ? undefined : Number(draft.validTo),
  };
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
    const claim = assembleClaim(
      { entityId, attribute, value, layer, validFrom, validTo },
      entity?.typeLabel,
    );
    if (claim !== undefined) {
      onClaim(claim);
    }
  };

  return (
    <div className="flex flex-col gap-3 rounded-md border p-3">
      <p className="text-sm font-medium">{t('claims.assertTitle')}</p>
      <div className="grid grid-cols-2 gap-3">
        <SelectField
          id="claim-entity"
          label={t('claims.entity')}
          ariaLabel={t('claims.entity')}
          value={entityId}
          onValueChange={(next) => {
            setEntityId(next);
            setAttribute('');
            setValue('');
          }}
          placeholder={t('claims.chooseEntityPlaceholder')}
          options={nodes.map((node) => ({
            value: node.nodeId,
            label: (
              <>
                {node.typeLabel ?? 'entity'} · {node.nodeId.slice(0, 8)}
              </>
            ),
          }))}
        />
        <SelectField
          id="claim-attr"
          label={t('claims.attribute')}
          ariaLabel={t('claims.attribute')}
          value={attribute}
          onValueChange={(next) => {
            setAttribute(next);
            setValue('');
          }}
          placeholder={t('claims.chooseAttributePlaceholder')}
          options={(type?.attributes ?? []).map((a) => ({ value: a.name, label: a.name }))}
        />
        <EnumOrInputField
          id="claim-value"
          label={t('claims.value')}
          ariaLabel={t('claims.value')}
          value={value}
          onValueChange={setValue}
          enumValues={attribute_?.enumValues ?? []}
          selectPlaceholder={t('claims.chooseValuePlaceholder')}
        />
        <SelectField
          id="claim-layer"
          label={t('claims.layer')}
          ariaLabel={t('claims.layer')}
          value={layer}
          onValueChange={setLayer}
          options={CLAIM_LAYERS}
        />
        <Field id="claim-from" label={t('claims.validFrom')}>
          <Input
            id="claim-from"
            aria-label={t('claims.validFrom')}
            type="number"
            value={validFrom}
            onChange={(event) => {
              setValidFrom(event.target.value);
            }}
          />
        </Field>
        <Field id="claim-to" label={t('claims.validTo')}>
          <Input
            id="claim-to"
            aria-label={t('claims.validTo')}
            type="number"
            value={validTo}
            onChange={(event) => {
              setValidTo(event.target.value);
            }}
          />
        </Field>
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
 * The viewpoint control row: the as-of valid time and the layer-policy preset.
 * @param root0 - Control props.
 * @param root0.viewpoint - The active viewpoint.
 * @param root0.onViewpoint - Re-resolve at a new viewpoint.
 */
function ViewpointControls({
  viewpoint,
  onViewpoint,
}: {
  readonly viewpoint: Viewpoint;
  readonly onViewpoint: (next: Viewpoint) => void;
}) {
  const t = useTranslations('workspace');
  const preset = viewpoint.layers.length === 1 ? 'plan-only' : 'actual-first';

  return (
    <div className="flex flex-wrap items-end gap-3">
      <Field id="vp-asof" label={t('catalogue.asOfValidTime')}>
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
      </Field>
      <SelectField
        id="vp-layers"
        label={t('catalogue.layerPolicy')}
        ariaLabel={t('catalogue.layerPolicy')}
        value={preset}
        onValueChange={(next) => {
          onViewpoint({
            asOf: viewpoint.asOf,
            layers: isLayerPreset(next) ? layersForPreset(next) : ['actual', 'plan'],
          });
        }}
        triggerClassName="w-48"
        options={[
          { value: 'actual-first', label: t('catalogue.actualOverPlan') },
          { value: 'plan-only', label: t('catalogue.planOnly') },
        ]}
      />
    </div>
  );
}

/**
 * One resolved catalogue row: the entity plus each slot's winning layer.
 * @param root0 - Row props.
 * @param root0.entity - The entity resolved at the current viewpoint.
 */
function CatalogueEntityRow({ entity }: { readonly entity: ResolvedEntity }) {
  const t = useTranslations('workspace');
  return (
    <li className="rounded-md border px-3 py-2 text-sm">
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

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('catalogue.title')}</CardTitle>
        <CardDescription>{t('catalogue.description')}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <ViewpointControls viewpoint={viewpoint} onViewpoint={onViewpoint} />

        {entities.length === 0 ? (
          <p className="text-muted-foreground text-sm">{t('catalogue.emptyAtViewpoint')}</p>
        ) : (
          <ul className="flex flex-col gap-2" aria-label="Catalogue rows">
            {entities.map((entity) => (
              <CatalogueEntityRow key={entity.nodeId} entity={entity} />
            ))}
          </ul>
        )}

        <ClaimForm nodes={nodes} types={types} onClaim={onClaim} />
      </CardContent>
    </Card>
  );
}

/**
 * One changed slot in the viewpoint diff.
 * @param root0 - Row props.
 * @param root0.delta - The property delta to render.
 */
function DiffDeltaRow({ delta }: { readonly delta: PropertyDelta }) {
  return (
    <li className="flex items-center justify-between gap-2 rounded-md border px-3 py-2 text-sm">
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
          <Field id="diff-before" label={t('diff.before')}>
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
          </Field>
          <Field id="diff-after" label={t('diff.after')}>
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
          </Field>
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
              <DiffDeltaRow key={`${delta.nodeId}-${delta.field}`} delta={delta} />
            ))}
          </ul>
        ) : undefined}
      </CardContent>
    </Card>
  );
}

/**
 * The lifecycle card: choose a workspace folder, then create or open it.
 * @param root0 - Card props.
 * @param root0.phase - The foundation lifecycle phase.
 * @param root0.errorMessage - The last operation error, if any.
 * @param root0.root - The chosen workspace folder path.
 * @param root0.onRootChange - Update the folder path.
 * @param root0.onCreate - Create a workspace at the folder.
 * @param root0.onOpen - Open a workspace at the folder.
 */
function WorkspaceLifecycleCard({
  phase,
  errorMessage,
  root,
  onRootChange,
  onCreate,
  onOpen,
}: {
  readonly phase: FoundationPhase;
  readonly errorMessage: string | undefined;
  readonly root: string;
  readonly onRootChange: (value: string) => void;
  readonly onCreate: () => void;
  readonly onOpen: () => void;
}) {
  const t = useTranslations('workspace');
  return (
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
              onRootChange(event.target.value);
            }}
          />
          <Button
            variant="outline"
            disabled={phase === 'busy'}
            onClick={() => {
              void (async () => {
                const picked = await pickWorkspaceFolder();
                if (picked !== undefined) {
                  onRootChange(picked);
                }
              })();
            }}
          >
            {t('foundation.browse')}
          </Button>
          <Button disabled={root.trim() === '' || phase === 'busy'} onClick={onCreate}>
            {t('foundation.create')}
          </Button>
          <Button
            variant="secondary"
            disabled={root.trim() === '' || phase === 'busy'}
            onClick={onOpen}
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
  );
}

/**
 * The proof-carrying status card: workspace id, applied op count, rebuild hash,
 * and the derived-runtime rebuild action.
 * @param root0 - Card props.
 * @param root0.status - The current workspace status.
 * @param root0.onRebuild - Rebuild the derived runtime.
 */
function FoundationStatusCard({
  status,
  onRebuild,
}: {
  readonly status: WorkspaceStatus;
  readonly onRebuild: () => void;
}) {
  const t = useTranslations('workspace');
  return (
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
          <span className="text-muted-foreground">{t('foundation.status.appliedOperations')}</span>
          <Badge variant="secondary">{status.appliedOpCount}</Badge>
        </div>
        <div className="flex items-center justify-between gap-2">
          <span className="text-muted-foreground">{t('foundation.status.rebuildHash')}</span>
          <code className="truncate" title={status.foundationRebuildHash}>
            {status.foundationRebuildHash.slice(0, 16)}…
          </code>
        </div>
        <div className="pt-1">
          <Button variant="outline" size="sm" onClick={onRebuild}>
            {t('foundation.status.rebuildDerivedRuntime')}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * The entities card: the typed authoring palette plus the derived node listing.
 * @param root0 - Card props.
 * @param root0.nodes - The authored entities (re-derived from the op log).
 * @param root0.types - The seed metamodel's authorable entity types.
 * @param root0.onAuthor - Author a metamodel-typed entity.
 * @param root0.onInspect - Select an entity in the shared inspector.
 */
function EntitiesCard({
  nodes,
  types,
  onAuthor,
  onInspect,
}: {
  readonly nodes: readonly NodeRecord[];
  readonly types: readonly MetaTypeInfo[];
  readonly onAuthor: (typeId: string, properties: Record<string, string>) => void;
  readonly onInspect: (objectId: string) => void;
}) {
  const t = useTranslations('workspace');
  return (
    <SectionCard title={t('entities.title')} description={t('entities.description')}>
      <TypedAuthoringForm types={types} onAuthor={onAuthor} />
      <ItemList isEmpty={nodes.length === 0} emptyText={t('entities.empty')} label="Node list">
        {nodes.map((node) => (
          <ListRow
            key={node.nodeId}
            typeLabel={node.typeLabel}
            tombstoned={node.tombstoned}
            onInspect={() => {
              onInspect(node.nodeId);
            }}
            code={<>{node.nodeId.slice(0, 8)}…</>}
          />
        ))}
      </ItemList>
    </SectionCard>
  );
}

/**
 * Shared details for the currently selected model object.
 * @param root0 - Inspector props.
 * @param root0.inspection - Selected object details, or absent before selection.
 */
function ObjectInspectorCard({
  inspection,
}: {
  readonly inspection: ObjectInspection | undefined;
}) {
  return (
    <SectionCard title="Inspector" description="Resolved meaning and canonical provenance">
      {inspection === undefined ? (
        <p className="text-muted-foreground text-sm">
          Select an entity or relationship to inspect it.
        </p>
      ) : (
        <div className="flex flex-col gap-3 text-sm">
          <div className="flex items-center gap-2">
            <Badge variant="secondary">{inspection.typeLabel ?? inspection.objectKind}</Badge>
            <code>{inspection.objectId.slice(0, 12)}…</code>
          </div>
          {inspection.properties.map((property) => (
            <div key={property.field} className="flex items-center justify-between gap-2">
              <span className="text-muted-foreground">{property.field}</span>
              <span>{property.value}</span>
            </div>
          ))}
          {inspection.provenance === null ? undefined : (
            <div className="border-t pt-3">
              <p className="font-medium">{inspection.provenance.rationale}</p>
              <p className="text-muted-foreground">{inspection.provenance.source}</p>
            </div>
          )}
        </div>
      )}
    </SectionCard>
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
  const [
    {
      phase,
      status,
      nodes,
      edges,
      metamodelTypes,
      viewpoint,
      resolved,
      selectedObject,
      errorMessage,
    },
    actions,
  ] = useWorkspaceFoundation();
  const [root, setRoot] = useState('');

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-4 p-4 md:p-6">
      <WorkspaceLifecycleCard
        phase={phase}
        errorMessage={errorMessage}
        root={root}
        onRootChange={setRoot}
        onCreate={() => {
          void actions.createWorkspace(root.trim());
        }}
        onOpen={() => {
          void actions.openWorkspace(root.trim());
        }}
      />

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
          <FoundationStatusCard
            status={status}
            onRebuild={() => {
              void actions.rebuild();
            }}
          />

          <EntitiesCard
            nodes={nodes}
            types={metamodelTypes}
            onAuthor={(typeId, properties) => {
              void actions.authorTypedNode(typeId, properties);
            }}
            onInspect={(objectId) => {
              void actions.inspectObject(objectId);
            }}
          />

          <RelationshipsCard
            edges={edges}
            nodes={nodes}
            onAuthor={(relationshipType, sourceId, destinationId, properties) => {
              void actions.authorTypedEdge(relationshipType, sourceId, destinationId, properties);
            }}
            onInspect={(objectId) => {
              void actions.inspectObject(objectId);
            }}
          />

          <ObjectInspectorCard inspection={selectedObject} />

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
