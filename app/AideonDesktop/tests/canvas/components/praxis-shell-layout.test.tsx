import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { PraxisShellLayout } from 'canvas/components/template-screen/praxis-shell-layout';

describe('PraxisShellLayout', () => {
  it('renders navigation, content, and inspector panes', () => {
    render(
      <PraxisShellLayout
        navigation={<div>ProjectsNav</div>}
        content={<div>MainContent</div>}
        inspector={<div>InspectorPane</div>}
        toolbar={<div>ToolbarContent</div>}
      />,
    );

    expect(screen.getByText('ProjectsNav')).toBeInTheDocument();
    expect(screen.getByText('MainContent')).toBeInTheDocument();
    expect(screen.getByText('InspectorPane')).toBeInTheDocument();
    expect(screen.getByText('ToolbarContent')).toBeInTheDocument();
  });
});
