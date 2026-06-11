import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import {
  SidebarHeading,
  SidebarNav,
  SidebarSection,
  SidebarShell,
} from 'design-system/blocks/sidebar';
import { Toolbar, ToolbarSection, ToolbarSeparator } from 'design-system/blocks/toolbar';

describe('Sidebar blocks', () => {
  it('compose shell, section, heading and nav with defaults', () => {
    render(
      <SidebarShell>
        <SidebarSection>
          <SidebarHeading>Section</SidebarHeading>
          <SidebarNav>
            <a href="#one">One</a>
          </SidebarNav>
        </SidebarSection>
      </SidebarShell>,
    );
    expect(screen.getByRole('complementary')).toBeInTheDocument();
    expect(screen.getByText('Section')).toHaveClass('tracking-[0.3em]');
    expect(screen.getByRole('navigation')).toContainElement(screen.getByText('One'));
  });

  it('supports unpadded sections', () => {
    render(
      <SidebarSection padded={false} data-testid="section">
        Plain
      </SidebarSection>,
    );
    expect(screen.getByTestId('section')).not.toHaveClass('px-4');
  });
});

describe('Toolbar blocks', () => {
  it('renders toolbar with sections and separator', () => {
    render(
      <Toolbar data-testid="toolbar">
        <ToolbarSection justify="start">Left</ToolbarSection>
        <ToolbarSeparator />
        <ToolbarSection justify="end">Right</ToolbarSection>
      </Toolbar>,
    );
    expect(screen.getByTestId('toolbar')).toHaveClass('min-h-10');
    const leftSection = screen.getByText('Left', { selector: 'div' });
    const rightSection = screen.getByText('Right', { selector: 'div' });
    expect(leftSection).toHaveClass('justify-start');
    expect(rightSection).toHaveClass('justify-end');
    const separator = screen.getByText('Right').previousSibling as HTMLElement;
    expect(separator).toHaveClass('h-5');
  });
});
