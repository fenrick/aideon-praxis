import { useMemo, useState } from 'react';
import type { RefObject } from 'react';

import type { TemporalPanelActions, TemporalPanelState } from 'canvas/time/use-temporal-panel';

import { isTauri } from 'canvas/platform';
import { searchStore } from 'canvas/lib/search';
import type { CanvasTemplate } from 'canvas/templates';

import { Toolbar, ToolbarSection, ToolbarSeparator } from 'design-system/blocks/toolbar';
import { Menubar, MenubarContent, MenubarItem, MenubarMenu, MenubarTrigger } from 'design-system';
import { Badge } from 'design-system/components/ui/badge';
import { Button } from 'design-system/components/ui/button';
import { Input } from 'design-system/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from 'design-system/components/ui/popover';
import { TimeControlPanel } from '../blocks/time-control-panel';
import { TemplateToolbar } from './template-toolbar';

export interface PraxisToolbarProperties {
  readonly scenarioName?: string;
  readonly templates: CanvasTemplate[];
  readonly activeTemplateId: string;
  readonly templateName?: string;
  readonly onTemplateChange: (templateId: string) => void;
  readonly onTemplateSave: () => void;
  readonly onCreateWidget: () => void;
  readonly temporalState: TemporalPanelState;
  readonly temporalActions: TemporalPanelActions;
  readonly timeTriggerRef?: RefObject<HTMLButtonElement | null>;
  readonly loading?: boolean;
  readonly error?: string;
}

/**
 * Top toolbar for the Praxis canvas shell: app menu, scenario/template controls, search, and time.
 * @param root0
 * @param root0.scenarioName
 * @param root0.templates
 * @param root0.activeTemplateId
 * @param root0.templateName
 * @param root0.onTemplateChange
 * @param root0.onTemplateSave
 * @param root0.onCreateWidget
 * @param root0.temporalState
 * @param root0.temporalActions
 * @param root0.timeTriggerRef
 * @param root0.loading
 * @param root0.error
 */
export function PraxisToolbar({
  scenarioName,
  templates,
  activeTemplateId,
  templateName,
  onTemplateChange,
  onTemplateSave,
  onCreateWidget,
  temporalState,
  temporalActions,
  timeTriggerRef,
  loading = false,
  error,
}: PraxisToolbarProperties) {
  const isDesktop = isTauri();
  const modeLabel = isDesktop ? 'Desktop' : 'Browser preview';
  const trimmedScenarioName = scenarioName?.trim();
  const scenarioLabel =
    trimmedScenarioName && trimmedScenarioName.length > 0 ? trimmedScenarioName : 'Scenario';

  const [query, setQuery] = useState('');
  const placeholder = useMemo(() => {
    return `Search ${scenarioLabel.toLowerCase()}…`;
  }, [scenarioLabel]);

  return (
    <div className="flex flex-col gap-2">
      <Toolbar className="h-12 w-full rounded-2xl px-3 py-2">
        <ToolbarSection className="min-w-0 gap-2">
          <AppMenu />
          <ToolbarSeparator />
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="truncate text-sm font-semibold tracking-tight">Aideon Praxis</span>
              <Badge variant="secondary" className="hidden sm:inline-flex">
                {modeLabel}
              </Badge>
            </div>
            <div className="truncate text-xs text-muted-foreground">
              {scenarioName ? `Working in ${scenarioName}` : 'Local-first digital twin workspace'}
            </div>
          </div>
        </ToolbarSection>

        <ToolbarSection justify="center" className="hidden min-w-0 max-w-[520px] px-2 md:flex">
          <Input
            type="search"
            aria-label="Search"
            placeholder={placeholder}
            value={query}
            onChange={(event) => {
              const value = event.target.value;
              setQuery(value);
              if (value.trim()) {
                searchStore.search(value);
              } else {
                searchStore.clear();
              }
            }}
            className="h-9 bg-background/80"
          />
        </ToolbarSection>

        <ToolbarSection justify="end" className="gap-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button ref={timeTriggerRef} variant="outline" size="sm">
                Time
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-[380px] p-0">
              <TimeControlPanel state={temporalState} actions={temporalActions} />
            </PopoverContent>
          </Popover>

          <TemplateToolbar
            scenarioName={scenarioName}
            templateName={templateName}
            templates={templates}
            activeTemplateId={activeTemplateId}
            onTemplateChange={onTemplateChange}
            onTemplateSave={onTemplateSave}
            onCreateWidget={onCreateWidget}
            loading={loading}
          />
        </ToolbarSection>
      </Toolbar>

      {error ? (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive">
          {error}
        </div>
      ) : undefined}
    </div>
  );
}

/**
 * Menubar for application-level actions. Desktop integration is handled by the host.
 */
function AppMenu() {
  return (
    <Menubar className="border-none bg-transparent p-0 shadow-none">
      <MenubarMenu>
        <MenubarTrigger className="px-2 py-1 text-sm font-medium">App</MenubarTrigger>
        <MenubarContent>
          <MenubarItem disabled>Preferences…</MenubarItem>
          <MenubarItem disabled>Check for updates…</MenubarItem>
        </MenubarContent>
      </MenubarMenu>
      <MenubarMenu>
        <MenubarTrigger className="px-2 py-1 text-sm font-medium">View</MenubarTrigger>
        <MenubarContent>
          <MenubarItem disabled>Toggle left sidebar</MenubarItem>
          <MenubarItem disabled>Toggle inspector</MenubarItem>
        </MenubarContent>
      </MenubarMenu>
      <MenubarMenu>
        <MenubarTrigger className="px-2 py-1 text-sm font-medium">Help</MenubarTrigger>
        <MenubarContent>
          <MenubarItem disabled>Keyboard shortcuts</MenubarItem>
          <MenubarItem disabled>About Aideon Praxis</MenubarItem>
        </MenubarContent>
      </MenubarMenu>
    </Menubar>
  );
}
