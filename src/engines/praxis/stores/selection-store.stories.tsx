import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { SelectionProvider, useSelectionStore } from './selection-store';

/**
 * Visualises the SelectionProvider + useSelectionStore hook.
 */
function SelectionStoreDemo() {
  const { state, setSelection, clear } = useSelectionStore();
  return (
    <div className="space-y-4 p-6">
      <div className="font-mono text-sm">
        <p className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">
          Current selection
        </p>
        <pre className="bg-muted mt-2 rounded-md p-3 text-xs">
          {JSON.stringify(state.selection, undefined, 2)}
        </pre>
      </div>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-md px-3 py-1.5 text-sm font-medium"
          onClick={() => {
            setSelection({
              sourceWidgetId: 'widget-1',
              nodeIds: ['node-cap-001', 'node-cap-002'],
              edgeIds: [],
              cellIds: [],
            });
          }}
        >
          Select nodes
        </button>
        <button
          type="button"
          className="bg-secondary text-secondary-foreground hover:bg-secondary/80 rounded-md px-3 py-1.5 text-sm font-medium"
          onClick={() => {
            setSelection({
              sourceWidgetId: 'widget-1',
              nodeIds: [],
              edgeIds: ['edge-dep-001'],
              cellIds: [],
            });
          }}
        >
          Select edge
        </button>
        <button
          type="button"
          className="border-input bg-background hover:bg-accent rounded-md border px-3 py-1.5 text-sm font-medium"
          onClick={clear}
        >
          Clear
        </button>
      </div>
    </div>
  );
}

const meta = {
  component: SelectionStoreDemo,
  tags: ['autodocs'],
  title: 'Workspaces/Praxis/Stores/SelectionStore',
  decorators: [
    (Story) => (
      <SelectionProvider>
        <Story />
      </SelectionProvider>
    ),
  ],
} satisfies Meta<typeof SelectionStoreDemo>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
