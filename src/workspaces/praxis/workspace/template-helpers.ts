import type { CanvasTemplate, TemplateWidgetConfig } from 'praxis/templates';
import type { WidgetRegistryEntry } from 'praxis/widgets/registry';

/**
 * Build a template widget config from a registry entry, preserving its view kind.
 * @param entry - Widget registry entry.
 * @param widgetId - Identifier for the new widget.
 */
export function createTemplateWidget(
  entry: WidgetRegistryEntry,
  widgetId: string,
): TemplateWidgetConfig {
  const base = { id: widgetId, title: entry.label, size: entry.defaultSize };
  switch (entry.defaultView.kind) {
    case 'graph': {
      return { ...base, kind: 'graph', view: entry.defaultView };
    }
    case 'chart': {
      return { ...base, kind: 'chart', view: entry.defaultView };
    }
    case 'catalogue': {
      return { ...base, kind: 'catalogue', view: entry.defaultView };
    }
    case 'matrix': {
      return { ...base, kind: 'matrix', view: entry.defaultView };
    }
    default: {
      return { ...base, kind: 'chart', view: entry.defaultView };
    }
  }
}

/**
 * Upsert a template in the current list, replacing by id when found.
 * @param templates - Existing templates.
 * @param nextTemplate - Template to insert or replace.
 */
export function upsertTemplate(
  templates: CanvasTemplate[],
  nextTemplate: CanvasTemplate,
): CanvasTemplate[] {
  const existingIndex = templates.findIndex((entry) => entry.id === nextTemplate.id);
  if (existingIndex === -1) {
    return [...templates, nextTemplate];
  }
  return templates.map((entry) => (entry.id === nextTemplate.id ? nextTemplate : entry));
}

export const __test__ = {
  createTemplateWidget,
};
