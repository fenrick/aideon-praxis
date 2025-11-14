import type { ComponentType, SVGProps } from 'react';

import { Layers, LayoutPanelTop, Network, NotebookTabs, Settings2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utilities';
import type { ScenarioSummary } from '@/praxis-api';

const NAV_ITEMS = [
  { label: 'Overview', icon: LayoutPanelTop, active: true },
  { label: 'Workflows', icon: NotebookTabs },
  { label: 'Canvases', icon: Network },
  { label: 'Catalogues', icon: Layers },
];

interface AppSidebarProperties {
  readonly scenarios: ScenarioSummary[];
  readonly loading: boolean;
}

export function AppSidebar({ scenarios, loading }: AppSidebarProperties) {
  const activeScenario = resolveActiveScenario(scenarios);
  const subtitle = loading
    ? 'Loading scenario data...'
    : (activeScenario?.description ?? 'No scenario metadata yet');
  const branchLabel = activeScenario
    ? `${activeScenario.branch} - updated ${formatDate(activeScenario.updatedAt)}`
    : 'Add a scenario to begin';

  return (
    <aside className="hidden min-h-screen w-72 flex-col border-r border-border/40 bg-slate-950/95 text-slate-100 shadow-xl md:flex">
      <div className="flex items-center gap-3 border-b border-white/10 px-6 py-5">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/15 text-lg font-semibold">
          PX
        </div>
        <div>
          <p className="text-sm uppercase tracking-wide text-white/70">Praxis Canvas</p>
          <p className="text-base font-semibold text-white">Digital Twin</p>
        </div>
      </div>
      <div className="flex flex-1 flex-col overflow-y-auto px-4 py-5">
        <div className="space-y-1">
          {NAV_ITEMS.map((item) => (
            <SidebarNavButton key={item.label} icon={item.icon} active={item.active}>
              {item.label}
            </SidebarNavButton>
          ))}
        </div>
        <div className="mt-8 space-y-2 text-xs text-white/60">
          <p className="font-medium uppercase tracking-[0.2em] text-[0.65rem]">Active Scenario</p>
          <div className="rounded-lg border border-white/15 bg-white/5 p-3">
            <p className="text-sm font-semibold text-white">
              {loading ? 'Resolving scenario...' : (activeScenario?.name ?? 'No scenario selected')}
            </p>
            <p className="text-xs text-white/75">{subtitle}</p>
            <p className="mt-2 text-[0.65rem] uppercase tracking-[0.35em] text-white/60">
              {branchLabel}
            </p>
          </div>
        </div>
      </div>
      <div className="border-t border-white/10 px-4 py-4">
        <Button
          variant="ghost"
          className="w-full justify-start gap-2 rounded-lg border border-white/10 bg-white/5 text-white hover:bg-white/10"
        >
          <Settings2 className="h-4 w-4" />
          Canvas Settings
        </Button>
      </div>
    </aside>
  );
}

interface SidebarNavButtonProperties {
  readonly icon: ComponentType<SVGProps<SVGSVGElement>>;
  readonly children: React.ReactNode;
  readonly active?: boolean;
}

function SidebarNavButton({ icon: Icon, children, active }: SidebarNavButtonProperties) {
  return (
    <button
      type="button"
      className={cn(
        'group flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition',
        active
          ? 'bg-white/15 text-white shadow-lg shadow-blue-500/10'
          : 'text-white/70 hover:bg-white/10 hover:text-white',
      )}
    >
      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white/10">
        <Icon className="h-4 w-4" />
      </span>
      {children}
    </button>
  );
}

function resolveActiveScenario(scenarios: ScenarioSummary[]): ScenarioSummary | undefined {
  return scenarios.find((scenario) => scenario.isDefault) ?? scenarios[0];
}

function formatDate(value: string | undefined): string {
  if (!value) {
    return 'recently';
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }
  return parsed.toLocaleDateString();
}
