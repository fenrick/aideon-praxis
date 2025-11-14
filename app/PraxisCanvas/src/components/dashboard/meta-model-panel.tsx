import { useCallback, useEffect, useState } from 'react';

import { fetchMetaModel, type MetaModelSchema } from '@/lib/meta-model';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

type Status = 'idle' | 'loading' | 'ready' | 'error';

export function MetaModelPanel() {
  const [status, setStatus] = useState<Status>('idle');
  const [schema, setSchema] = useState<MetaModelSchema | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadSchema = useCallback(async () => {
    setStatus('loading');
    setError(null);
    try {
      const result = await fetchMetaModel();
      setSchema(result);
      setStatus('ready');
    } catch (unknownError) {
      const message = unknownError instanceof Error ? unknownError.message : String(unknownError);
      setError(message);
      setStatus('error');
    }
  }, []);

  useEffect(() => {
    void loadSchema();
  }, [loadSchema]);

  return (
    <Card>
      <CardHeader className="space-y-1">
        <CardTitle>Schema reference</CardTitle>
        <CardDescription>
          {schema?.description ?? 'Meta-model entities and relationship definitions.'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
          <span className="rounded-full border border-border/70 px-3 py-1 font-medium">
            Version · {schema?.version ?? 'loading'}
          </span>
          <span className="rounded-full border border-border/70 px-3 py-1 font-medium">
            Status · {status === 'ready' ? 'live' : status}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              void loadSchema();
            }}
            disabled={status === 'loading'}
          >
            Refresh
          </Button>
        </div>
        {renderSchemaState({
          status,
          schema,
          error,
          onRetry: () => {
            void loadSchema();
          },
        })}
      </CardContent>
    </Card>
  );
}

function renderSchemaState(parameters: {
  readonly status: Status;
  readonly schema: MetaModelSchema | null;
  readonly error: string | null;
  readonly onRetry: () => void;
}) {
  const { status, schema, error, onRetry } = parameters;
  if (status === 'error') {
    return (
      <div className="rounded-2xl border border-destructive/40 bg-destructive/5 p-4 text-xs">
        <p className="font-semibold text-destructive">Failed to load meta-model</p>
        <p className="text-destructive/80">{error}</p>
        <Button
          variant="outline"
          size="sm"
          className="mt-3"
          onClick={() => {
            onRetry();
          }}
        >
          Retry
        </Button>
      </div>
    );
  }
  if (status === 'loading' && !schema) {
    return <p className="text-xs text-muted-foreground">Fetching schema…</p>;
  }
  if (!schema) {
    return <p className="text-xs text-muted-foreground">Schema not available yet.</p>;
  }
  return <SchemaDetails schema={schema} />;
}

function SchemaDetails({ schema }: { readonly schema: MetaModelSchema }) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 rounded-2xl border border-border/60 bg-muted/10 p-4 text-center text-sm">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Types</p>
          <p className="text-2xl font-semibold">{schema.types.length}</p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Relationships</p>
          <p className="text-2xl font-semibold">{schema.relationships.length}</p>
        </div>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <ul className="space-y-3">
          {schema.types.map((type) => (
            <li key={type.id} className="rounded-2xl border border-border/60 p-3">
              <p className="text-sm font-semibold">{type.label ?? type.id}</p>
              <p className="text-xs text-muted-foreground">{type.category ?? 'Uncategorised'}</p>
              {type.extends ? (
                <p className="text-xs text-muted-foreground">Extends {type.extends}</p>
              ) : null}
              <AttributesList attributes={type.attributes} />
            </li>
          ))}
        </ul>
        <ul className="space-y-3">
          {schema.relationships.map((relationship) => (
            <li key={relationship.id} className="rounded-2xl border border-border/60 p-3">
              <p className="text-sm font-semibold">{relationship.label ?? relationship.id}</p>
              <p className="text-xs text-muted-foreground">
                {relationship.from.join(', ')} → {relationship.to.join(', ')} ·{' '}
                {relationship.directed === false ? 'Undirected' : 'Directed'}
              </p>
              <AttributesList attributes={relationship.attributes} />
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function AttributesList({
  attributes,
}: {
  readonly attributes?: MetaModelSchema['types'][number]['attributes'];
}) {
  if (!attributes || attributes.length === 0) {
    return <p className="text-xs text-muted-foreground">No attributes defined.</p>;
  }
  return (
    <dl className="mt-2 space-y-2 text-xs">
      {attributes.map((attribute) => (
        <div key={attribute.name} className="flex justify-between gap-2">
          <dt className="font-medium">
            {attribute.name}
            {attribute.required ? (
              <span className="ml-2 rounded-full bg-destructive/10 px-2 py-0.5 text-[0.65rem] text-destructive">
                required
              </span>
            ) : null}
          </dt>
          <dd className="text-muted-foreground">
            {attribute.type}
            {attribute.enum?.length ? ` [${attribute.enum.join(', ')}]` : ''}
          </dd>
        </div>
      ))}
    </dl>
  );
}
