import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { InspectorContent } from 'platform/platform-inspector';

describe('InspectorContent selection kind label', () => {
  it('labels an artefact selection', () => {
    render(
      <InspectorContent
        selectionId="w1"
        selectionKind="artefact"
        saving={false}
        reloadTick={0}
        onSave={vi.fn()}
        onReset={vi.fn()}
      />,
    );
    expect(screen.getByText('Artefact')).toBeInTheDocument();
  });
});
