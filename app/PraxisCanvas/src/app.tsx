import { useCallback, useEffect, useMemo, useState } from 'react';

import { AppSidebar } from '@/components/app-sidebar';
import { CanvasPlaceholderCard } from '@/components/dashboard/canvas-placeholder-card';
import { PhaseCheckpointsCard } from '@/components/dashboard/phase-checkpoints-card';
import { WorkerHealthCard } from '@/components/dashboard/worker-health-card';
import { Button } from '@/components/ui/button';
import { toErrorMessage } from '@/lib/errors';
import {
  getGraphView,
  listScenarios,
  type GraphViewDefinition,
  type GraphViewModel,
  type ScenarioSummary,
} from '@/praxis-api';

interface GraphState {
  loading: boolean;
  error?: string;
  view?: GraphViewModel;
}

interface ScenarioState {
  loading: boolean;
  error?: string;
  data: ScenarioSummary[];
}

const GRAPH_VIEW_BASE: Omit<GraphViewDefinition, 'asOf'> = {
  id: 'executive-overview',
  name: 'Executive Overview',
  kind: 'graph',
  filters: {
    nodeTypes: ['Capability', 'Application'],
    edgeTypes: ['depends_on', 'supports'],
  },
};

export default function App() {
  const [graphState, setGraphState] = useState<GraphState>({ loading: true });
  const [scenarioState, setScenarioState] = useState<ScenarioState>({ loading: true, data: [] });

  const activeScenario = useMemo(
    () => scenarioState.data.find((scenario) => scenario.isDefault) ?? scenarioState.data[0],
    [scenarioState.data],
  );

  const refreshScenarios = useCallback(async () => {
    setScenarioState((previous) => ({ ...previous, loading: true, error: undefined }));
    try {
      const scenarios = await listScenarios();
      setScenarioState({ loading: false, data: scenarios });
    } catch (unknownError) {
      const message = toErrorMessage(unknownError);
      setScenarioState({ loading: false, data: [], error: message });
    }
  }, []);

  const refreshGraph = useCallback(async () => {
    setGraphState((previous) => ({ ...previous, loading: true, error: undefined }));
    try {
      const definition: GraphViewDefinition = {
        ...GRAPH_VIEW_BASE,
        asOf: new Date().toISOString(),
        scenario: activeScenario?.branch,
      };
      const view = await getGraphView(definition);
      setGraphState({ loading: false, view });
    } catch (unknownError) {
      const message = toErrorMessage(unknownError);
      setGraphState({ loading: false, error: message });
    }
  }, [activeScenario?.branch]);

  useEffect(() => {
    void refreshScenarios();
  }, [refreshScenarios]);

  useEffect(() => {
    void refreshGraph();
  }, [refreshGraph]);

  return (
    <div className="flex min-h-screen bg-muted/30 text-foreground">
      <AppSidebar scenarios={scenarioState.data} loading={scenarioState.loading} />
      <main className="flex flex-1 flex-col">
        <ShellHeader scenarioName={activeScenario?.name} />
        {scenarioState.error ? (
          <p className="px-6 pt-2 text-sm text-destructive">{scenarioState.error}</p>
        ) : null}
        <div className="flex flex-1 flex-col gap-6 p-6 lg:flex-row">
          <section className="flex-1">
            <CanvasPlaceholderCard
              state={graphState}
              onRefresh={() => {
                void refreshGraph();
              }}
            />
          </section>
          <section className="w-full space-y-6 lg:w-[360px]">
            <WorkerHealthCard />
            <PhaseCheckpointsCard />
          </section>
        </div>
      </main>
    </div>
  );
}

interface ShellHeaderProperties {
  readonly scenarioName?: string;
}

function ShellHeader({ scenarioName }: ShellHeaderProperties) {
  return (
    <header className="flex flex-col gap-4 border-b border-border/70 px-6 py-5 md:flex-row md:items-center md:justify-between">
      <div>
        <p className="text-xs uppercase tracking-[0.35em] text-muted-foreground">Active template</p>
        <h1 className="text-2xl font-semibold">Executive Overview</h1>
        <p className="text-sm text-muted-foreground">
          {scenarioName ? `Scenario: ${scenarioName}` : 'Scenario data pending'} - React Flow
          integration arrives in Phase 3.
        </p>
      </div>
      <div className="flex flex-wrap gap-3">
        <Button variant="secondary">Switch scenario</Button>
        <Button>Create widget</Button>
      </div>
    </header>
  );
}
