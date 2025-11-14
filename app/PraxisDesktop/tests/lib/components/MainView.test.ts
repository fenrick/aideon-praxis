import { describe, expect, it } from 'vitest';

import { shouldShowSeededTimeline } from '$lib/components/main-view.helpers';
import { getMainViewCopy } from '$lib/locales/main-view';
import type { TimeStoreState } from '$lib/stores/time';

const baseState: TimeStoreState = {
  branch: 'main',
  commits: [],
  branches: [],
  currentCommitId: null,
  snapshot: null,
  diff: null,
  isComparing: false,
  compare: { from: null, to: null },
  unsavedCount: 0,
  loading: false,
  error: null,
  mergeConflicts: null,
};

describe('main view localization', () => {
  it('provides seeded timeline copy in the default locale', () => {
    const copy = getMainViewCopy();
    expect(copy.timeline.empty.title).toBe('Start from the seeded snapshot');
    expect(copy.timeline.empty.scenarioCta).toBe('Plan a scenario');
  });
});

describe('shouldShowSeededTimeline', () => {
  it('returns true when no commits exist and state is ready', () => {
    expect(shouldShowSeededTimeline(baseState)).toBe(true);
  });

  it('returns false when commits are present', () => {
    const stateWithCommits: TimeStoreState = {
      ...baseState,
      commits: [
        {
          id: 'seed-1',
          branch: 'main',
          parents: [],
          author: 'Praxis',
          time: '2024-01-02T12:00:00Z',
          message: 'Seed commit',
          tags: [],
          changeCount: 1,
        },
      ],
      currentCommitId: 'seed-1',
    };
    expect(shouldShowSeededTimeline(stateWithCommits)).toBe(false);
  });

  it('returns false when state is loading', () => {
    expect(shouldShowSeededTimeline({ ...baseState, loading: true })).toBe(false);
  });

  it('returns false when state is null', () => {
    expect(shouldShowSeededTimeline(null)).toBe(false);
  });
});
