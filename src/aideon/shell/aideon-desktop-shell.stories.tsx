import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { Card, CardContent, CardHeader, CardTitle } from 'design-system';

import { AideonDesktopShell } from './aideon-desktop-shell';
import { AideonToolbar } from './aideon-toolbar';

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
          'The host platform shell: navigation rail, toolbar, content surface, and inspector rail.',
      },
    },
  },
} satisfies Meta<typeof AideonDesktopShell>;

export default meta;

type Story = StoryObj<typeof meta>;

export const HostPlatform: Story = {
  args: {
    contentLayout: 'scroll',
    navigation: <div className="text-muted-foreground p-4 text-sm">Navigation — not yet built</div>,
    toolbar: <AideonToolbar title="Aideon" modeLabel="Desktop" />,
    content: <ContentSurface />,
    inspector: <InspectorSurface />,
  },
};
