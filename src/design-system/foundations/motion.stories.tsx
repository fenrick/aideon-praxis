import type { Meta } from '@storybook/nextjs-vite';

import { motionClassNames, motionTokens } from './motion';

const meta = {
  title: 'Foundations/Motion',
  tags: ['autodocs'],
  parameters: { layout: 'padded' },
} satisfies Meta;

export default meta;

export const Durations = {
  name: 'Duration tokens',
  render: () => (
    <div className="flex flex-col gap-3">
      {(Object.entries(motionTokens) as [string, string][]).map(([name, value]) => (
        <div className="flex items-center gap-4" key={name}>
          <span className="text-muted-foreground w-24 text-xs">{name}</span>
          <span className="font-mono text-sm">{value}</span>
          <div
            className="bg-primary h-3 w-3 rounded-full transition-transform ease-out hover:scale-150"
            style={{ transitionDuration: value }}
            title={`${name}: ${value}`}
          />
        </div>
      ))}
    </div>
  ),
};

export const TransitionClasses = {
  name: 'Transition class names',
  render: () => (
    <div className="flex flex-col gap-4">
      {(Object.entries(motionClassNames) as [string, string][]).map(([name, className]) => (
        <div className="flex flex-col gap-1" key={name}>
          <span className="text-muted-foreground text-xs font-medium tracking-widest uppercase">
            {name}
          </span>
          <code className="bg-muted rounded px-2 py-1 text-xs break-all">{className}</code>
          <div
            className={`bg-muted border-border/60 hover:bg-primary hover:border-primary h-10 w-10 rounded-lg border ${className}`}
            title={`Hover to see ${name} transition`}
          />
        </div>
      ))}
    </div>
  ),
};
