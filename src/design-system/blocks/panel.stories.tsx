import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import {
  Panel,
  PanelContent,
  PanelDescription,
  PanelField,
  PanelFooter,
  PanelHeader,
  PanelTitle,
  PanelToolbar,
} from './panel';

const meta = {
  component: Panel,
  tags: ['autodocs'],
} satisfies Meta<typeof Panel>;

export default meta;

type Story = StoryObj<typeof meta>;

export const WithHeaderAndContent: Story = {
  name: 'Header and content',
  render: () => (
    <div className="w-80">
      <Panel>
        <PanelHeader>
          <PanelTitle>Capability A</PanelTitle>
          <PanelDescription>Platform infrastructure</PanelDescription>
        </PanelHeader>
        <PanelContent>
          <p className="text-muted-foreground text-sm">Panel body content goes here.</p>
        </PanelContent>
      </Panel>
    </div>
  ),
};

export const WithFields: Story = {
  name: 'With fields',
  render: () => (
    <div className="w-80">
      <Panel>
        <PanelHeader>
          <PanelTitle>Server A</PanelTitle>
        </PanelHeader>
        <PanelContent>
          <PanelField label="Type" helper="Classification of the asset.">
            <span className="text-sm">Infrastructure</span>
          </PanelField>
          <PanelField label="Owner" action={<button type="button">Edit</button>}>
            <span className="text-sm">Platform team</span>
          </PanelField>
        </PanelContent>
      </Panel>
    </div>
  ),
};

export const WithFooter: Story = {
  name: 'With footer',
  render: () => (
    <div className="w-80">
      <Panel>
        <PanelHeader>
          <PanelTitle>Confirm action</PanelTitle>
        </PanelHeader>
        <PanelContent>
          <p className="text-muted-foreground text-sm">This change will affect downstream nodes.</p>
        </PanelContent>
        <PanelFooter>
          <button className="text-muted-foreground text-xs" type="button">Cancel</button>
          <button className="text-xs font-medium" type="button">Confirm</button>
        </PanelFooter>
      </Panel>
    </div>
  ),
};

export const WithToolbar: Story = {
  name: 'Panel toolbar alignments',
  render: () => (
    <div className="flex w-80 flex-col gap-4">
      {(['start', 'end', 'between'] as const).map((align) => (
        <Panel key={align}>
          <PanelContent>
            <PanelToolbar align={align}>
              <button className="text-xs" type="button">Action A</button>
              <button className="text-xs" type="button">Action B</button>
            </PanelToolbar>
          </PanelContent>
        </Panel>
      ))}
    </div>
  ),
};
