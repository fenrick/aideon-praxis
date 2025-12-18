import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { AideonShellLayout } from 'aideon/shell/aideon-shell-layout';

describe('AideonShellLayout', () => {
  it('renders navigation, content, and inspector panes', () => {
    render(
      <AideonShellLayout
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
