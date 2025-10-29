import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ToastItem } from '../src/lib/ui/toast';

// Tests for app/desktop/src/lib/ui/toast.ts

describe('ui/toast store', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.resetModules();
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
    vi.restoreAllMocks();
    vi.unstubAllGlobals?.();
  });

  it('subscribes, pushes, and dismisses items', async () => {
    const mod = await import('../src/lib/ui/toast');
    const events: ToastItem[][] = [];

    const unsubscribe = mod.subscribe((items) => {
      events.push(Array.from(items));
    });

    // Initial emit with empty list
    expect(events.length).toBe(1);
    expect(events[0]).toEqual([]);

    // Push without auto-timeout to avoid timers
    mod.push('Hello', 'success', 0);
    expect(events.length).toBe(2);
    expect(events[1][0]?.text).toBe('Hello');
    const id = events[1][0]?.id as string;

    // Dismiss should emit empty list again
    mod.dismiss(id);
    expect(events.length).toBe(3);
    expect(events[2]).toEqual([]);

    unsubscribe();
  });

  it('auto-dismisses after timeout', async () => {
    const mod = await import('../src/lib/ui/toast');
    const events: ToastItem[][] = [];
    mod.subscribe((items) => events.push(Array.from(items)));

    mod.push('Expiring', 'info', 10);
    // After push, we have one non-empty emission
    expect(events.at(-1)?.length).toBe(1);

    await vi.advanceTimersByTimeAsync(11);
    // After timeout triggers dismiss, last emission is empty
    expect(events.at(-1)).toEqual([]);
  });

  it('falls back to counter IDs when crypto.getRandomValues throws', async () => {
    const mod = await import('../src/lib/ui/toast');
    // Force getRandomValues to throw so catch branch runs
    vi.stubGlobal('crypto', {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      getRandomValues: (_: Uint32Array) => {
        throw new Error('no-entropy');
      },
    } as unknown as Crypto);

    const now = Date.now();
    vi.spyOn(Date, 'now').mockReturnValue(now);

    const snapshots: string[] = [];
    mod.subscribe((items) => {
      const last = items.at(-1);
      if (last) snapshots.push(last.id);
    });

    mod.push('A', 'info', 0);
    mod.push('B', 'info', 0);

    // Both IDs share the same time prefix and incrementing counter suffix
    expect(snapshots.length).toBe(2);
    const [id1, id2] = snapshots;
    const prefix = now.toString(36) + '-';
    expect(id1.startsWith(prefix)).toBe(true);
    expect(id2.startsWith(prefix)).toBe(true);
    const tail1 = id1.slice(prefix.length);
    const tail2 = id2.slice(prefix.length);
    expect(tail1).toBe('1');
    expect(tail2).toBe('2');
  });
});
