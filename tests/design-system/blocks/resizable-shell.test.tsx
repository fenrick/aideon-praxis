import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { ResizableShell } from '@/design-system/blocks/resizable-shell';

describe('ResizableShell', () => {
  it('renders content and inspector slots', () => {
    render(
      <ResizableShell
        contentSlot={<div>Main content</div>}
        inspectorSlot={<div>Inspector panel</div>}
      />,
    );

    expect(screen.getByText('Main content')).toBeInTheDocument();
    expect(screen.getByText('Inspector panel')).toBeInTheDocument();
  });

  it('accepts onLayout without error', () => {
    const onLayout = vi.fn();
    render(
      <ResizableShell
        contentSlot={<div>Content</div>}
        inspectorSlot={<div>Inspector</div>}
        onLayout={onLayout}
      />,
    );

    expect(screen.getByText('Content')).toBeInTheDocument();
    expect(screen.getByText('Inspector')).toBeInTheDocument();
  });

  it('accepts custom defaultSizes without error', () => {
    render(
      <ResizableShell
        contentSlot={<div>Content 80</div>}
        inspectorSlot={<div>Inspector 20</div>}
        defaultSizes={[80, 20]}
      />,
    );

    expect(screen.getByText('Content 80')).toBeInTheDocument();
    expect(screen.getByText('Inspector 20')).toBeInTheDocument();
  });
});
