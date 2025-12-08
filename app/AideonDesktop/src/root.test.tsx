import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('./canvas', () => ({
  PraxisCanvasSurface: () => <div>Praxis Canvas Surface</div>,
}));

import { AideonDesktopRoot } from './root';

describe('AideonDesktopRoot', () => {
  it('renders the Praxis canvas surface', () => {
    render(<AideonDesktopRoot />);

    expect(screen.getByText(/Praxis Canvas Surface/)).toBeInTheDocument();
  });
});
