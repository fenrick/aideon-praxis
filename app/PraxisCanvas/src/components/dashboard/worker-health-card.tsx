import { useCallback, useEffect, useState } from 'react';

import { HeartPulse, RefreshCw } from 'lucide-react';

import { toErrorMessage } from '@/lib/errors';
import { getWorkerHealth, type WorkerHealth } from '@/praxis-api';
import { Alert, AlertDescription, AlertTitle } from '@aideon/design-system/components/ui/alert';
import { Badge } from '@aideon/design-system/components/ui/badge';
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
  let badgeLabel = 'Needs attention';
  let badgeVariant: 'secondary' | 'default' | 'outline' = 'outline';
  if (state.loading) {
    badgeLabel = 'Checking…';
    badgeVariant = 'secondary';
  } else if (state.snapshot?.ok) {
    badgeLabel = 'Operational';
    badgeVariant = 'default';
  }
  const description =
    state.error ?? state.snapshot?.notes ?? 'Engine responds with mock data when Tauri is offline.';

  return (
    <Card>
      <CardHeader>
        <CardTitle>Worker health</CardTitle>
        <CardDescription>Rust engine status via Tauri IPC.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert variant={state.error ? 'destructive' : 'default'} className="space-y-2">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <HeartPulse className="h-4 w-4" />
              <AlertTitle className="text-sm">Runtime</AlertTitle>
            </div>
            <Badge variant={badgeVariant}>{badgeLabel}</Badge>
          </div>
          <AlertDescription className="space-y-1 text-sm">
            <p>{description}</p>
            <p className="text-xs text-muted-foreground">
              {state.loading ? 'Pending response…' : `Updated ${timestamp}`}
            </p>
          </AlertDescription>
        </Alert>
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
