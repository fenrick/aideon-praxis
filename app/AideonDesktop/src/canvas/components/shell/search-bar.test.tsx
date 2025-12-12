import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

const search = vi.fn();
const clear = vi.fn();
const run = vi.fn();

vi.mock('canvas/lib/search', () => ({
  searchStore: {
    search,
    clear,
  },
  useSearchStoreState: () => ({
    results: [
      {
        id: '1',
        title: 'First result',
        subtitle: 'extra',
        kind: 'sidebar' as const,
        run,
      },
    ],
  }),
}));

import { SearchBar } from './search-bar';

describe('SearchBar', () => {
  it('debounces search input and triggers run on selection', () => {
    vi.useFakeTimers();
    render(<SearchBar />);

    const input = screen.getByPlaceholderText(/Search branches/i);
    fireEvent.change(input, { target: { value: 'node' } });
    // Advance debounce timer
    vi.advanceTimersByTime(200);
    expect(search).toHaveBeenCalledWith('node');

    // Navigate and select
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(run).toHaveBeenCalled();
    expect(clear).toHaveBeenCalled();

    vi.useRealTimers();
  });
});
