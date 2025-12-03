import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const fetchMetaModelSpy = vi.fn();

vi.mock('/lib/meta-model', async () => {
  const actual = await vi.importActual<typeof import('/lib/meta-model')>('/lib/meta-model');
  return {
    ...actual,
    fetchMetaModel: () => fetchMetaModelSpy(),
  };
});

import { MetaModelPanel } components/dashboard/meta-model-panel';
import type { MetaModelSchema } lib/meta-model';

const SAMPLE_SCHEMA: MetaModelSchema = {
  version: '1.0',
  description: 'Test schema',
  types: [
    {
      id: 'Capability',
      label: 'Capability',
      attributes: [{ name: 'owner', type: 'string', required: true }],
    },
  ],
  relationships: [
    {
      id: 'supports',
      label: 'Supports',
      from: ['Capability'],
      to: ['Capability'],
    },
  ],
};

describe('MetaModelPanel', () => {
  beforeEach(() => {
    fetchMetaModelSpy.mockReset();
    fetchMetaModelSpy.mockResolvedValue(SAMPLE_SCHEMA);
  });

  it('renders schema summary and attributes', async () => {
    render(<MetaModelPanel />);

    expect(await screen.findByText('Capability')).toBeInTheDocument();
    expect(screen.getByText('Supports')).toBeInTheDocument();
  });

  it('shows error banner if fetch fails and allows retry', async () => {
    fetchMetaModelSpy
      .mockRejectedValueOnce(new Error('network down'))
      .mockResolvedValueOnce(SAMPLE_SCHEMA);
    render(<MetaModelPanel />);

    expect(await screen.findByText('Failed to load meta-model')).toBeInTheDocument();
    const [reloadButton] = screen.getAllByText('Reload schema');
    fireEvent.click(reloadButton);
    expect(await screen.findByText('Capability')).toBeInTheDocument();
  });
});
