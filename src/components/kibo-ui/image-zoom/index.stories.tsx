import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { ImageZoom } from './index';

const meta = {
  component: ImageZoom,
  tags: ['autodocs'],
  title: 'Kibo UI/ImageZoom',
  args: {
    children: <img alt="" src="" />,
  },
} satisfies Meta<typeof ImageZoom>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <div style={{ width: 300 }}>
      <ImageZoom>
        <img
          alt="A scenic mountain view"
          src="https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=600&q=80"
          style={{ width: '100%', borderRadius: 8 }}
        />
      </ImageZoom>
    </div>
  ),
};

export const SmallImage: Story = {
  render: () => (
    <div style={{ width: 150 }}>
      <ImageZoom>
        <img
          alt="A small thumbnail"
          src="https://images.unsplash.com/photo-1518791841217-8f162f1912da?w=300&q=80"
          style={{ width: '100%', borderRadius: 8 }}
        />
      </ImageZoom>
    </div>
  ),
};

export const MultipleImages: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: 12 }}>
      {[
        'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=300&q=80',
        'https://images.unsplash.com/photo-1518791841217-8f162f1912da?w=300&q=80',
        'https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=300&q=80',
      ].map((src, i) => (
        <div key={i} style={{ width: 150 }}>
          <ImageZoom>
            <img alt={`Image ${i + 1}`} src={src} style={{ width: '100%', borderRadius: 8 }} />
          </ImageZoom>
        </div>
      ))}
    </div>
  ),
};
