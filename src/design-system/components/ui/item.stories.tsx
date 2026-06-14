import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { FileIcon, FolderIcon } from 'lucide-react';
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemMedia,
  ItemSeparator,
  ItemTitle,
} from './item';

const meta = {
  component: Item,
  tags: ['autodocs'],
} satisfies Meta<typeof Item>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <Item>
      <ItemContent>
        <ItemTitle>Project Alpha</ItemTitle>
        <ItemDescription>An important project description goes here.</ItemDescription>
      </ItemContent>
    </Item>
  ),
};

export const WithMedia: Story = {
  render: () => (
    <Item variant="outline">
      <ItemMedia variant="icon">
        <FolderIcon />
      </ItemMedia>
      <ItemContent>
        <ItemTitle>Documents</ItemTitle>
        <ItemDescription>All project documents and assets.</ItemDescription>
      </ItemContent>
      <ItemActions>
        <FileIcon className="size-4 text-muted-foreground" />
      </ItemActions>
    </Item>
  ),
};

export const Group: Story = {
  render: () => (
    <ItemGroup className="max-w-sm">
      <Item variant="muted">
        <ItemMedia variant="icon">
          <FolderIcon />
        </ItemMedia>
        <ItemContent>
          <ItemTitle>Alpha</ItemTitle>
          <ItemDescription>First item in the group.</ItemDescription>
        </ItemContent>
      </Item>
      <ItemSeparator />
      <Item variant="muted">
        <ItemMedia variant="icon">
          <FolderIcon />
        </ItemMedia>
        <ItemContent>
          <ItemTitle>Beta</ItemTitle>
          <ItemDescription>Second item in the group.</ItemDescription>
        </ItemContent>
      </Item>
    </ItemGroup>
  ),
};

export const SizeVariants: Story = {
  render: () => (
    <ItemGroup className="max-w-sm">
      <Item size="default" variant="outline">
        <ItemContent>
          <ItemTitle>Default size</ItemTitle>
        </ItemContent>
      </Item>
      <Item size="sm" variant="outline">
        <ItemContent>
          <ItemTitle>Small size</ItemTitle>
        </ItemContent>
      </Item>
      <Item size="xs" variant="outline">
        <ItemContent>
          <ItemTitle>Extra small size</ItemTitle>
        </ItemContent>
      </Item>
    </ItemGroup>
  ),
};
