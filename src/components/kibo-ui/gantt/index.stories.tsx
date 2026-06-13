import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import {
  GanttFeatureItem,
  GanttFeatureList,
  GanttFeatureListGroup,
  GanttFeatureRow,
  GanttHeader,
  GanttMarker,
  GanttProvider,
  GanttSidebar,
  GanttSidebarGroup,
  GanttSidebarItem,
  GanttTimeline,
  GanttToday,
} from './index';

const meta = {
  component: GanttProvider,
  tags: ['autodocs'],
  title: 'Kibo UI/Gantt',
} satisfies Meta<typeof GanttProvider>;

export default meta;
type Story = StoryObj<typeof meta>;

const features = [
  {
    id: 'f1',
    name: 'Design system foundation',
    startAt: new Date('2024-10-01'),
    endAt: new Date('2024-11-15'),
    status: { id: 's1', name: 'Done', color: '#22c55e' },
  },
  {
    id: 'f2',
    name: 'Authentication flow',
    startAt: new Date('2024-11-01'),
    endAt: new Date('2024-12-01'),
    status: { id: 's2', name: 'In Progress', color: '#3b82f6' },
  },
  {
    id: 'f3',
    name: 'Dashboard widgets',
    startAt: new Date('2024-11-15'),
    endAt: new Date('2025-01-15'),
    status: { id: 's3', name: 'Planned', color: '#f59e0b' },
  },
  {
    id: 'f4',
    name: 'API integration',
    startAt: new Date('2024-12-01'),
    endAt: new Date('2025-02-01'),
    status: { id: 's4', name: 'Planned', color: '#f59e0b' },
  },
];

const markers = [
  {
    id: 'm1',
    date: new Date('2024-11-15'),
    label: 'Milestone v1',
  },
];

export const Monthly: Story = {
  render: () => (
    <div style={{ height: 400 }}>
      <GanttProvider range="monthly">
        <GanttSidebar>
          <GanttSidebarGroup name="Features">
            {features.map((f) => (
              <GanttSidebarItem feature={f} key={f.id} />
            ))}
          </GanttSidebarGroup>
        </GanttSidebar>
        <GanttTimeline>
          <GanttHeader />
          <GanttFeatureList>
            <GanttFeatureListGroup>
              <GanttFeatureRow features={features} />
            </GanttFeatureListGroup>
          </GanttFeatureList>
          <GanttToday />
          {markers.map((m) => (
            <GanttMarker key={m.id} {...m} />
          ))}
        </GanttTimeline>
      </GanttProvider>
    </div>
  ),
};

export const Quarterly: Story = {
  render: () => (
    <div style={{ height: 400 }}>
      <GanttProvider range="quarterly">
        <GanttSidebar>
          <GanttSidebarGroup name="Roadmap">
            {features.map((f) => (
              <GanttSidebarItem feature={f} key={f.id} />
            ))}
          </GanttSidebarGroup>
        </GanttSidebar>
        <GanttTimeline>
          <GanttHeader />
          <GanttFeatureList>
            <GanttFeatureListGroup>
              <GanttFeatureRow features={features} />
            </GanttFeatureListGroup>
          </GanttFeatureList>
          <GanttToday />
        </GanttTimeline>
      </GanttProvider>
    </div>
  ),
};

export const Daily: Story = {
  render: () => (
    <div style={{ height: 400 }}>
      <GanttProvider range="daily">
        <GanttSidebar>
          <GanttSidebarGroup name="Tasks">
            {features.slice(0, 2).map((f) => (
              <GanttSidebarItem feature={f} key={f.id} />
            ))}
          </GanttSidebarGroup>
        </GanttSidebar>
        <GanttTimeline>
          <GanttHeader />
          <GanttFeatureList>
            <GanttFeatureListGroup>
              <GanttFeatureRow features={features.slice(0, 2)} />
            </GanttFeatureListGroup>
          </GanttFeatureList>
          <GanttToday />
        </GanttTimeline>
      </GanttProvider>
    </div>
  ),
};

export const WithCustomItems: Story = {
  render: () => (
    <div style={{ height: 400 }}>
      <GanttProvider range="monthly">
        <GanttSidebar>
          <GanttSidebarGroup name="Features">
            {features.map((f) => (
              <GanttSidebarItem feature={f} key={f.id} />
            ))}
          </GanttSidebarGroup>
        </GanttSidebar>
        <GanttTimeline>
          <GanttHeader />
          <GanttFeatureList>
            <GanttFeatureListGroup>
              <GanttFeatureRow features={features}>
                {(feature) => (
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <div
                      className="h-2 w-2 rounded-full shrink-0"
                      style={{ backgroundColor: feature.status.color }}
                    />
                    <span className="truncate text-xs font-medium">{feature.name}</span>
                  </div>
                )}
              </GanttFeatureRow>
            </GanttFeatureListGroup>
          </GanttFeatureList>
          <GanttToday />
        </GanttTimeline>
      </GanttProvider>
    </div>
  ),
};

export const NoSidebar: Story = {
  render: () => (
    <div style={{ height: 400 }}>
      <GanttProvider range="monthly">
        <GanttTimeline>
          <GanttHeader />
          <GanttFeatureList>
            <GanttFeatureListGroup>
              <GanttFeatureRow features={features} />
            </GanttFeatureListGroup>
          </GanttFeatureList>
          <GanttToday />
        </GanttTimeline>
      </GanttProvider>
    </div>
  ),
};
