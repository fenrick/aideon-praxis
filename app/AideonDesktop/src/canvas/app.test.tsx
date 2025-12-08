import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('canvas/components/template-screen/template-header', () => ({
  TemplateHeader: () => <div>Template Header</div>,
}));

vi.mock('canvas/components/template-screen/scenario-search-bar', () => ({
  ScenarioSearchBar: () => <div>Scenario Search</div>,
}));

vi.mock('canvas/components/template-screen/overview-tabs', () => ({
  OverviewTabs: () => <div>Overview Tabs</div>,
}));

vi.mock('canvas/components/template-screen/projects-sidebar', () => ({
  ProjectsSidebar: () => <div>Projects Sidebar</div>,
}));

vi.mock('canvas/components/template-screen/properties-inspector', () => ({
  PropertiesInspector: () => <div>Properties Inspector</div>,
}));

vi.mock('canvas/praxis-api', () => ({
  listScenarios: vi.fn().mockResolvedValue([
    {
      id: 'main',
      name: 'Main Scenario',
      branch: 'main',
      updatedAt: '2025-01-01T00:00:00Z',
      isDefault: true,
    },
  ]),
}));

import { PraxisCanvasSurface } from './app';

describe('PraxisCanvasSurface', () => {
  it('renders the new shell layout pieces', async () => {
    render(<PraxisCanvasSurface />);

    expect(await screen.findByText(/Projects Sidebar/)).toBeInTheDocument();
    expect(screen.getByText(/Template Header/)).toBeInTheDocument();
    expect(screen.getByText(/Scenario Search/)).toBeInTheDocument();
    expect(screen.getByText(/Overview Tabs/)).toBeInTheDocument();
    expect(screen.getByText(/Properties Inspector/)).toBeInTheDocument();
  });
});
