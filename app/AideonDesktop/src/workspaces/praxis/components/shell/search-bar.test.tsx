import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  search: vi.fn(),
  clear: vi.fn(),
  run: vi.fn(),
}));

vi.mock('praxis/lib/search', () => ({
  searchStore: {
    search: mocks.search,
    clear: mocks.clear,
  },
  useSearchStoreState: () => ({
    results: [
      {
        id: '1',
        title: 'First result',
        subtitle: 'extra',
        kind: 'sidebar' as const,
        run: mocks.run,
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
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: 'node' } });
    // Advance debounce timer
    vi.advanceTimersByTime(200);
    expect(mocks.search).toHaveBeenCalledWith('node');

    // Navigate and select
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(mocks.run).toHaveBeenCalled();
    expect(mocks.clear).toHaveBeenCalled();

    vi.useRealTimers();
  });
});
