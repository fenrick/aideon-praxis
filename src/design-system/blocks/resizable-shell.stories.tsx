import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { ResizableShell } from './resizable-shell';

const meta = {
  component: ResizableShell,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta<typeof ResizableShell>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  name: 'Default (65 / 35)',
  args: { contentSlot: undefined, inspectorSlot: undefined },
  render: () => (
    <div className="h-96 w-full">
      <ResizableShell
        contentSlot={
          <div className="bg-muted/40 flex h-full items-center justify-center p-4 text-sm">
            Content area
          </div>
        }
        inspectorSlot={
          <div className="bg-card flex h-full items-center justify-center border-l p-4 text-sm">
            Inspector
          </div>
        }
      />
    </div>
  ),
};

export const CustomSizes: Story = {
  name: 'Custom sizes (80 / 20)',
  args: { contentSlot: undefined, inspectorSlot: undefined },
  render: () => (
    <div className="h-96 w-full">
      <ResizableShell
        contentSlot={
          <div className="bg-muted/40 flex h-full items-center justify-center p-4 text-sm">
            Content (80%)
          </div>
        }
        inspectorSlot={
          <div className="bg-card flex h-full items-center justify-center border-l p-4 text-sm">
            Inspector (20%)
          </div>
        }
        defaultSizes={[80, 20]}
      />
    </div>
  ),
};

export const WithOnLayout: Story = {
  name: 'With onLayout callback',
  args: { contentSlot: undefined, inspectorSlot: undefined },
  render: () => (
    <div className="h-96 w-full">
      <ResizableShell
        contentSlot={
          <div className="bg-muted/40 flex h-full items-center justify-center p-4 text-sm">
            Drag the handle — sizes logged to console
          </div>
        }
        inspectorSlot={
          <div className="bg-card flex h-full items-center justify-center border-l p-4 text-sm">
            Inspector
          </div>
        }
        onLayout={() => {
          /* wire to ADR-0026 persistent UI state in real usage */
        }}
      />
    </div>
  ),
};
