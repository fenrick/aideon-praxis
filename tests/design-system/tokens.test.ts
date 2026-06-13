import { describe, expect, it } from 'vitest';

import { designTokens } from 'design-system/foundations/tokens';

describe('design-system foundations/tokens', () => {
  it('exposes stable token groups', () => {
    expect(designTokens).toHaveProperty('spacing');
    expect(designTokens).toHaveProperty('radius');
    expect(designTokens).toHaveProperty('typography');
    expect(designTokens).toHaveProperty('elevation');
  });

  it('spacing scale uses semantic names', () => {
    expect(Object.keys(designTokens.spacing)).toEqual(
      expect.arrayContaining(['2xs', 'xs', 'sm', 'md', 'lg', 'xl', '2xl', '3xl']),
    );
  });

  it('radius scale uses semantic names', () => {
    expect(Object.keys(designTokens.radius)).toEqual(
      expect.arrayContaining(['sm', 'md', 'lg', 'xl']),
    );
  });

  it('typography tokens are Tailwind class strings', () => {
    expect(designTokens.typography.label).toContain('text-');
    expect(designTokens.typography.editorialTitle).toContain('font-editorial');
  });
});
