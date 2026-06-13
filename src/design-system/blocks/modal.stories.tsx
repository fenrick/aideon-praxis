import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { fn, userEvent, expect, within } from 'storybook/test';
import { useState } from 'react';

import {
  Modal,
  ModalContent,
  ModalDescription,
  ModalFooter,
  ModalHeader,
  ModalTitle,
} from './modal';

const meta = {
  component: Modal,
  tags: ['autodocs'],
  parameters: { layout: 'centered' },
} satisfies Meta<typeof Modal>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Open: Story = {
  name: 'Open modal',
  args: {
    open: true,
    onOpenChange: fn(),
  },
  render: (args) => (
    <Modal {...args}>
      <ModalContent>
        <ModalHeader>
          <ModalTitle>Delete node</ModalTitle>
          <ModalDescription>
            This will permanently remove the node and all attached edges from the graph.
          </ModalDescription>
        </ModalHeader>
        <ModalFooter>
          <button className="text-muted-foreground text-sm" type="button">Cancel</button>
          <button className="bg-destructive text-destructive-foreground rounded-lg px-4 py-2 text-sm" type="button">
            Delete
          </button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  ),
};

export const WithLongBody: Story = {
  name: 'With long body',
  args: {
    open: true,
    onOpenChange: fn(),
  },
  render: (args) => (
    <Modal {...args}>
      <ModalContent>
        <ModalHeader>
          <ModalTitle>Export snapshot</ModalTitle>
          <ModalDescription>Configure the export options below.</ModalDescription>
        </ModalHeader>
        <div className="space-y-3 py-2">
          <p className="text-muted-foreground text-sm">
            Choose a format and target plateau to export the current graph state. Exports include
            all visible nodes and edges with their provenance metadata.
          </p>
          <p className="text-muted-foreground text-sm">
            Large graphs (more than 5,000 nodes) may take a few seconds to process.
          </p>
        </div>
        <ModalFooter>
          <button className="text-muted-foreground text-sm" type="button">Cancel</button>
          <button className="rounded-lg bg-primary px-4 py-2 text-sm text-primary-foreground" type="button">
            Export
          </button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  ),
};

function ControlledModal() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        className="rounded-lg bg-primary px-4 py-2 text-sm text-primary-foreground"
        onClick={() => setOpen(true)}
        type="button"
      >
        Open modal
      </button>
      <Modal onOpenChange={setOpen} open={open}>
        <ModalContent>
          <ModalHeader>
            <ModalTitle>Confirm</ModalTitle>
            <ModalDescription>Are you sure you want to continue?</ModalDescription>
          </ModalHeader>
          <ModalFooter>
            <button className="text-muted-foreground text-sm" onClick={() => setOpen(false)} type="button">
              Cancel
            </button>
            <button
              aria-label="confirm-action"
              className="rounded-lg bg-primary px-4 py-2 text-sm text-primary-foreground"
              onClick={() => setOpen(false)}
              type="button"
            >
              Confirm
            </button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  );
}

export const OpenAndClose: Story = {
  name: 'Open and close interaction',
  render: () => <ControlledModal />,
  play: async ({ canvas }) => {
    const trigger = await canvas.findByText('Open modal');
    await userEvent.click(trigger);
    const body = within(document.body);
    await expect(await body.findByText('Are you sure you want to continue?')).toBeTruthy();
  },
};
