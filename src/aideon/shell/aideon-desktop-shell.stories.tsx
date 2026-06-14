import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { PraxisWorkspaceToolbar } from 'praxis/components/chrome/praxis-workspace-toolbar';
import { ProjectsSidebar } from 'praxis/components/template-screen/projects-sidebar';
import type { ScenarioSummary } from 'praxis/praxis-api';
import { BUILT_IN_TEMPLATES } from 'praxis/templates';
import type { TemporalPanelActions, TemporalPanelState } from 'praxis/time/use-temporal-panel';
import type { WorkspaceNavigationProperties } from 'workspaces/types';

import { Card, CardContent, CardHeader, CardTitle } from 'design-system';

import { AideonDesktopNavigation } from './aideon-desktop-navigation';
import { AideonDesktopShell } from './aideon-desktop-shell';
import { AideonToolbar } from './aideon-toolbar';

const noop = () => {
  return;
};

const workspaceOptions: WorkspaceNavigationProperties['workspaceOptions'] = [
  { id: 'praxis', label: 'Praxis', disabled: false },
  { id: 'metis', label: 'Metis', disabled: true },
  { id: 'mneme', label: 'Mneme', disabled: true },
];

const scenarios: ScenarioSummary[] = [
  {
    id: 's1',
    name: 'Current State',
    branch: 'main',
    updatedAt: '2026-06-01T10:00:00Z',
    isDefault: true,
  },
  {
    id: 's2',
    name: 'Target State 2026',
    branch: 'scenario/target-2026',
    updatedAt: '2026-06-10T14:30:00Z',
  },
  {
    id: 's3',
    name: 'Cloud Migration',
    branch: 'scenario/cloud-migration',
    updatedAt: '2026-05-20T09:00:00Z',
  },
];

const temporalState: TemporalPanelState = {
  branches: [{ name: 'main' }, { name: 'scenario/target-2026' }],
  branch: 'main',
  commits: [
    {
      id: 'c1',
      branch: 'main',
      parents: [],
      message: 'Seed baseline',
      time: '2026-06-12T09:00:00Z',
      tags: [],
      changeCount: 12,
    },
  ],
  commitId: 'c1',
  loading: false,
  snapshotLoading: false,
  merging: false,
  layer: 'Plan',
};

const temporalActions: TemporalPanelActions = {
  selectBranch: () => Promise.resolve(),
  selectCommit: noop,
  selectLayer: noop,
  refreshBranches: () => Promise.resolve(),
  mergeIntoMain: () => Promise.resolve(),
};

/**
 * Representative content surface standing in for an executed artefact result.
 */
function ContentSurface() {
  return (
    <div className="grid h-full grid-cols-1 gap-4 lg:grid-cols-2">
      {['Capability map', 'Cost rollup', 'Impact analysis', 'Catalogue'].map((title) => (
        <Card key={title} className="min-h-[180px]">
          <CardHeader>
            <CardTitle className="text-sm">{title}</CardTitle>
          </CardHeader>
          <CardContent className="text-muted-foreground text-sm">
            Artefact result rendered at the current viewpoint.
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

/**
 * Representative inspector content for a selected entity.
 */
function InspectorSurface() {
  return (
    <div className="space-y-3">
      <div>
        <p className="text-muted-foreground text-xs tracking-wider uppercase">Selection</p>
        <p className="text-foreground text-sm font-medium">Payments Platform</p>
      </div>
      <div className="space-y-1 text-sm">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Type</span>
          <span>Application</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Layer</span>
          <span>Plan</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Provenance</span>
          <span>Asserted</span>
        </div>
      </div>
    </div>
  );
}

const meta = {
  component: AideonDesktopShell,
  tags: ['autodocs'],
  title: 'Aideon/Shell/HostWorkspace',
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'The host workspace shell: navigation rail, toolbar (with the always-visible viewpoint bar), content surface, and inspector rail. Resize the viewport to see how the four regions reflow.',
      },
    },
  },
} satisfies Meta<typeof AideonDesktopShell>;

export default meta;

type Story = StoryObj<typeof meta>;

export const PraxisWorkspace: Story = {
  args: {
    contentLayout: 'scroll',
    navigation: (
      <AideonDesktopNavigation
        activeWorkspaceId="praxis"
        workspaceOptions={workspaceOptions}
        onWorkspaceSelect={noop}
      >
        <ProjectsSidebar
          scenarios={scenarios}
          loading={false}
          activeScenarioId="s1"
          onSelectScenario={noop}
        />
      </AideonDesktopNavigation>
    ),
    toolbar: (
      <AideonToolbar
        title="Aideon"
        subtitle="Praxis workspace"
        modeLabel="Desktop"
        workspaceToolbar={
          <PraxisWorkspaceToolbar
            templates={BUILT_IN_TEMPLATES}
            activeTemplateId={BUILT_IN_TEMPLATES[0]?.id ?? ''}
            templateName="Executive overview"
            onTemplateChange={noop}
            onTemplateSave={noop}
            onCreateWidget={noop}
            temporalState={temporalState}
            temporalActions={temporalActions}
          />
        }
      />
    ),
    content: <ContentSurface />,
    inspector: <InspectorSurface />,
  },
};
