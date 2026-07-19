import {
  Alert,
  AlertDescription,
  AlertTitle,
  Badge,
  Button,
  EmptyState,
  ExplanationSurface,
  Input,
  InspectorPanel,
  InspectorSection,
  InspectorSectionGroup,
  Label,
  PropertyList,
  ProvenancePanel,
  Textarea,
  type PropertyItem,
} from 'design-system';
import { AlertCircle, MousePointer2 } from 'design-system/icons';
import { useTranslations } from 'next-intl';
import { useCallback, useState, type ReactNode } from 'react';

import type { SelectionProperties } from 'praxis/stores/selection-store';
import type { SelectionKind } from 'praxis/types';

import { useHostPlatform } from './host-platform-context';

/** Editable inspector fields, mirroring the host inspector-save contract. */
type EditableField = 'name' | 'description' | 'dataSource' | 'layout';

type EditableValues = Record<EditableField, string>;

type InspectorTranslate = ReturnType<typeof useTranslations<'platform.inspector'>>;

interface InspectorContentProperties {
  readonly selectionId: string;
  readonly selectionKind: SelectionKind;
  readonly properties?: SelectionProperties;
  readonly saving: boolean;
  readonly error?: string;
  readonly reloadTick: number;
  readonly onSave: (patch: Record<string, string | undefined>) => void;
  readonly onReset: () => void;
}

/**
 * Resolve the human-readable label for a selection kind.
 * @param kind - Current selection kind.
 * @param t - Inspector translator.
 * @returns The localised kind label.
 */
function selectionKindLabel(kind: SelectionKind, t: InspectorTranslate): string {
  switch (kind) {
    case 'node': {
      return t('kindNode');
    }
    case 'edge': {
      return t('kindEdge');
    }
    case 'artefact': {
      return t('kindArtefact');
    }
    case 'cell': {
      return t('kindCell');
    }
    case 'none': {
      return t('kindObject');
    }
    default: {
      return t('kindObject');
    }
  }
}

/**
 * Derive the editable field values from the resolved selection properties.
 * @param properties - Merged selection properties, if any.
 * @returns The editable values, with blanks for absent fields.
 */
function toEditableValues(properties?: SelectionProperties): EditableValues {
  return {
    name: properties?.name ?? '',
    description: properties?.description ?? '',
    dataSource: properties?.dataSource ?? '',
    layout: properties?.layout ?? '',
  };
}

/**
 * Convert an edited string into a patch value, treating blanks as cleared.
 * @param value - Current field value.
 * @returns The trimmed value, or undefined when empty.
 */
function toPatchValue(value: string): string | undefined {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

/**
 * A single labelled, editable text field within the properties form.
 * @param root0 - Component props.
 * @param root0.id - Input id used to bind the label.
 * @param root0.label - Field label text.
 * @param root0.value - Current field value.
 * @param root0.disabled - Whether the field is read-only during a save.
 * @param root0.multiline - Whether to render a textarea instead of an input.
 * @param root0.onChange - Change handler receiving the next value.
 */
function EditablePropertyField({
  id,
  label,
  value,
  disabled,
  multiline = false,
  onChange,
}: {
  readonly id: string;
  readonly label: string;
  readonly value: string;
  readonly disabled: boolean;
  readonly multiline?: boolean;
  readonly onChange: (next: string) => void;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id} className="text-muted-foreground text-xs">
        {label}
      </Label>
      {multiline ? (
        <Textarea
          id={id}
          value={value}
          disabled={disabled}
          rows={3}
          onChange={(event) => {
            onChange(event.target.value);
          }}
        />
      ) : (
        <Input
          id={id}
          value={value}
          disabled={disabled}
          onChange={(event) => {
            onChange(event.target.value);
          }}
        />
      )}
    </div>
  );
}

/**
 * Whether the selection carries edge endpoints worth showing as derived rows.
 * @param properties - Merged selection properties, if any.
 * @returns True when either endpoint is present.
 */
