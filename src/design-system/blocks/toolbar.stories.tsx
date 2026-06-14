import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { Toolbar, ToolbarSection, ToolbarSeparator } from './toolbar';

const meta = {
  component: Toolbar,
  tags: ['autodocs'],
} satisfies Meta<typeof Toolbar>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <Toolbar>
      <ToolbarSection justify="start">
        <button className="text-muted-foreground hover:text-foreground text-xs" type="button">
          File
        </button>
        <button className="text-muted-foreground hover:text-foreground text-xs" type="button">
          Edit
        </button>
        <button className="text-muted-foreground hover:text-foreground text-xs" type="button">
          View
        </button>
      </ToolbarSection>
    </Toolbar>
  ),
};

export const WithSeparator: Story = {
  name: 'With separator',
  render: () => (
    <Toolbar>
      <ToolbarSection justify="start">
        <button className="text-muted-foreground hover:text-foreground text-xs" type="button">
          Undo
        </button>
        <button className="text-muted-foreground hover:text-foreground text-xs" type="button">
          Redo
        </button>
      </ToolbarSection>
      <ToolbarSeparator />
      <ToolbarSection justify="end">
        <button className="text-muted-foreground hover:text-foreground text-xs" type="button">
          Share
        </button>
      </ToolbarSection>
    </Toolbar>
  ),
};

export const ThreeSection: Story = {
  name: 'Start / center / end sections',
  render: () => (
    <div className="w-full">
      <Toolbar>
        <ToolbarSection justify="start">
          <button className="text-xs" type="button">
            Back
          </button>
          <button className="text-xs" type="button">
            Forward
          </button>
        </ToolbarSection>
        <ToolbarSection justify="center">
          <span className="text-muted-foreground text-xs">Q4 snapshot</span>
        </ToolbarSection>
        <ToolbarSection justify="end">
          <button className="text-xs" type="button">
            Export
          </button>
        </ToolbarSection>
      </Toolbar>
    </div>
  ),
};
