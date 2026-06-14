import { useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

import { isTauri } from 'praxis/platform';
import type { CanvasTemplate } from 'praxis/templates';
import type { TemporalPanelActions, TemporalPanelState } from 'praxis/time/use-temporal-panel';

import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from 'design-system';
import { Clock, Command, LayoutGrid, MoreHorizontal, RefreshCw } from 'design-system/icons';
import { cn } from 'design-system/lib/utilities';

import { TimeControlPanel } from '../blocks/time-control-panel';
import { ViewpointBar } from './viewpoint-bar';

export interface PraxisWorkspaceToolbarProperties {
  readonly scenarioName?: string;
  readonly templates: CanvasTemplate[];
  readonly activeTemplateId: string;
  readonly templateName?: string;
  readonly onTemplateChange: (templateId: string) => void;
  readonly onTemplateSave: () => void;
  readonly onCreateWidget: () => void;
  readonly temporalState: TemporalPanelState;
  readonly temporalActions: TemporalPanelActions;
  readonly loading?: boolean;
}

const COMMAND_PALETTE_EVENT = 'aideon_workspace_open_command_palette';
const HEADER_PAGES = ['Canvas', 'Overview', 'Timeline', 'Activity'] as const;

/**
 *
 */
function dispatchCommandPaletteEvent() {
  if (typeof globalThis === 'undefined') {
    return;
  }
  globalThis.dispatchEvent(new CustomEvent(COMMAND_PALETTE_EVENT));
}

/**
 * Compact page header for the Praxis workspace, with template selection and actions.
 * @param props - Workspace toolbar props.
 * @param props.scenarioName
 * @param props.templates
 * @param props.activeTemplateId
 * @param props.templateName
 * @param props.onTemplateChange
 * @param props.onTemplateSave
 * @param props.onCreateWidget
 * @param props.temporalState
 * @param props.temporalActions
 * @param props.loading
 */
export function PraxisWorkspaceToolbar({
  scenarioName,
  templates,
  activeTemplateId,
  templateName,
  onTemplateChange,
  onTemplateSave,
  onCreateWidget,
  temporalState,
  temporalActions,
  loading = false,
}: PraxisWorkspaceToolbarProperties) {
  const [timeDialogOpen, setTimeDialogOpen] = useState(false);
  const [pagesDialogOpen, setPagesDialogOpen] = useState(false);
  const shouldUseNativeSelect = isTauri();

  const headerEyebrow = scenarioName ?? temporalState.branch ?? 'No scenario selected';
  const headerTitle = templateName ?? 'Select a template';
  const headerDescription = 'Graph + KPI + catalogue snapshot for leadership reviews';
  const activeTemplateExists = templates.some((template) => template.id === activeTemplateId);
  const templateSelectValue = activeTemplateExists ? activeTemplateId : '';

  const handlePageMenuSelect = () => {
    setPagesDialogOpen(true);
  };

  const handleTimeMenuSelect = () => {
    setTimeDialogOpen(true);
  };

  const handleCommandsMenuSelect = dispatchCommandPaletteEvent;

  return (
    <>
      <div className="border-border/60 bg-background/90 border-t px-3 pt-3 pb-3 md:px-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-1">
            <p className="text-muted-foreground text-xs font-semibold tracking-[0.24em] uppercase">
              {headerEyebrow}
            </p>
            <h1 className="text-foreground text-xl leading-tight font-semibold">{headerTitle}</h1>
            <p className="text-muted-foreground line-clamp-1 text-sm">{headerDescription}</p>
          </div>
          <div className="flex flex-wrap items-center justify-start gap-2 lg:justify-end">
            <ViewpointBar state={temporalState} actions={temporalActions} />
            <div className="min-w-[200px]">
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
                    'border-input bg-background text-foreground focus-visible:border-ring focus-visible:ring-ring/50 h-9 w-full rounded-md border px-3 text-sm shadow-xs transition-colors outline-none focus-visible:ring-2 disabled:cursor-not-allowed disabled:opacity-50',
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
                  <SelectTrigger className="h-9 w-full">
                    <SelectValue placeholder="Select template" />
                  </SelectTrigger>
                  <SelectContent>
                    {templates.map((template) => (
                      <SelectItem key={template.id} value={template.id}>
                        <div className="flex flex-col">
                          <span className="font-medium">{template.name}</span>
                          <span className="text-muted-foreground text-xs">
                            {template.description}
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
            <Button variant="default" size="sm" onClick={onCreateWidget} disabled={loading}>
              Add widget
            </Button>
            <Button variant="secondary" size="sm" onClick={onTemplateSave} disabled={loading}>
              Save
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9"
                  aria-label="More workspace actions"
                >
                  <MoreHorizontal />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-60 space-y-1">
                <DropdownMenuItem
                  onSelect={() => {
                    temporalActions.refreshBranches().catch(() => false);
                  }}
                  className="flex items-center gap-2"
                >
                  <RefreshCw className="size-4" />
                  Refresh
                </DropdownMenuItem>
                <DropdownMenuItem
                  onSelect={handlePageMenuSelect}
                  className="flex items-center gap-2"
                >
                  <LayoutGrid className="size-4" />
                  Pages
                </DropdownMenuItem>
                <DropdownMenuItem
                  onSelect={handleTimeMenuSelect}
                  className="flex items-center gap-2"
                >
                  <Clock className="size-4" />
                  Timeline
                </DropdownMenuItem>
                <DropdownMenuItem
                  onSelect={handleCommandsMenuSelect}
                  className="flex items-center gap-2"
                >
                  <Command className="size-4" />
                  Commands
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
      <PageOverlay
        open={timeDialogOpen}
        onClose={() => {
          setTimeDialogOpen(false);
        }}
        title="Timeline"
        description="Advanced timeline: scrub moments, compare, and merge scenarios."
      >
        <TimeControlPanel state={temporalState} actions={temporalActions} />
      </PageOverlay>
      <PageOverlay
        open={pagesDialogOpen}
        onClose={() => {
          setPagesDialogOpen(false);
        }}
        title="Pages"
        description="Jump to a workspace page."
      >
        <div className="text-foreground space-y-2 text-sm">
          {HEADER_PAGES.map((page) => (
            <div key={page} className="border-border/50 rounded-md border px-3 py-2">
              {page}
            </div>
          ))}
        </div>
      </PageOverlay>
    </>
  );
}

/**
 *
 * @param root0
 * @param root0.open
 * @param root0.onClose
 * @param root0.title
 * @param root0.description
 * @param root0.children
 */
function PageOverlay({
  open,
  onClose,
  title,
  description,
  children,
}: {
  readonly open: boolean;
  readonly onClose: () => void;
  readonly title: string;
  readonly description: string;
  readonly children: ReactNode;
}) {
  if (!open || typeof document === 'undefined') {
    return;
  }

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-black/60"
        aria-label="Close overlay"
        onClick={onClose}
      />
      <dialog
        open
        className="bg-background relative h-full max-h-[90vh] w-full max-w-3xl overflow-auto rounded-2xl p-6 shadow-2xl"
        aria-label={title}
        onCancel={(event) => {
          event.preventDefault();
          onClose();
        }}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold">{title}</p>
            <p className="text-muted-foreground text-xs">{description}</p>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>
        <div className="mt-4 text-xs/relaxed">{children}</div>
      </dialog>
    </div>,
    document.body,
  );
}