function hasEndpoints(properties: SelectionProperties | undefined): boolean {
  if (!properties) {
    return false;
  }
  return properties.from !== undefined || properties.to !== undefined;
}

/**
 * Build the read-only derived rows (type, endpoints) for the current selection.
 * @param properties - Merged selection properties, if any.
 * @param t - Inspector translator.
 * @returns Property list items for the derived, non-editable fields.
 */
function derivedPropertyItems(
  properties: SelectionProperties | undefined,
  t: InspectorTranslate,
): PropertyItem[] {
  const empty = t('fieldEmpty');
  const rows: PropertyItem[] = [
    { key: 'type', label: t('fieldType'), value: properties?.type ?? empty },
  ];
  if (hasEndpoints(properties)) {
    rows.push(
      { key: 'from', label: t('fieldFrom'), value: properties?.from ?? empty },
      { key: 'to', label: t('fieldTo'), value: properties?.to ?? empty },
    );
  }
  return rows;
}

/**
 * Editable properties form for the current selection. Commits edits through the
 * host inspector-save contract and reverts stored edits via the reset callback.
 * @param root0 - Component props.
 * @param root0.properties - Merged selection properties, if any.
 * @param root0.saving - Whether a save is in flight.
 * @param root0.error - Latest save error, if any.
 * @param root0.onSave - Commits the edited patch.
 * @param root0.onReset - Reverts stored edits for the selection.
 */
