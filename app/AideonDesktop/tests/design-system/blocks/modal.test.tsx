import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('design-system/ui/dialog', () => {
  const Dialog = ({ children, ...props }: { children: React.ReactNode }) => (
    <div data-testid="dialog" {...props}>
      {children}
    </div>
  );
  const withTestId =
    (testId: string) =>
    ({ className, children, ...props }: any) => (
      <div data-testid={testId} data-class={className} {...props}>
        {children}
      </div>
    );
  return {
    Dialog,
    DialogContent: withTestId('dialog-content'),
    DialogDescription: withTestId('dialog-description'),
    DialogFooter: withTestId('dialog-footer'),
    DialogHeader: withTestId('dialog-header'),
    DialogTitle: withTestId('dialog-title'),
  };
});

import {
  Modal,
  ModalContent,
  ModalDescription,
  ModalFooter,
  ModalHeader,
  ModalTitle,
} from 'design-system/blocks/modal';

describe('Modal block', () => {
  it('forwards props and merges class names for content', () => {
    render(
      <Modal>
        <ModalContent className="extra">body</ModalContent>
      </Modal>,
    );
    const content = screen.getByTestId('dialog-content');
    expect(content).toHaveAttribute('data-class', expect.stringContaining('extra'));
    expect(content).toHaveTextContent('body');
  });

  it('renders header, title, description, and footer helpers', () => {
    render(
      <Modal>
        <ModalHeader className="head">
          <ModalTitle className="title">Title</ModalTitle>
          <ModalDescription className="desc">Details</ModalDescription>
        </ModalHeader>
        <ModalFooter className="foot">Actions</ModalFooter>
      </Modal>,
    );
    expect(screen.getByTestId('dialog-header')).toHaveAttribute('data-class', expect.any(String));
    expect(screen.getByText('Title')).toBeInTheDocument();
    expect(screen.getByText('Details')).toBeInTheDocument();
    expect(screen.getByTestId('dialog-footer')).toHaveTextContent('Actions');
  });
});
