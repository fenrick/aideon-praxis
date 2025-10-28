import { beforeEach, describe, expect, it } from 'vitest';
import {
  __clearPropertyEditorsForTest,
  getPropertyEditor,
  listPropertyEditors,
  registerPropertyEditor,
} from '../../src/lib/registries/property-editor-registry';

describe('property editor registry', () => {
  beforeEach(() => __clearPropertyEditorsForTest());

  it('registers and retrieves editors by type', () => {
    registerPropertyEditor({ type: 'Application', component: {} as unknown });
    const ed = getPropertyEditor('Application');
    expect(ed?.type).toBe('Application');
    expect(listPropertyEditors().length).toBe(1);
  });
});
