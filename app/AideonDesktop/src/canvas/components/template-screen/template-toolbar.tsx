import type { CanvasTemplate } from 'canvas/templates';

import { Button } from 'design-system/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from 'design-system/components/ui/select';

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
    : templateName ?? 'Template';

  return (
    <div className="flex items-center gap-2">
      <div className="hidden max-w-[220px] flex-col text-right lg:flex">
        <span className="truncate text-xs font-semibold text-foreground">{header}</span>
        <span className="truncate text-[0.7rem] text-muted-foreground">Template controls</span>
      </div>

      <Select
        value={activeTemplateId}
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

