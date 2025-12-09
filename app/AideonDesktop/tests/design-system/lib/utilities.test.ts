import { describe, expect, it } from 'vitest';

import { cn } from '../../../src/design-system/lib/utilities';

describe('cn', () => {
  it('merges tailwind class names while preserving the latest conflict', () => {
    expect(cn('px-2', 'px-4', 'font-semibold', ['text-sm', { 'text-sm': true }])).toBe(
      'px-4 font-semibold text-sm',
    );
  });

  it('retains conditional classes that evaluate to true', () => {
    expect(cn('hover:bg-accent', { 'bg-muted': true, 'bg-foreground': false })).toBe(
      'hover:bg-accent bg-muted',
    );
  });
});
