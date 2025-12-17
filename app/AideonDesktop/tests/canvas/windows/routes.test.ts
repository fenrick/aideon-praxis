import { describe, expect, it } from 'vitest';

import { toAppUrl, windowRoutes } from 'canvas/windows/routes';

describe('window routes', () => {
  it('lists all known routes', () => {
    expect(windowRoutes).toEqual(['main', 'splash', 'status', 'about', 'settings', 'styleguide']);
  });

  it('converts a route to a hash url', () => {
    expect(toAppUrl('about')).toBe('index.html#/about');
  });
});
