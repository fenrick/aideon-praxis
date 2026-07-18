import { useMemo } from 'react';

import type { CanvasRuntimeLayoutPersistence } from 'aideon/canvas/canvas-runtime';
import { getCanvasLayout, saveCanvasLayout } from 'praxis/praxis-api';
import type { PraxisCanvasWidget as CanvasWidget, GraphLayoutContext } from 'praxis/types';

interface CanvasLayoutInput {
  readonly documentId?: string;
}

interface CanvasLayoutResult {
  readonly canvasLayoutKey?: string;
  readonly graphLayoutContext?: GraphLayoutContext;
  readonly canvasLayoutPersistence?: CanvasRuntimeLayoutPersistence<CanvasWidget>;
}

/**
 * Derive the canvas layout key, graph layout context, and layout persistence
 * adapter from the active document. All three are undefined until a document is
 * resolved.
 *
 * Layout arrangement is deliberately **not** keyed by the viewpoint: the key is
 * the document only. Changing valid time, scenario, or layer changes the data
 * the canvas shows, never the arrangement — a scenario switch must not silently
 * rearrange the studio.
 * @param input - Active document id.
 * @param input.documentId - Active template document id.
 */
export function useCanvasLayout({ documentId }: CanvasLayoutInput): CanvasLayoutResult {
  const canvasLayoutKey = useMemo(() => {
    if (!documentId) {
      return;
    }
    return documentId;
  }, [documentId]);

  const graphLayoutContext = useMemo<GraphLayoutContext | undefined>(() => {
    if (!documentId) {
      return;
    }
    return { docId: documentId };
  }, [documentId]);

  const canvasLayoutPersistence = useMemo<
    CanvasRuntimeLayoutPersistence<CanvasWidget> | undefined
  >(() => {
    if (!documentId) {
      return;
    }

    return {
      load: async () => {
        try {
          const layout = await getCanvasLayout({ docId: documentId });
          if (!layout) {
            return;
          }

          const positions: Record<string, { x: number; y: number }> = {};
          const sizes: Record<string, { w: number; h: number }> = {};

          for (const node of layout.nodes) {
            positions[node.id] = { x: node.x, y: node.y };
            sizes[node.id] = { w: node.w, h: node.h };
          }

          return { positions, sizes };
        } catch {
          return;
        }
      },
      save: async (canvasWidgets, snapshot) => {
        try {
          const nodes = canvasWidgets
            .map((widget) => {
              const position = snapshot.positions[widget.id];
              const size = snapshot.sizes[widget.id];
              if (!position || !size) {
                return;
              }
              return {
                id: widget.id,
                typeId: 'widget',
                x: position.x,
                y: position.y,
                w: size.w,
                h: size.h,
                z: 0,
                label: widget.title,
              };
            })
            .filter((node): node is NonNullable<typeof node> => node !== undefined);

          await saveCanvasLayout({
            docId: documentId,
            nodes,
            edges: [],
            groups: [],
          });
        } catch {
          // ignore persistence failures
        }
      },
    };
  }, [documentId]);

  return { canvasLayoutKey, graphLayoutContext, canvasLayoutPersistence };
}
