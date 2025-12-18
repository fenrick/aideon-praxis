import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('./praxis', () => ({
  PraxisWorkspaceSurface: () => <div>Praxis Workspace Surface</div>,
}));

import { AideonDesktopRoot } from './root';

describe('AideonDesktopRoot', () => {
  it('renders the Praxis workspace surface', () => {
    render(<AideonDesktopRoot />);

    expect(screen.getByText(/Praxis Workspace Surface/)).toBeInTheDocument();
  });
});
