import { useMemo } from 'react';
import type { ReactNode } from 'react';

import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandShortcut,
} from '../components/ui/command';

export interface CommandPaletteItem {
  readonly id: string;
  readonly label: string;
  readonly group?: string;
  readonly shortcut?: string;
  readonly disabled?: boolean;
  readonly icon?: ReactNode;
  readonly onSelect: () => void;
}

export interface CommandPaletteProperties {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly items: readonly CommandPaletteItem[];
  readonly placeholder?: string;
  readonly emptyMessage?: string;
}

/**
 * Domain-free command palette shell block.
 * Groups items by the optional `group` field; sorts alphabetically within groups.
 * The caller supplies all labels and actions — this block carries no domain semantics.
 */
export function CommandPalette({
  open,
  onOpenChange,
  items,
  placeholder = 'Type a command…',
  emptyMessage = 'No results found.',
}: CommandPaletteProperties) {
  const groups = useMemo(() => {
    const grouped = new Map<string, CommandPaletteItem[]>();
    for (const item of items) {
      const group = item.group ?? 'Commands';
      const bucket = grouped.get(group) ?? [];
      bucket.push(item);
      grouped.set(group, bucket);
    }
    return [...grouped.entries()].map(([group, groupItems]) => ({
      group,
      items: groupItems.toSorted((a, b) => a.label.localeCompare(b.label)),
    }));
  }, [items]);

  return (
    <CommandDialog onOpenChange={onOpenChange} open={open}>
      <CommandInput placeholder={placeholder} />
      <CommandList>
        <CommandEmpty>{emptyMessage}</CommandEmpty>
        {groups.map(({ group, items: groupItems }) => (
          <CommandGroup heading={group} key={group}>
            {groupItems.map((item) => (
              <CommandItem
                disabled={item.disabled}
                key={item.id}
                onSelect={item.onSelect}
                value={item.id}
              >
                {item.icon}
                <span>{item.label}</span>
                {item.shortcut && <CommandShortcut>{item.shortcut}</CommandShortcut>}
              </CommandItem>
            ))}
          </CommandGroup>
        ))}
      </CommandList>
    </CommandDialog>
  );
}
