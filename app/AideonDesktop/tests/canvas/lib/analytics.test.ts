import { describe, expect, it, vi } from 'vitest';

import { recentAnalytics, setAnalyticsSink, track } from 'canvas/lib/analytics';

describe('analytics', () => {
  it('invokes sink and keeps a bounded buffer', () => {
    const sink = vi.fn();
    setAnalyticsSink(sink);

    for (let i = 0; i < 55; i += 1) {
      track('selection.change', { idx: i, fn: () => {} });
    }

    expect(sink).toHaveBeenCalled();
    expect(recentAnalytics().length).toBeLessThanOrEqual(50);
    expect(recentAnalytics()[0].payload?.fn).toBeUndefined();
  });
});
