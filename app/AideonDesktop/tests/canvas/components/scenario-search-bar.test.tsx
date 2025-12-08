import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { ScenarioSearchBar } from 'canvas/components/template-screen/scenario-search-bar';

describe('ScenarioSearchBar', () => {
  it('exposes an accessible search input and propagates queries', () => {
    const handleSearch = vi.fn();

    render(<ScenarioSearchBar onSearch={handleSearch} />);

    const input = screen.getByRole('searchbox', { name: /search branches, nodes, catalogues/i });
    fireEvent.change(input, { target: { value: 'resilience' } });

    expect(handleSearch).toHaveBeenCalledWith('resilience');
  });
});
