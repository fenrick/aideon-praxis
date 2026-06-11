import { describe, expect, it, vi } from 'vitest';

import { fetchMetaModel } from 'praxis/lib/meta-model';
import { getMetaModelDocument } from 'praxis/praxis-api';

vi.mock('praxis/praxis-api', () => ({ getMetaModelDocument: vi.fn() }));

describe('meta-model fetch', () => {
  it('delegates to host contract', async () => {
    vi.mocked(getMetaModelDocument).mockResolvedValue({
      version: 'v1',
      description: undefined,
      types: [],
      relationships: [],
      validation: undefined,
    });

    await expect(fetchMetaModel()).resolves.toMatchObject({ version: 'v1' });
    expect(getMetaModelDocument).toHaveBeenCalled();
  });
});
