import { templateScreenCopy } from 'praxis/copy/template-screen';
import type { LayoutPreset } from 'praxis/layouts';

import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from 'design-system';

interface TemplateHeaderProperties {
  readonly scenarioName?: string;
  readonly templateName?: string;
  readonly templateDescription?: string;
  readonly templates: LayoutPreset[];
  readonly activeTemplateId: string;
  readonly onTemplateChange: (templateId: string) => void;
  readonly onTemplateSave: () => void;
  readonly onCreateWidget: () => void;
  readonly loading?: boolean;
}

/**
 * Title/header for the Scenario & Template workspace.
 * @param root0
 * @param root0.scenarioName
 * @param root0.templateName
 * @param root0.templateDescription
 * @param root0.templates
 * @param root0.activeTemplateId
 * @param root0.onTemplateChange
 * @param root0.onTemplateSave
 * @param root0.onCreateWidget
 * @param root0.loading
 */
export function TemplateHeader({
  scenarioName,
  templateName,
  templateDescription,
  templates,
  activeTemplateId,
  onTemplateChange,
  onTemplateSave,
  onCreateWidget,
  loading = false,
}: TemplateHeaderProperties) {
  const copy = templateScreenCopy;
  const description = templateDescription?.trim() ?? copy.templateDescriptionFallback;

  return (
    <Card className="border-border/70">
      <CardHeader className="gap-2 lg:flex-row lg:items-center lg:justify-between">
        <div className="space-y-1">
          <p className="text-muted-foreground text-sm">
            {copy.scenarioLabel}
            {scenarioName ? ` · ${scenarioName}` : ''}
          </p>
          <CardTitle className="text-3xl leading-tight font-semibold">
            {loading ? (
              <span className="bg-muted inline-block h-7 w-48 animate-pulse rounded" />
            ) : (
              templateName
            )}
          </CardTitle>
          <CardDescription className="text-muted-foreground text-base">
            {loading ? (
              <span className="bg-muted inline-block h-4 w-64 animate-pulse rounded" />
            ) : (
              description
            )}
          </CardDescription>
        </div>
        <CardContent className="flex flex-col gap-3 p-0 lg:w-auto">
          <Label className="text-muted-foreground text-xs font-medium" htmlFor="template-select">
            {copy.templateLabel}
          </Label>
          <Select
            value={activeTemplateId}
            disabled={loading || templates.length === 0}
            onValueChange={(value) => {
              onTemplateChange(value);
            }}
            aria-label={copy.templateSelectorLabel}
          >
            <SelectTrigger id="template-select" data-testid="template-select" className="w-64">
              <SelectValue placeholder={copy.templateSelectorLabel} />
            </SelectTrigger>
            <SelectContent>
              {templates.map((template) => (
                <SelectItem key={template.id} value={template.id}>
                  <div className="flex flex-col">
                    <span className="font-medium">{template.name}</span>
                    <span className="text-muted-foreground text-xs">{template.description}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={onTemplateSave}>
              {copy.saveTemplate}
            </Button>
            <Button onClick={onCreateWidget}>{copy.createWidget}</Button>
          </div>
        </CardContent>
      </CardHeader>
      {templates.length === 0 && (
        <CardContent className="text-muted-foreground text-sm">
          No templates available. Add one to begin exploring the scenario.
        </CardContent>
      )}
    </Card>
  );
}
