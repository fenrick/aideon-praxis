import { useCallback, useEffect, useState } from 'react';

import { AlertCircle, RefreshCw } from 'lucide-react';

import { toErrorMessage } from '@/lib/errors';
import { getWorkerHealth, type WorkerHealth } from '@/praxis-api';
import { Button } from '@aideon/design-system/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@aideon/design-system/components/ui/card';

interface HealthState {
  snapshot?: WorkerHealth;
  loading: boolean;
  error?: string;
}

const INITIAL_STATE: HealthState = {
  loading: true,
};

export function WorkerHealthCard() {
  const [state, setState] = useState<HealthState>(INITIAL_STATE);

  const refresh = useCallback(async () => {
    setState((previous) => ({ ...previous, loading: true, error: undefined }));
    try {
      const snapshot = await getWorkerHealth();
      setState({ loading: false, snapshot });
    } catch (unknownError) {
      const message = toErrorMessage(unknownError);
      setState({ loading: false, error: message });
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const timestamp = state.snapshot
    ? new Date(state.snapshot.timestamp_ms).toLocaleTimeString()
    : 'N/A';

  return (
    <Card>
      <CardHeader>
        <CardTitle>Worker health</CardTitle>
        <CardDescription>Rust engine status via Tauri IPC.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <StatusPill status={state.snapshot} loading={state.loading} timestamp={timestamp} />
        {state.error ? (
          <p className="flex items-center gap-2 text-sm text-destructive">
            <AlertCircle className="h-4 w-4" /> {state.error}
          </p>
        ) : (
          <p className="text-sm text-muted-foreground">
            {state.snapshot?.notes ?? 'Engine responds with mock data when Tauri is offline.'}
          </p>
        )}
        <div className="flex items-center justify-end">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => void refresh()}
            disabled={state.loading}
          >
            <RefreshCw className={state.loading ? 'mr-2 h-4 w-4 animate-spin' : 'mr-2 h-4 w-4'} />
            Refresh
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

interface StatusPillProperties {
  readonly status?: WorkerHealth;
  readonly timestamp: string;
  readonly loading: boolean;
}

function StatusPill({ status, timestamp, loading }: StatusPillProperties) {
  const ok = status?.ok ?? false;
  const containerClass = ok
    ? 'flex items-center gap-3 rounded-full border px-4 py-2 text-sm border-emerald-200 bg-emerald-50 text-emerald-700'
    : 'flex items-center gap-3 rounded-full border px-4 py-2 text-sm border-amber-200 bg-amber-50 text-amber-700';
  let statusLabel = 'Needs attention';
  if (loading) {
    statusLabel = 'Checking...';
  } else if (ok) {
    statusLabel = 'Operational';
  }
  const statusSuffix = status?.status ? ` - ${status.status}` : '';
  const timestampLabel = loading ? 'Pending' : `Updated ${timestamp}${statusSuffix}`;
  return (
    <div className={containerClass}>
      <span className="font-semibold">{statusLabel}</span>
      <span className="text-xs text-emerald-900/70">{timestampLabel}</span>
    </div>
  );
}
