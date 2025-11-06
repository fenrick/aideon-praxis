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

type ElkConstructor = new () => unknown;

function isElkConstructor(value: unknown): value is ElkConstructor {
  return typeof value === 'function';
}

function createElkInstance(source: unknown): unknown {
  if (!isElkConstructor(source)) return null;
  const Ctor: ElkConstructor = source;
  return new Ctor();
}

const elk: unknown = createElkInstance(ELK);

interface ElkLayoutEngine {
  layout(graph: ElkGraph): Promise<unknown>;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isElkLayoutEngine(value: unknown): value is ElkLayoutEngine {
  if (!isRecord(value)) return false;
  const candidate = value as { layout?: unknown };
  return typeof candidate.layout === 'function';
}

function isOptionalNumber(value: unknown): value is number | undefined {
  return value === undefined || typeof value === 'number';
}

function isElkChild(value: unknown): value is ElkChild {
  if (!isRecord(value)) return false;
  if (typeof value.id !== 'string') return false;

  const candidate = value as Partial<ElkChild>;
  return (
    isOptionalNumber(candidate.x) &&
    isOptionalNumber(candidate.y) &&
    isOptionalNumber(candidate.width) &&
    isOptionalNumber(candidate.height)
  );
}

function hasValidLayoutOptions(value: unknown): value is Record<string, string> | undefined {
  if (value === undefined) return true;
  if (!isRecord(value)) return false;
  const entries = Object.values(value);
  for (const option of entries) {
    if (typeof option !== 'string') return false;
  }
  return true;
}

function hasValidChildren(value: unknown): value is ElkChild[] | undefined {
  if (value === undefined) return true;
  if (!Array.isArray(value)) return false;
  for (const child of value) {
    if (!isElkChild(child)) return false;
  }
  return true;
}

function isElkGraph(value: unknown): value is ElkGraph {
  if (!isRecord(value) || typeof value.id !== 'string') return false;

  const candidate = value as { layoutOptions?: unknown; children?: unknown };
  return hasValidLayoutOptions(candidate.layoutOptions) && hasValidChildren(candidate.children);
}

function resolveLayoutEngine(engine: unknown): ElkLayoutEngine | null {
  return isElkLayoutEngine(engine) ? engine : null;
}

async function performLayout(engine: ElkLayoutEngine, graph: ElkGraph): Promise<ElkGraph | null> {
  try {
    const result = await engine.layout(graph);
    return isElkGraph(result) ? result : null;
  } catch {
    return null;
  }
}

function applyLayout(shapes: ShapeInstance[], graph: ElkGraph): ShapeInstance[] {
  const positioned = new Map<string, { x: number; y: number }>();
  for (const child of graph.children ?? []) {
    const x = typeof child.x === 'number' && Number.isFinite(child.x) ? child.x : 0;
    const y = typeof child.y === 'number' && Number.isFinite(child.y) ? child.y : 0;
    positioned.set(child.id, { x, y });
  }

  return shapes.map((shape) => {
    const coordinates = positioned.get(shape.id);
    if (coordinates && Number.isFinite(coordinates.x) && Number.isFinite(coordinates.y)) {
      return { ...shape, x: coordinates.x, y: coordinates.y };
    }
    return shape;
  });
}

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

  const layoutEngine = resolveLayoutEngine(elk);
  if (!layoutEngine) {
    return shapes;
  }

  const result = await performLayout(layoutEngine, graph);
  if (!result) {
    return shapes;
  }

  return applyLayout(shapes, result);
}
