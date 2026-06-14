import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { useState } from 'react';
import { ImageCrop, ImageCropApply, ImageCropContent, ImageCropReset } from './index';

const meta = {
  component: ImageCrop,
  tags: ['autodocs'],
  title: 'Kibo UI/ImageCrop',
  args: {
    file: new File([], 'placeholder.png', { type: 'image/png' }),
    children: null,
  },
} satisfies Meta<typeof ImageCrop>;

export default meta;
type Story = StoryObj<typeof meta>;

// Helper to create a File from a remote image URL via blob
// We use a placeholder canvas-generated PNG for stories since we can't import binary assets
const createPlaceholderFile = () => {
  const canvas = document.createElement('canvas');
  canvas.width = 400;
  canvas.height = 300;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const gradient = ctx.createLinearGradient(0, 0, 400, 300);
    gradient.addColorStop(0, '#6366f1');
    gradient.addColorStop(1, '#8b5cf6');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 400, 300);
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    ctx.font = '24px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Sample Image', 200, 155);
  }
  return new Promise<File>((resolve) => {
    canvas.toBlob((blob) => {
      resolve(new File([blob!], 'sample.png', { type: 'image/png' }));
    }, 'image/png');
  });
};

const ImageCropDemo = ({ aspect }: { aspect?: number }) => {
  const [file] = useState<File>(() => {
    // Return a dummy file; the actual blob is set in a useEffect in the real component
    // For Storybook we use a small inline PNG (1x1 transparent)
    const b64 =
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
    const bytes = atob(b64);
    const arr = new Uint8Array(bytes.length);
    for (let i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i);
    return new File([arr], 'placeholder.png', { type: 'image/png' });
  });
  const [cropped, setCropped] = useState<string | null>(null);

  return (
    <div className="flex max-w-sm flex-col gap-4">
      <ImageCrop aspect={aspect} file={file} onCrop={setCropped}>
        <ImageCropContent />
        <div className="flex justify-end gap-2">
          <ImageCropReset />
          <ImageCropApply />
        </div>
      </ImageCrop>
      {cropped && (
        <div>
          <p className="text-muted-foreground mb-1 text-xs">Cropped result:</p>
          <img alt="cropped" className="rounded border" src={cropped} />
        </div>
      )}
    </div>
  );
};

export const Default: Story = {
  render: () => <ImageCropDemo />,
};

export const SquareAspect: Story = {
  render: () => <ImageCropDemo aspect={1} />,
};

export const WideAspect: Story = {
  render: () => <ImageCropDemo aspect={16 / 9} />,
};