function PropertiesForm({
  properties,
  saving,
  error,
  onSave,
  onReset,
}: {
  readonly properties?: SelectionProperties;
  readonly saving: boolean;
  readonly error?: string;
  readonly onSave: (patch: Record<string, string | undefined>) => void;
  readonly onReset: () => void;
}) {
  const t = useTranslations('platform.inspector');
  const [values, setValues] = useState<EditableValues>(() => toEditableValues(properties));

  const setField = useCallback((field: EditableField, next: string) => {
    setValues((previous) => ({ ...previous, [field]: next }));
  }, []);

  const handleSubmit = useCallback(() => {
    onSave({
      name: toPatchValue(values.name),
      description: toPatchValue(values.description),
      dataSource: toPatchValue(values.dataSource),
      layout: toPatchValue(values.layout),
    });
  }, [onSave, values]);

  return (
    <div className="flex flex-col gap-3">
      <EditablePropertyField
        id="inspector-name"
        label={t('fieldName')}
        value={values.name}
        disabled={saving}
        onChange={(next) => {
          setField('name', next);
        }}
      />
      <EditablePropertyField
        id="inspector-description"
        label={t('fieldDescription')}
        value={values.description}
        disabled={saving}
        multiline
        onChange={(next) => {
          setField('description', next);
        }}
      />
      <EditablePropertyField
        id="inspector-data-source"
        label={t('fieldDataSource')}
        value={values.dataSource}
        disabled={saving}
        onChange={(next) => {
          setField('dataSource', next);
        }}
      />
      <EditablePropertyField
        id="inspector-layout"
        label={t('fieldLayout')}
        value={values.layout}
        disabled={saving}
        onChange={(next) => {
          setField('layout', next);
        }}
      />
      <PropertyList items={derivedPropertyItems(properties, t)} />
      {error ? (
        <Alert variant="destructive">
          <AlertCircle aria-hidden />
          <AlertTitle>{t('saveError')}</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : undefined}
      <div className="flex gap-2 pt-1">
        <Button type="button" size="sm" disabled={saving} onClick={handleSubmit}>
          {saving ? t('saving') : t('save')}
        </Button>
        <Button type="button" size="sm" variant="outline" disabled={saving} onClick={onReset}>
          {t('reset')}
        </Button>
      </div>
    </div>
  );
}

/**
 * Wrap section content in a titled inspector frame.
 * @param root0 - Component props.
 * @param root0.title - Panel title.
 * @param root0.badge - Optional badge shown alongside the title.
 * @param root0.children - Panel body.
 */
function InspectorFrame({
  title,
  badge,
  children,
}: {
  readonly title: string;
  readonly badge?: ReactNode;
  readonly children: ReactNode;
}) {
  return (
    <InspectorPanel title={title} badge={badge}>
      {children}
    </InspectorPanel>
  );
}

/**
 * Inspector body shown when an object is selected: grouped Properties,
 * Explanation, Provenance, and Valid actions sections.
 * @param root0 - Inspector content props sourced from the host platform context.
 * @param root0.selectionId - Primary selection identifier.
 * @param root0.selectionKind - Kind of the current selection.
 * @param root0.properties - Merged selection properties, if any.
 * @param root0.saving - Whether a save is in flight.
 * @param root0.error - Latest save error, if any.
 * @param root0.reloadTick - Save-reload counter used to re-derive the form.
 * @param root0.onSave - Commits the edited patch.
 * @param root0.onReset - Reverts stored edits for the selection.
 */
export function InspectorContent({
  selectionId,
  selectionKind,
  properties,
  saving,
  error,
  reloadTick,
  onSave,
  onReset,
}: InspectorContentProperties) {
  const t = useTranslations('platform.inspector');
  const [resetNonce, setResetNonce] = useState(0);

  const handleReset = useCallback(() => {
    onReset();
    setResetNonce((previous) => previous + 1);
  }, [onReset]);

  const formKey = `${selectionId}:${String(reloadTick)}:${String(resetNonce)}`;

  const kindBadge = (
    <Badge variant="secondary" className="text-[0.6rem] tracking-widest uppercase">
      {selectionKindLabel(selectionKind, t)}
    </Badge>
  );

  return (
    <InspectorFrame title={t('title')} badge={kindBadge}>
      <InspectorSectionGroup defaultValue="properties">
        <InspectorSection label={t('sectionProperties')} value="properties">
          <PropertiesForm
            key={formKey}
            properties={properties}
            saving={saving}
            error={error}
            onSave={onSave}
            onReset={handleReset}
          />
        </InspectorSection>
        <InspectorSection label={t('sectionExplanation')} value="explanation">
          <ExplanationSurface heading={t('sectionExplanation')}>
            {t('explanationPlaceholder')}
          </ExplanationSurface>
        </InspectorSection>
        <InspectorSection label={t('sectionProvenance')} value="provenance">
          <ProvenancePanel
            classification="asserted"
            source={t('provenanceSource')}
            detail={t('provenanceDetail')}
          />
        </InspectorSection>
        <InspectorSection label={t('sectionActions')} value="actions">
          <p className="text-muted-foreground text-sm">{t('actionsPlaceholder')}</p>
        </InspectorSection>
      </InspectorSectionGroup>
    </InspectorFrame>
  );
}

/**
 * Inspector body shown when nothing is selected.
 */
export function InspectorEmpty() {
  const t = useTranslations('platform.inspector');
  return (
    <InspectorFrame title={t('title')}>
      <EmptyState
        icon={MousePointer2}
        title={t('emptyTitle')}
        description={t('emptyDescription')}
      />
    </InspectorFrame>
  );
}

/**
 * Right-hand inspector bound to the host platform context. Renders an empty
 * state until a canvas object is selected, then its editable properties and
 * supporting explanation, provenance, and actions sections.
 */
export function PlatformInspector() {
  const {
    selectionId,
    selectionKind,
    selectedProperties,
    propertyState,
    onInspectorSave,
    onInspectorReset,
  } = useHostPlatform();

  if (!selectionId) {
    return <InspectorEmpty />;
  }

  return (
    <InspectorContent
      selectionId={selectionId}
      selectionKind={selectionKind ?? 'none'}
      properties={selectedProperties}
      saving={propertyState.saving}
      error={propertyState.error}
      reloadTick={propertyState.reloadTick}
      onSave={onInspectorSave}
      onReset={onInspectorReset}
    />
  );
}
