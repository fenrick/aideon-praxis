import { beforeEach, describe, expect, it } from 'vitest';
import {
  __clearDocumentTypesForTest,
  getDocumentType,
  listDocumentTypes,
  registerDocumentType,
} from '../../src/lib/registries/document-registry';

describe('document registry', () => {
  beforeEach(() => __clearDocumentTypesForTest());

  it('registers and lists document types', () => {
    const Editor = {} as unknown;
    registerDocumentType({
      kind: 'diagram',
      title: 'Diagram',
      editor: Editor,
      serialize: (d) => JSON.stringify(d),
      deserialize: (s) => JSON.parse(s),
    });
    const t = getDocumentType('diagram');
    expect(t?.title).toBe('Diagram');
    expect(listDocumentTypes().map((x) => x.kind)).toContain('diagram');
  });
});
