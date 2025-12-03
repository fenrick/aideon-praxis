import type { MatrixWidgetConfig } canvas/types';
import type { MatrixViewModel } praxis-api';
import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const getMatrixViewMock = vi.fn<
  Parameters<(typeof import('/praxis-api'))['getMatrixView']>,
  ReturnType<(typeof import('/praxis-api'))['getMatrixView']>
>();

vi.mock('/praxis-api', async () => {
  const actual = await vi.importActual<typeof import('/praxis-api')>('/praxis-api');
  return {
    ...actual,
    getMatrixView: (...args: Parameters<typeof actual.getMatrixView>) =>
      getMatrixViewMock(...args) as ReturnType<typeof actual.getMatrixView>,
  };
});

import { MatrixWidget } canvas/widgets/matrix-widget';

const MATRIX_WIDGET: MatrixWidgetConfig = {
  id: 'matrix-widget',
  kind: 'matrix',
  title: 'Capability vs Environment',
  view: {
    id: 'matrix-view',
    name: 'Dependencies',
    kind: 'matrix',
    asOf: '2025-10-05T00:00:00.000Z',
    rowType: 'Capability',
    columnType: 'Environment',
  },
};

const MATRIX_VIEW: MatrixViewModel = {
  metadata: {
    id: 'matrix-view',
    name: 'Dependencies',
    asOf: '2025-10-05T00:00:00.000Z',
    fetchedAt: '2025-10-05T00:01:00.000Z',
    scenario: 'main',
    source: 'mock',
  },
  rows: [
    { id: 'cap-a', label: 'Capability A' },
    { id: 'cap-b', label: 'Capability B' },
  ],
  columns: [
    { id: 'env-prod', label: 'Production' },
    { id: 'env-dev', label: 'Development' },
  ],
  cells: [
    { rowId: 'cap-a', columnId: 'env-prod', state: 'connected', strength: 0.8 },
    { rowId: 'cap-b', columnId: 'env-dev', state: 'missing' },
  ],
};

describe('MatrixWidget', () => {
  beforeEach(() => {
    getMatrixViewMock.mockReset();
  });

  it('renders the relational grid returned by the host', async () => {
    getMatrixViewMock.mockResolvedValue(MATRIX_VIEW);

    render(<MatrixWidget widget={MATRIX_WIDGET} reloadVersion={0} />);

    await waitFor(() => expect(getMatrixViewMock).toHaveBeenCalled());
    expect(screen.getByText('Capability A')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Production' })).toBeInTheDocument();
    expect(screen.getByText('80%')).toBeInTheDocument();
  });

  it('shows API failures inline so the user sees actionable errors', async () => {
    getMatrixViewMock.mockRejectedValue(new Error('IPC offline'));

    render(<MatrixWidget widget={MATRIX_WIDGET} reloadVersion={2} />);

    expect(await screen.findByText('IPC offline')).toBeInTheDocument();
  });
});
