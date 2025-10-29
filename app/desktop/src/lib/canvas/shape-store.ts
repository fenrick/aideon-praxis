// Use relative path to keep ESLint TS type resolution happy (no Vite alias)
import { getShape, registerShape } from '../registries/shape-registry';
import { tauriInvoke } from '../tauri-invoke';
import Rect from './Rect.svelte';

export interface ShapeInstance {
  id: string;
  typeId: string;
  x: number;
  y: number;
  w: number;
  h: number;
  props?: Record<string, unknown>;
}

export type Selection = Set<string>;

let shapes: ShapeInstance[] = [];
let selection: Selection = new Set();
const listeners = new Set<() => void>();
let gridEnabled = false;
let gridSpacing = 20;

export function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  listener();
  return () => listeners.delete(listener);
}
function emit() {
  for (const l of listeners) l();
}

export function getShapes() {
  return shapes;
}
export function getSelection() {
  return selection;
}
export function getGridEnabled() {
  return gridEnabled;
}
export function getGridSpacing() {
  return gridSpacing;
}
export function setGridEnabled(enabled: boolean) {
  gridEnabled = enabled;
  emit();
}
export function setGridSpacing(spacing: number) {
  gridSpacing = Math.max(2, Math.floor(spacing));
  emit();
}
export function setShapes(next: ShapeInstance[]) {
  shapes = next;
  emit();
}
export function clearSelection() {
  if (selection.size === 0) return;
  selection = new Set();
  emit();
}
export function selectOnly(id: string) {
  selection = new Set([id]);
  emit();
}
export function toggleSelect(id: string) {
  const next = new Set(selection);
  if (next.has(id)) next.delete(id);
  else next.add(id);
  selection = next;
  emit();
}
export function selectWithin(box: { x: number; y: number; w: number; h: number }) {
  const next = new Set<string>();
  for (const s of shapes) {
    if (intersects(box, s)) next.add(s.id);
  }
  selection = next;
  emit();
}

export function removeSelected() {
  if (selection.size === 0) return;
  shapes = shapes.filter((s) => !selection.has(s.id));
  selection = new Set();
  emit();
}

export function intersects(
  a: { x: number; y: number; w: number; h: number },
  b: { x: number; y: number; w: number; h: number },
) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

export function boundsOf(items: { x: number; y: number; w: number; h: number }[]) {
  if (items.length === 0) return { x: 0, y: 0, w: 0, h: 0 };
  let x1 = Number.POSITIVE_INFINITY;
  let y1 = Number.POSITIVE_INFINITY;
  let x2 = Number.NEGATIVE_INFINITY;
  let y2 = Number.NEGATIVE_INFINITY;
  for (const s of items) {
    x1 = Math.min(x1, s.x);
    y1 = Math.min(y1, s.y);
    x2 = Math.max(x2, s.x + s.w);
    y2 = Math.max(y2, s.y + s.h);
  }
  return { x: x1, y: y1, w: x2 - x1, h: y2 - y1 };
}

export function initDefaultShapes() {
  // Register a simple rectangle if not present
  if (!getShape('rect')) {
    const definition: Parameters<typeof registerShape>[0] = {
      id: 'rect',
      component: Rect as unknown,
      defaultProps: { label: 'Rect' },
    };
    registerShape(definition);
  }
  // Fetch demo scene from host (Rust); if it fails, fall back to inline defaults.
  if (shapes.length === 0) {
    void (async () => {
      try {
        const scene: {
          id: string;
          typeId: string;
          x: number;
          y: number;
          w: number;
          h: number;
          label?: string;
        }[] = await tauriInvoke('canvas_scene');
        if (Array.isArray(scene) && scene.length > 0) {
          shapes = scene.map((s) => ({
            id: s.id,
            typeId: s.typeId,
            x: s.x,
            y: s.y,
            w: s.w,
            h: s.h,
            props: s.label ? { label: s.label } : {},
          }));
          emit();
          return;
        }
      } catch {
        // ignore and fall back
      }
      shapes = [
        { id: 's1', typeId: 'rect', x: 200, y: 200, w: 200, h: 120, props: { label: 'Node A' } },
        { id: 's2', typeId: 'rect', x: 600, y: 480, w: 220, h: 140, props: { label: 'Node B' } },
      ];
      emit();
    })();
  }
}

export async function reloadScene(asOf: string) {
  try {
    const scene: {
      id: string;
      typeId: string;
      x: number;
      y: number;
      w: number;
      h: number;
      label?: string;
    }[] = await tauriInvoke('canvas_scene', { asOf: asOf });
    if (Array.isArray(scene)) {
      shapes = scene.map((s) => ({
        id: s.id,
        typeId: s.typeId,
        x: s.x,
        y: s.y,
        w: s.w,
        h: s.h,
        props: s.label ? { label: s.label } : {},
      }));
      emit();
    }
  } catch {
    // ignore; keep existing
  }
}
