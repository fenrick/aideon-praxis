import type { TimeStoreState } from '$lib/stores/time';

export function shouldShowSeededTimeline(timeState: TimeStoreState | null): boolean {
  if (!timeState) {
    return false;
  }
  if (timeState.loading) {
    return false;
  }
  return timeState.commits.length === 0;
}
