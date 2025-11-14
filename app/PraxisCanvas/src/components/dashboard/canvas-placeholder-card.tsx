import { RefreshCw } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utilities';
import type { GraphViewModel } from '@/praxis-api';

interface CanvasPlaceholderCardProperties {
  readonly state: Readonly<{
    loading: boolean;
    error?: string;
    view?: GraphViewModel;
  }>;
  readonly onRefresh: () => void;
}

export function CanvasPlaceholderCard({ state, onRefresh }: CanvasPlaceholderCardProperties) {
  const stats = state.view?.stats;
  const metadata = state.view?.metadata;
  const description = metadata
    ? `As of ${new Date(metadata.asOf).toLocaleString()} (${metadata.scenario ?? 'main'})`
    : 'React Flow mount target - Phase 3 placeholder';

  return (
    <Card className="h-full min-h-[380px]">
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <CardTitle>{metadata?.name ?? 'Canvas runtime'}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </div>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              onRefresh();
            }}
            disabled={state.loading}
            className="shrink-0"
          >
            <RefreshCw className={cn('mr-2 h-4 w-4', state.loading && 'animate-spin')} />
            Refresh graph
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid grid-cols-2 gap-4">
          <StatTile label="Nodes" value={stats?.nodes} loading={state.loading} />
          <StatTile label="Edges" value={stats?.edges} loading={state.loading} />
        </div>
        {state.error ? (
          <p className="text-sm text-destructive">{state.error}</p>
        ) : (
          <p className="text-sm text-muted-foreground">
            Graph data is loaded via praxisApi and rendered once the React Flow widgets land in
            Phase 3.
          </p>
        )}
        <div className="flex h-[240px] items-center justify-center rounded-2xl border border-dashed border-border/80 bg-muted/20 text-sm text-muted-foreground">
          React Flow widgets will render here.
        </div>
      </CardContent>
    </Card>
  );
}

interface StatTileProperties {
  readonly label: string;
  readonly value?: number;
  readonly loading: boolean;
}

function StatTile({ label, value, loading }: StatTileProperties) {
  let displayValue: string | number;
  if (loading) {
    displayValue = '...';
  } else if (typeof value === 'number') {
    displayValue = value;
  } else {
    displayValue = '0';
  }
  return (
    <div className="rounded-2xl border border-border/70 bg-card px-4 py-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-3xl font-semibold tracking-tight">{displayValue}</p>
    </div>
  );
}
