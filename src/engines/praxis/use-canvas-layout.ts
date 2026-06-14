import { useMemo } from 'react';

import type { CanvasRuntimeLayoutPersistence } from 'aideon/canvas/canvas-runtime';
import type { Layer } from 'dtos';
import { getCanvasLayout, saveCanvasLayout } from 'praxis/praxis-api';
import type { PraxisCanvasWidget as CanvasWidget, GraphLayoutContext } from 'praxis/types';

interface CanvasLayoutInput {
  readonly documentId?: string;
  readonly asOf?: string;
  readonly scenario?: string;
  readonly layer: Layer;
}

interface CanvasLayoutResult {
  readonly canvasLayoutKey?: string;
  readonly graphLayoutContext?: GraphLayoutContext;
  readonly canvasLayoutPersistence?: CanvasRuntimeLayoutPersistence<CanvasWidget>;
}

/**
 * Derive the canvas layout key, graph layout context, and layout persistence
 * adapter from the active document and runtime viewpoint. All three are
 * undefined until a document and as-of are resolved.
 * @param input - Active document id and runtime viewpoint.
 * @param input.documentId - Active template document id.
 * @param input.asOf - Runtime as-of token.
 * @param input.scenario - Runtime scenario branch.
 * @param input.layer - Runtime layer.
 */
export function useCanvasLayout({
  documentId,
  asOf,
  scenario,
  layer,
}: CanvasLayoutInput): CanvasLayoutResult {
  const canvasLayoutKey = useMemo(() => {
    if (!documentId || !asOf || !scenario) {
      return;
    }
    return `${documentId}::${scenario}::${layer}::${asOf}`;
  }, [documentId, asOf, layer, scenario]);

  const graphLayoutContext = useMemo<GraphLayoutContext | undefined>(() => {
    if (!documentId || !asOf) {
      return;
    }
    return { docId: documentId, asOf, scenario, layer };
  }, [documentId, asOf, layer, scenario]);

  const canvasLayoutPersistence = useMemo<
    CanvasRuntimeLayoutPersistence<CanvasWidget> | undefined
  >(() => {
    if (!documentId || !asOf) {
      return;
    }

    const context = { docId: documentId, asOf, scenario, layer } as const;

    return {
      load: async () => {
        try {
          const layout = await getCanvasLayout(context);
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
            docId: context.docId,
            asOf: context.asOf,
            scenario: context.scenario,
            nodes,
            edges: [],
            groups: [],
          });
        } catch {
          // ignore persistence failures
        }
      },
    };
  }, [documentId, asOf, layer, scenario]);

  return { canvasLayoutKey, graphLayoutContext, canvasLayoutPersistence };
}
