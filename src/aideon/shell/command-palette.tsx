import { useMemo, type ReactElement } from 'react';

import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandShortcut,
} from 'design-system';
import { useTranslations } from 'next-intl';

export interface AideonCommandItem {
  readonly id: string;
  readonly label: string;
  readonly group?: string;
  readonly shortcut?: string;
  readonly disabled?: boolean;
  readonly onSelect: () => void;
}

export interface AideonCommandPaletteProperties {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly commands: readonly AideonCommandItem[];
}

/**
 * Group commands into named buckets for rendering.
 * @param commands - Flat list of command items.
 * @param defaultGroup - Bucket name for commands with no explicit group.
 * @returns Grouped command buckets.
 */
function groupCommands(commands: readonly AideonCommandItem[], defaultGroup: string) {
  const grouped = new Map<string, AideonCommandItem[]>();
  for (const command of commands) {
    const group = command.group ?? defaultGroup;
    const bucket = grouped.get(group) ?? [];
    bucket.push(command);
    grouped.set(group, bucket);
  }

  return [...grouped.entries()].map(([group, items]) => ({
    group,
    items: items.toSorted((a, b) => a.label.localeCompare(b.label)),
  }));
}

/**
 * Global command palette surface for the Aideon shell.
 * @param root0 - Component props.
 * @param root0.open - Whether the palette is visible.
 * @param root0.onOpenChange - Visibility setter.
 * @param root0.commands - Commands to render.
 * @returns Command palette dialog.
 */
export function AideonCommandPalette({
  open,
  onOpenChange,
  commands,
}: AideonCommandPaletteProperties): ReactElement {
  const t = useTranslations('shell.commandPalette');
  const defaultGroup = t('defaultGroup');
  const grouped = useMemo(() => groupCommands(commands, defaultGroup), [commands, defaultGroup]);

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange} title={t('title')}>
      <CommandInput placeholder={t('searchPlaceholder')} />
      <CommandList>
        <CommandEmpty>{t('noResults')}</CommandEmpty>
        {grouped.map(({ group, items }) => (
          <CommandGroup key={group} heading={group}>
            {items.map((command) => (
              <CommandItem
                key={command.id}
                disabled={command.disabled}
                onSelect={() => {
                  if (command.disabled) {
                    return;
                  }
                  command.onSelect();
                  onOpenChange(false);
                }}
              >
                {command.label}
                {command.shortcut ? (
                  <CommandShortcut>{command.shortcut}</CommandShortcut>
                ) : undefined}
              </CommandItem>
            ))}
          </CommandGroup>
        ))}
      </CommandList>
    </CommandDialog>
  );
}
