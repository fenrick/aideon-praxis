import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('aideon/shell/aideon-desktop-shell', () => ({
  AideonDesktopShell: ({
    toolbar,
    navigation,
    content,
    inspector,
  }: {
    toolbar: ReactNode;
    navigation: ReactNode;
    content: ReactNode;
    inspector: ReactNode;
  }) => (
    <div>
      <div>{toolbar}</div>
      <div>{navigation}</div>
      <div>{content}</div>
      <div>{inspector}</div>
    </div>
  ),
}));

vi.mock('aideon/shell/aideon-toolbar', () => ({
  AideonToolbar: ({ workspaceToolbar }: { workspaceToolbar: ReactNode }) => (
    <div>App toolbar{workspaceToolbar}</div>
  ),
}));

vi.mock('platform', () => ({
  LicensingProvider: ({ children }: { children: ReactNode }) => children,
  HostPlatformProvider: ({ children }: { children: ReactNode }) => children,
  PlatformNavigation: () => <div>Navigation</div>,
  PlatformToolbar: () => <div>Layout toolbar</div>,
  PlatformContent: () => <div>Content</div>,
  PlatformInspector: () => <div>Inspector</div>,
}));

import { AideonDesktopRoot } from '@/root';

describe('AideonDesktopRoot', () => {
  it('renders the platform regions through the shell', () => {
    render(<AideonDesktopRoot />);

    expect(screen.getByText('Navigation')).toBeInTheDocument();
    expect(screen.getByText('Content')).toBeInTheDocument();
    expect(screen.getByText('Inspector')).toBeInTheDocument();
    expect(screen.getByText('Layout toolbar')).toBeInTheDocument();
  });
});
