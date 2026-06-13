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
} from 'design-system';
import { HeartPulse, RefreshCw } from 'design-system/icons';
import { useWorkerHealth } from 'praxis/health/use-worker-health';

/**
 *
 */
export function WorkerHealthCard() {
  const [state, actions] = useWorkerHealth();

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
  const description = state.error ?? state.snapshot?.notes ?? 'Awaiting host response.';

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
            <p className="text-muted-foreground text-xs">
              {state.loading ? 'Pending response…' : `Updated ${timestamp}`}
            </p>
          </AlertDescription>
        </Alert>
        <div className="flex items-center justify-end">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              actions.refresh().catch(() => false);
            }}
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
