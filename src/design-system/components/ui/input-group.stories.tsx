import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { SearchIcon, XIcon } from 'lucide-react';
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
  InputGroupText,
  InputGroupTextarea,
} from './input-group';

const meta = {
  component: InputGroup,
  tags: ['autodocs'],
} satisfies Meta<typeof InputGroup>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <InputGroup className="w-80">
      <InputGroupInput placeholder="Search…" />
    </InputGroup>
  ),
};

export const WithInlineStartAddon: Story = {
  render: () => (
    <InputGroup className="w-80">
      <InputGroupAddon align="inline-start">
        <InputGroupText>
          <SearchIcon />
        </InputGroupText>
      </InputGroupAddon>
      <InputGroupInput placeholder="Search…" />
    </InputGroup>
  ),
};

export const WithInlineEndButton: Story = {
  render: () => (
    <InputGroup className="w-80">
      <InputGroupInput placeholder="Enter value…" />
      <InputGroupAddon align="inline-end">
        <InputGroupButton size="icon-xs">
          <XIcon />
        </InputGroupButton>
      </InputGroupAddon>
    </InputGroup>
  ),
};

export const WithTextarea: Story = {
  render: () => (
    <InputGroup className="w-80">
      <InputGroupAddon align="block-start">Note</InputGroupAddon>
      <InputGroupTextarea placeholder="Write something…" />
    </InputGroup>
  ),
};
