import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { InfoIcon, MegaphoneIcon } from 'lucide-react';
import { Banner, BannerAction, BannerClose, BannerIcon, BannerTitle } from './index';

const meta = {
  component: Banner,
  tags: ['autodocs'],
  title: 'Kibo UI/Banner',
} satisfies Meta<typeof Banner>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <Banner>
      <BannerTitle>This is an important announcement for all users.</BannerTitle>
      <BannerClose />
    </Banner>
  ),
};

export const WithIcon: Story = {
  render: () => (
    <Banner>
      <BannerIcon icon={InfoIcon} />
      <BannerTitle>Your account has been successfully upgraded.</BannerTitle>
      <BannerClose />
    </Banner>
  ),
};

export const WithAction: Story = {
  render: () => (
    <Banner>
      <BannerIcon icon={MegaphoneIcon} />
      <BannerTitle>New features are available. Update now to get started.</BannerTitle>
      <BannerAction>Update</BannerAction>
      <BannerClose />
    </Banner>
  ),
};

export const Inset: Story = {
  render: () => (
    <div className="p-4">
      <Banner inset>
        <BannerIcon icon={InfoIcon} />
        <BannerTitle>This banner appears inset within a container.</BannerTitle>
        <BannerClose />
      </Banner>
    </div>
  ),
};

export const Dismissed: Story = {
  render: () => (
    <Banner defaultVisible={false}>
      <BannerTitle>This banner starts dismissed.</BannerTitle>
      <BannerClose />
    </Banner>
  ),
};

export const NoCloseButton: Story = {
  render: () => (
    <Banner>
      <BannerIcon icon={InfoIcon} />
      <BannerTitle>This banner cannot be dismissed.</BannerTitle>
    </Banner>
  ),
};
