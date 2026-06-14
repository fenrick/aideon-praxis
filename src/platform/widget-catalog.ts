import { useMemo, useRef, type ReactElement } from 'react';

import type { CanvasWidgetLayout } from 'aideon/canvas/types';

import type { EngineDefinition, WidgetContribution, WidgetRenderContext } from './engine';
import { ENGINES } from './engines';
import { useLicensing } from './licensing';

export interface WidgetCatalog {
  /** Widget types offered by licensed engines (for the widget library). */
  readonly widgets: readonly WidgetContribution[];
  /** Seed a new widget of the given type, or undefined if unavailable. */
  readonly createWidget: (type: string) => CanvasWidgetLayout | undefined;
  /** Render a widget by routing to its owning engine. */
  readonly renderWidget: (
    widget: CanvasWidgetLayout,
    context: WidgetRenderContext,
  ) => ReactElement | undefined;
}

/**
 * Resolve a widget's type tag (engines tag instances with `kind` or `type`).
 * @param widget - The widget instance.
 */
function widgetType(widget: CanvasWidgetLayout): string | undefined {
  const tagged = widget as { kind?: string; type?: string };
  return tagged.kind ?? tagged.type;
}

/**
 * The host widget catalog: widgets contributed by **licensed** engines, plus
 * helpers to instantiate and render them. Unlicensed engines contribute nothing.
 */
export function useWidgetCatalog(): WidgetCatalog {
  const { licensed } = useLicensing();

  const counter = useRef(0);

  return useMemo<WidgetCatalog>(() => {
    const engines = ENGINES.filter((engine) => licensed(engine.id));
    const widgets = engines.flatMap((engine) => engine.widgets);

    const engineByType = new Map<string, EngineDefinition>();
    const creatorByType = new Map<string, WidgetContribution>();
    for (const engine of engines) {
      for (const contribution of engine.widgets) {
        engineByType.set(contribution.type, engine);
        creatorByType.set(contribution.type, contribution);
      }
    }

    return {
      widgets,
      createWidget: (type) => {
        const contribution = creatorByType.get(type);
        if (!contribution) {
          return;
        }
        counter.current += 1;
        return contribution.createWidget(`${type}-${String(counter.current)}`);
      },
      renderWidget: (widget, context) => {
        const type = widgetType(widget);
        const engine = type ? engineByType.get(type) : undefined;
        return engine ? engine.renderWidget(widget, context) : undefined;
      },
    };
  }, [licensed]);
}
