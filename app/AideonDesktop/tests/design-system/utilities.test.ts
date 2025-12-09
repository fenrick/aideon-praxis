import { describe, expect, it } from 'vitest';

import { cn } from '../../src/design-system/lib/utilities';

describe('utilities', () => {
  it('merges class names with tailwind-aware precedence', () => {
    const merged = cn('p-2', 'text-sm', ['p-4', { hidden: false }], { block: true });

    expect(merged.includes('p-4')).toBe(true);
    expect(merged.includes('p-2')).toBe(false);
    expect(merged.split(' ')).toContain('block');
    expect(merged.split(' ')).toContain('text-sm');
  });
});
