import { useMemo, useState } from 'react';

import { useReactFlow, type Node } from '@xyflow/react';

import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';

export interface NodeSearchDialogProperties {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly onSelectNode?: (node: Node) => void;
}

export function NodeSearchDialog({ open, onOpenChange, onSelectNode }: NodeSearchDialogProperties) {
  const [query, setQuery] = useState('');
  const reactFlow = useReactFlow();

  const results = useMemo(() => {
    if (!query.trim()) {
      return [] as Node[];
    }
    const normalized = query.trim().toLowerCase();
    return reactFlow
      .getNodes()
      .filter((node) => getNodeLabel(node).toLowerCase().includes(normalized));
  }, [query, reactFlow]);

  const handleSelect = (node: Node) => {
    onSelectNode?.(node);
    reactFlow.setNodes((nodes) =>
      nodes.map((entry) => ({ ...entry, selected: entry.id === node.id })),
    );
    void reactFlow.fitView({ nodes: [node], duration: 400 });
    onOpenChange(false);
    setQuery('');
  };

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput
        placeholder="Search nodes..."
        value={query}
        onValueChange={setQuery}
        autoFocus
      />
      <CommandList>
        {results.length === 0 ? (
          <CommandEmpty>No matching nodes.</CommandEmpty>
        ) : (
          <CommandGroup heading="Nodes">
            {results.slice(0, 20).map((node) => (
              <CommandItem
                key={node.id}
                onSelect={() => {
                  handleSelect(node);
                }}
              >
                {getNodeLabel(node)}
              </CommandItem>
            ))}
          </CommandGroup>
        )}
      </CommandList>
    </CommandDialog>
  );
}

function getNodeLabel(node: Node): string {
  const label = (node.data as { label?: string } | undefined)?.label;
  if (typeof label === 'string' && label.trim()) {
    return label;
  }
  if (typeof node.id === 'string' && node.id.trim()) {
    return node.id;
  }
  return node.id;
}
