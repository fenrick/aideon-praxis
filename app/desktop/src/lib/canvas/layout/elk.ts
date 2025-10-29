// ElkJS wrapper for canvas auto-layout in the renderer.
// - Default algorithm: org.eclipse.elk.rectpacking
// - UI-only: no backend/DB logic belongs here

import type { ShapeInstance } from '../shape-store';

// Use the pre-bundled build so no web worker is required in Tauri
// elkjs types are minimal; we guard unknowns at the edge

import ELK from 'elkjs/lib/elk.bundled.js';

// Minimal local types to satisfy lint and keep surface small
interface ElkChild {
  id: string;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
}
interface ElkGraph {
  id: string;
  layoutOptions?: Record<string, string>;
  children?: ElkChild[];
}

export type ElkAlgorithm =
  | 'org.eclipse.elk.rectpacking'
  | 'org.eclipse.elk.layered'
  | 'org.eclipse.elk.mrtree';

export interface LayoutOptions {
  algorithm?: ElkAlgorithm;
  spacing?: number;
}

const elk = new ELK();

/**
 * Compute positions for the provided shapes using elkjs.
 * Returns a new array with x/y set from ELK results; width/height are preserved.
 */
export async function layoutShapesWithElk(
  shapes: ShapeInstance[],
  options: LayoutOptions = {},
): Promise<ShapeInstance[]> {
  if (!Array.isArray(shapes) || shapes.length === 0) return shapes;

  const algorithm: ElkAlgorithm = options.algorithm ?? 'org.eclipse.elk.rectpacking';
  const spacing = Math.max(0, Math.floor(options.spacing ?? 24));

  // Build a simple ELK graph with nodes only; edges can be added later
  const graph: ElkGraph = {
    id: 'root',
    layoutOptions: {
      'elk.algorithm': algorithm,
      'elk.spacing.nodeNode': String(spacing),
    },
    children: shapes.map((s) => ({ id: s.id, width: s.w, height: s.h })),
  };

  try {
    const result = (await elk.layout(graph)) as ElkGraph;
    const byId = new Map<string, { x: number; y: number }>();
    for (const c of result.children ?? []) {
      const x = c.x ?? 0;
      const y = c.y ?? 0;
      byId.set(c.id, { x: Number.isFinite(x) ? x : 0, y: Number.isFinite(y) ? y : 0 });
    }
    return shapes.map((s) => {
      const p = byId.get(s.id);
      if (p && Number.isFinite(p.x) && Number.isFinite(p.y)) {
        return { ...s, x: p.x, y: p.y };
      }
      return s;
    });
  } catch {
    // Keep existing positions if layout fails
    return shapes;
  }
}
