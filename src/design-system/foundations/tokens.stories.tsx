import type { Meta } from '@storybook/nextjs-vite';

import {
  densityModes,
  radiusScale,
  spacingScale,
  spacingTokenKeys,
  typographyTokens,
} from './tokens';

const meta = {
  title: 'Foundations/Tokens',
  tags: ['autodocs'],
  parameters: { layout: 'padded' },
} satisfies Meta;

export default meta;

export const Spacing = {
  name: 'Spacing scale',
  render: () => (
    <div className="flex flex-col gap-3">
      {spacingTokenKeys.map((token) => (
        <div className="flex items-center gap-4" key={token}>
          <span className="text-muted-foreground w-8 text-xs">{token}</span>
          <span className="text-muted-foreground w-16 font-mono text-xs">{spacingScale[token]}</span>
          <div
            className="bg-primary/40 h-4 rounded-sm"
            style={{ width: spacingScale[token] }}
          />
        </div>
      ))}
    </div>
  ),
};

export const Typography = {
  name: 'Typography tokens',
  render: () => (
    <div className="flex flex-col gap-4">
      {(Object.entries(typographyTokens) as [string, string][]).map(([name, className]) => (
        <div className="flex flex-col gap-0.5" key={name}>
          <span className="text-muted-foreground text-[10px] uppercase tracking-widest">{name}</span>
          <p className={className}>The quick brown fox jumps over the lazy dog</p>
        </div>
      ))}
    </div>
  ),
};

export const Radius = {
  name: 'Radius scale',
  render: () => (
    <div className="flex flex-wrap gap-4">
      {(Object.entries(radiusScale) as [string, string][]).map(([name, value]) => (
        <div className="flex flex-col items-center gap-2" key={name}>
          <div
            className="bg-muted border-border/60 h-16 w-16 border"
            style={{ borderRadius: value }}
          />
          <span className="text-muted-foreground text-xs">{name}</span>
        </div>
      ))}
    </div>
  ),
};

export const Density = {
  name: 'Density modes',
  render: () => (
    <div className="flex flex-col gap-6">
      {(Object.entries(densityModes) as [string, (typeof densityModes)[keyof typeof densityModes]][]).map(
        ([mode, contract]) => (
          <div className="flex flex-col gap-2" key={mode}>
            <h3 className="text-sm font-semibold">{contract.label}</h3>
            <dl className="grid grid-cols-2 gap-x-8 gap-y-1 text-xs">
              <dt className="text-muted-foreground">Navigation width</dt>
              <dd className="font-mono">{contract.navigationWidth}</dd>
              <dt className="text-muted-foreground">Inspector width</dt>
              <dd className="font-mono">{contract.inspectorWidth}</dd>
              <dt className="text-muted-foreground">Toolbar height</dt>
              <dd className="font-mono">{contract.toolbarHeight}</dd>
              <dt className="text-muted-foreground">Control height</dt>
              <dd className="font-mono">{contract.controlHeight}</dd>
            </dl>
          </div>
        ),
      )}
    </div>
  ),
};
