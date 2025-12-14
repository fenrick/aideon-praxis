import { describe, expect, it } from 'vitest';

import { tokens, type TokenKeys } from 'design-system/tokens';

describe('design-system tokens', () => {
  it('exposes stable token groups', () => {
    const keys: TokenKeys[] = ['space', 'radius', 'typography', 'elevations'];
    expect(Object.keys(tokens)).toEqual(keys);
  });

  it('keeps numeric primitives in sync', () => {
    expect(tokens.space).toMatchObject({ xs: 4, lg: 16, '4xl': 48 });
    expect(tokens.radius).toMatchObject({ xs: 6, pill: 999 });
  });

  it('provides typography fallbacks and elevations', () => {
    expect(tokens.typography.brand).toContain('Space Grotesk');
    expect(tokens.elevations[300]).toContain('rgba(15, 23, 42');
  });
});
