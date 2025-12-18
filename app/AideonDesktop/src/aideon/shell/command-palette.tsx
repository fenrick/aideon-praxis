import { useMemo, type ReactElement } from 'react';

import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandShortcut,
} from 'design-system/components/ui/command';

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

function groupCommands(commands: readonly AideonCommandItem[]) {
  const grouped = new Map<string, AideonCommandItem[]>();
  for (const command of commands) {
    const group = command.group ?? 'Commands';
    const bucket = grouped.get(group) ?? [];
    bucket.push(command);
    grouped.set(group, bucket);
  }

  return [...grouped.entries()].map(([group, items]) => ({
    group,
    items: items.toSorted((a, b) => a.label.localeCompare(b.label)),
  }));
}

export function AideonCommandPalette({
  open,
  onOpenChange,
  commands,
}: AideonCommandPaletteProperties): ReactElement {
  const grouped = useMemo(() => groupCommands(commands), [commands]);

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange} title="Command palette">
      <CommandInput placeholder="Search commands…" />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
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
