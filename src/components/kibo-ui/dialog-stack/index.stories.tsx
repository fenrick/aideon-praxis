import { userEvent, within } from 'storybook/test';
import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import {
  DialogStack,
  DialogStackBody,
  DialogStackContent,
  DialogStackDescription,
  DialogStackFooter,
  DialogStackHeader,
  DialogStackNext,
  DialogStackOverlay,
  DialogStackPrevious,
  DialogStackTitle,
  DialogStackTrigger,
} from './index';

const meta = {
  component: DialogStack,
  tags: ['autodocs'],
  title: 'Kibo UI/DialogStack',
} satisfies Meta<typeof DialogStack>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <DialogStack>
      <DialogStackTrigger>Open Dialog Stack</DialogStackTrigger>
      <DialogStackOverlay />
      <DialogStackBody>
        <DialogStackContent>
          <DialogStackHeader>
            <DialogStackTitle>Step 1: Welcome</DialogStackTitle>
            <DialogStackDescription>
              This is the first step in a multi-step dialog flow.
            </DialogStackDescription>
          </DialogStackHeader>
          <DialogStackFooter>
            <DialogStackNext className="bg-primary text-primary-foreground rounded-md px-4 py-2 text-sm font-medium">
              Next
            </DialogStackNext>
          </DialogStackFooter>
        </DialogStackContent>
        <DialogStackContent>
          <DialogStackHeader>
            <DialogStackTitle>Step 2: Configuration</DialogStackTitle>
            <DialogStackDescription>
              Configure your preferences for the new workspace.
            </DialogStackDescription>
          </DialogStackHeader>
          <DialogStackFooter>
            <DialogStackPrevious className="border rounded-md px-4 py-2 text-sm font-medium">
              Back
            </DialogStackPrevious>
            <DialogStackNext className="bg-primary text-primary-foreground rounded-md px-4 py-2 text-sm font-medium">
              Next
            </DialogStackNext>
          </DialogStackFooter>
        </DialogStackContent>
        <DialogStackContent>
          <DialogStackHeader>
            <DialogStackTitle>Step 3: Confirmation</DialogStackTitle>
            <DialogStackDescription>
              Review your settings and confirm to complete setup.
            </DialogStackDescription>
          </DialogStackHeader>
          <DialogStackFooter>
            <DialogStackPrevious className="border rounded-md px-4 py-2 text-sm font-medium">
              Back
            </DialogStackPrevious>
            <button className="bg-primary text-primary-foreground rounded-md px-4 py-2 text-sm font-medium">
              Finish
            </button>
          </DialogStackFooter>
        </DialogStackContent>
      </DialogStackBody>
    </DialogStack>
  ),
};

export const DefaultOpen: Story = {
  render: () => (
    <DialogStack defaultOpen>
      <DialogStackOverlay />
      <DialogStackBody>
        <DialogStackContent>
          <DialogStackHeader>
            <DialogStackTitle>Getting Started</DialogStackTitle>
            <DialogStackDescription>
              Welcome to the setup wizard. Follow the steps to get started.
            </DialogStackDescription>
          </DialogStackHeader>
          <DialogStackFooter>
            <DialogStackNext className="bg-primary text-primary-foreground rounded-md px-4 py-2 text-sm font-medium">
              Get Started
            </DialogStackNext>
          </DialogStackFooter>
        </DialogStackContent>
        <DialogStackContent>
          <DialogStackHeader>
            <DialogStackTitle>You're all set!</DialogStackTitle>
            <DialogStackDescription>Your workspace is ready to use.</DialogStackDescription>
          </DialogStackHeader>
          <DialogStackFooter>
            <DialogStackPrevious className="border rounded-md px-4 py-2 text-sm font-medium">
              Back
            </DialogStackPrevious>
          </DialogStackFooter>
        </DialogStackContent>
      </DialogStackBody>
    </DialogStack>
  ),
};

export const Clickable: Story = {
  render: () => (
    <DialogStack clickable defaultOpen>
      <DialogStackOverlay />
      <DialogStackBody>
        <DialogStackContent>
          <DialogStackHeader>
            <DialogStackTitle>Step 1</DialogStackTitle>
            <DialogStackDescription>Click previous cards to navigate back.</DialogStackDescription>
          </DialogStackHeader>
          <DialogStackFooter>
            <DialogStackNext className="bg-primary text-primary-foreground rounded-md px-4 py-2 text-sm font-medium">
              Next
            </DialogStackNext>
          </DialogStackFooter>
        </DialogStackContent>
        <DialogStackContent>
          <DialogStackHeader>
            <DialogStackTitle>Step 2</DialogStackTitle>
            <DialogStackDescription>Click the card behind to go back.</DialogStackDescription>
          </DialogStackHeader>
          <DialogStackFooter>
            <DialogStackPrevious className="border rounded-md px-4 py-2 text-sm font-medium">
              Back
            </DialogStackPrevious>
            <DialogStackNext className="bg-primary text-primary-foreground rounded-md px-4 py-2 text-sm font-medium">
              Next
            </DialogStackNext>
          </DialogStackFooter>
        </DialogStackContent>
        <DialogStackContent>
          <DialogStackHeader>
            <DialogStackTitle>Step 3</DialogStackTitle>
            <DialogStackDescription>Final step.</DialogStackDescription>
          </DialogStackHeader>
          <DialogStackFooter>
            <DialogStackPrevious className="border rounded-md px-4 py-2 text-sm font-medium">
              Back
            </DialogStackPrevious>
          </DialogStackFooter>
        </DialogStackContent>
      </DialogStackBody>
    </DialogStack>
  ),
};

export const OpenViaClick: Story = {
  render: () => (
    <DialogStack>
      <DialogStackTrigger>Open</DialogStackTrigger>
      <DialogStackOverlay />
      <DialogStackBody>
        <DialogStackContent>
          <DialogStackHeader>
            <DialogStackTitle>Dialog Opened</DialogStackTitle>
            <DialogStackDescription>You clicked the trigger button.</DialogStackDescription>
          </DialogStackHeader>
          <DialogStackFooter>
            <DialogStackNext className="bg-primary text-primary-foreground rounded-md px-4 py-2 text-sm font-medium">
              Next
            </DialogStackNext>
          </DialogStackFooter>
        </DialogStackContent>
        <DialogStackContent>
          <DialogStackHeader>
            <DialogStackTitle>Second Dialog</DialogStackTitle>
            <DialogStackDescription>You navigated to the second dialog.</DialogStackDescription>
          </DialogStackHeader>
          <DialogStackFooter>
            <DialogStackPrevious className="border rounded-md px-4 py-2 text-sm font-medium">
              Back
            </DialogStackPrevious>
          </DialogStackFooter>
        </DialogStackContent>
      </DialogStackBody>
    </DialogStack>
  ),
  play: async ({ canvas }) => {
    const trigger = canvas.getByText('Open');
    await userEvent.click(trigger);
  },
};
