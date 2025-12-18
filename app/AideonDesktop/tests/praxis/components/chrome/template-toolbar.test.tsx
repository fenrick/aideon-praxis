import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { TemplateToolbar } from 'praxis/components/chrome/template-toolbar';
import type { CanvasTemplate } from 'praxis/templates';

describe('TemplateToolbar', () => {
  it('renders header and triggers save/add actions', () => {
    const onTemplateSave = vi.fn();
    const onCreateWidget = vi.fn();
    const onTemplateChange = vi.fn();
    const templates: CanvasTemplate[] = [
      { id: 't1', name: 'T1', description: 'Desc' } as unknown as CanvasTemplate,
    ];

    render(
      <TemplateToolbar
        scenarioName="Scenario A"
        templateName="My Template"
        templates={templates}
        activeTemplateId="t1"
        onTemplateChange={onTemplateChange}
        onTemplateSave={onTemplateSave}
        onCreateWidget={onCreateWidget}
      />,
    );

    expect(screen.getByText(/Scenario A · My Template/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(onTemplateSave).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole('button', { name: 'Add widget' }));
    expect(onCreateWidget).toHaveBeenCalledTimes(1);
  });
});
