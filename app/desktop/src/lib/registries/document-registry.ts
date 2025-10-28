export type DocumentKind = 'diagram' | 'catalog';

export interface DocumentType {
  kind: DocumentKind;
  title: string;
  // Editor is a Svelte component reference; typed as unknown to avoid coupling in libs
  editor: unknown;
  // Serialize/deserialize allow swapping persistence format later
  serialize: (document: unknown) => string;
  deserialize: (json: string) => unknown;
}

const documentTypes = new Map<DocumentKind, DocumentType>();

export function registerDocumentType(definition: DocumentType): void {
  documentTypes.set(definition.kind, definition);
}

export function getDocumentType(kind: DocumentKind): DocumentType | undefined {
  return documentTypes.get(kind);
}

export function listDocumentTypes(): DocumentType[] {
  return [...documentTypes.values()];
}

// test-only helper
export function __clearDocumentTypesForTest(): void {
  documentTypes.clear();
}
