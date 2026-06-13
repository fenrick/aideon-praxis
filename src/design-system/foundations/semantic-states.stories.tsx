import type { Meta } from '@storybook/nextjs-vite';

import { semanticStateContracts, semanticStateKeys } from './semantic-states';

const meta = {
  title: 'Foundations/Semantic States',
  tags: ['autodocs'],
  parameters: { layout: 'padded' },
} satisfies Meta;

export default meta;

export const AllStates = {
  name: 'All semantic states',
  render: () => (
    <div className="flex flex-col gap-3">
      {semanticStateKeys.map((tone) => {
        const contract = semanticStateContracts[tone];
        return (
          <div className="flex items-start gap-4" key={tone}>
            <span
              className={`border rounded-full px-2.5 py-0.5 text-xs font-medium ${contract.badgeClassName}`}
            >
              {contract.label}
            </span>
            <div
              className={`flex-1 rounded-lg border px-3 py-2 text-sm ${contract.surfaceClassName}`}
            >
              {contract.description}
            </div>
          </div>
        );
      })}
    </div>
  ),
};

export const BadgeTokens = {
  name: 'Badge class names',
  render: () => (
    <div className="flex flex-wrap gap-2">
      {semanticStateKeys.map((tone) => {
        const { badgeClassName, label } = semanticStateContracts[tone];
        return (
          <span
            className={`border rounded-full px-2.5 py-0.5 text-xs font-medium ${badgeClassName}`}
            key={tone}
          >
            {label}
          </span>
        );
      })}
    </div>
  ),
};

export const SurfaceTokens = {
  name: 'Surface class names',
  render: () => (
    <div className="flex flex-col gap-2">
      {semanticStateKeys.map((tone) => {
        const { surfaceClassName, label } = semanticStateContracts[tone];
        return (
          <div
            className={`rounded-xl border px-4 py-3 text-sm font-medium ${surfaceClassName}`}
            key={tone}
          >
            {label}
          </div>
        );
      })}
    </div>
  ),
};
