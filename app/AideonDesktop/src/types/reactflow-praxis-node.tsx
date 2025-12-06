import type { FC } from 'react';

export const PraxisNode: FC<Record<string, unknown>> = (properties) => (
  <div data-testid="praxis-node" {...properties} />
);
