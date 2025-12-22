import type { CanvasTemplate } from 'praxis/templates';

import { isTauri } from 'praxis/platform';

import { Button } from 'design-system/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from 'design-system/components/ui/select';
import { cn } from 'design-system/lib/utilities';

export interface TemplateToolbarProperties {
  readonly scenarioName?: string;
  readonly templateName?: string;
  readonly templates: CanvasTemplate[];
  readonly activeTemplateId: string;
  readonly onTemplateChange: (templateId: string) => void;
  readonly onTemplateSave: () => void;
  readonly onCreateWidget: () => void;
  readonly loading?: boolean;
}

/**
 * Compact scenario/template controls for the top toolbar.
 * @param root0
 * @param root0.scenarioName
 * @param root0.templateName
 * @param root0.templates
 * @param root0.activeTemplateId
 * @param root0.onTemplateChange
 * @param root0.onTemplateSave
 * @param root0.onCreateWidget
 * @param root0.loading
 */
export function TemplateToolbar({
  scenarioName,
  templateName,
  templates,
  activeTemplateId,
  onTemplateChange,
  onTemplateSave,
  onCreateWidget,
  loading = false,
}: TemplateToolbarProperties) {
  const header = scenarioName?.trim()
    ? `${scenarioName} · ${templateName ?? 'Template'}`
    : (templateName ?? 'Template');

  const shouldUseNativeSelect = isTauri();
  const activeTemplateExists = templates.some((template) => template.id === activeTemplateId);
  const templateSelectValue = activeTemplateExists ? activeTemplateId : '';

  return (
    <div className="flex items-center gap-2">
      <div className="hidden max-w-[220px] flex-col text-right lg:flex">
        <span className="truncate text-xs font-semibold text-foreground">{header}</span>
        <span className="truncate text-[0.7rem] text-muted-foreground">Template controls</span>
      </div>

      {shouldUseNativeSelect ? (
        <select
          aria-label="Select template"
          value={templateSelectValue}
          disabled={loading || templates.length === 0}
          onChange={(event) => {
            const nextValue = event.target.value;
            if (nextValue) {
              onTemplateChange(nextValue);
            }
          }}
          className={cn(
            'h-9 w-[210px] rounded-md border border-input bg-background/80 px-3 text-sm text-foreground shadow-xs outline-none transition-[color,box-shadow] focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50',
          )}
        >
          <option value="" disabled>
            Select template
          </option>
          {templates.map((template) => (
            <option key={template.id} value={template.id}>
              {template.name}
            </option>
          ))}
        </select>
      ) : (
        <Select
          value={templateSelectValue}
          disabled={loading || templates.length === 0}
          onValueChange={(value) => {
            onTemplateChange(value);
          }}
          aria-label="Select template"
        >
          <SelectTrigger className="h-9 w-[210px] bg-background/80">
            <SelectValue placeholder="Select template" />
          </SelectTrigger>
          <SelectContent>
            {templates.map((template) => (
              <SelectItem key={template.id} value={template.id}>
                <div className="flex flex-col">
                  <span className="font-medium">{template.name}</span>
                  <span className="text-xs text-muted-foreground">{template.description}</span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      <Button
        variant="secondary"
        size="sm"
        onClick={() => {
          onTemplateSave();
        }}
        disabled={loading}
      >
        Save
      </Button>
      <Button
        size="sm"
        onClick={() => {
          onCreateWidget();
        }}
        disabled={loading}
      >
        Add widget
      </Button>
    </div>
  );
}
