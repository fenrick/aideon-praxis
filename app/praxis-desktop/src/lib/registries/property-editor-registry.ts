export interface PropertyEditorDefinition {
  type: string; // metamodel type id (e.g., Application, Capability)
  // Svelte component reference typed as unknown to avoid tight coupling
  component: unknown;
}

const editors = new Map<string, PropertyEditorDefinition>();

export function registerPropertyEditor(definition: PropertyEditorDefinition): void {
  if (!definition.type || !definition.component) throw new Error('invalid property editor');
  editors.set(definition.type, definition);
}

export function getPropertyEditor(type: string): PropertyEditorDefinition | undefined {
  return editors.get(type);
}

export function listPropertyEditors(): PropertyEditorDefinition[] {
  return [...editors.values()];
}

export function __clearPropertyEditorsForTest(): void {
  editors.clear();
}
