import { describe, expect, test } from 'vitest';
import { ensureIsoDateTime } from '@aideon/praxis-dtos';

describe('ensureIsoDateTime', () => {
  test('normalises UTC input strings', () => {
    const result = ensureIsoDateTime('2025-04-01T12:00:00Z');
    expect(result).toBe('2025-04-01T12:00:00.000Z');
  });

  test('throws for invalid input', () => {
    expect(() => ensureIsoDateTime('not-a-date')).toThrowError(TypeError);
  });
});
