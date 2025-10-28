export type ShapeProperties = Record<string, unknown>;
export interface ShapeDefinition<T extends ShapeProperties = ShapeProperties> {
  id: string;
  component: unknown; // Svelte component type, kept generic to avoid coupling
  defaultProps?: Partial<T>;
}

const shapeMap = new Map<string, ShapeDefinition>();

export function registerShape(definition: ShapeDefinition): void {
  if (!definition.id || !definition.component) throw new Error('invalid shape definition');
  shapeMap.set(definition.id, definition);
}

export function getShape(id: string): ShapeDefinition | undefined {
  return shapeMap.get(id);
}

export function listShapes(): ShapeDefinition[] {
  return [...shapeMap.values()];
}

// test-only helper
export function __clearShapesForTest(): void {
  shapeMap.clear();
}
