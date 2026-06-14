import type { Meta } from '@storybook/nextjs-vite';
import { Circle } from 'lucide-react';

import { iconBaseline, iconSizeClassNames, iconSizeKeys } from './iconography';

const meta = {
  title: 'Foundations/Iconography',
  tags: ['autodocs'],
  parameters: { layout: 'padded' },
} satisfies Meta;

export default meta;

export const SizeScale = {
  name: 'Icon sizes',
  render: () => (
    <div className="flex flex-col gap-4">
      {iconSizeKeys.map((size) => (
        <div className="flex items-center gap-4" key={size}>
          <span className="text-muted-foreground w-20 text-xs">{size}</span>
          <Circle className={iconSizeClassNames[size]} strokeWidth={iconBaseline.strokeWidth} />
          <code className="text-muted-foreground text-xs">{iconSizeClassNames[size]}</code>
        </div>
      ))}
    </div>
  ),
};

export const Baseline = {
  name: 'Icon baseline settings',
  render: () => (
    <dl className="flex flex-col gap-2 text-sm">
      <div className="flex gap-3">
        <dt className="text-muted-foreground w-32 text-xs font-medium">Library</dt>
        <dd className="font-mono text-xs">{iconBaseline.library}</dd>
      </div>
      <div className="flex gap-3">
        <dt className="text-muted-foreground w-32 text-xs font-medium">Stroke width</dt>
        <dd className="font-mono text-xs">{iconBaseline.strokeWidth}</dd>
      </div>
    </dl>
  ),
};
