import { useCallback, useState } from 'react';

import type { BuiltInEdge, Node, PanelProps } from '@xyflow/react';
import { useReactFlow } from '@xyflow/react';

import { cn } from '../lib/cn';
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '../ui/command';

export interface NodeSearchProperties extends Omit<PanelProps, 'children'> {
  // The function to search for nodes, should return an array of nodes that match the search string
  // By default, it will check for lowercase string inclusion.
  readonly onSearch?: (searchString: string) => Node[];
  // The function to select a node, should set the node as selected and fit the view to the node
  // By default, it will set the node as selected and fit the view to the node.
  readonly onSelectNode?: (node: Node) => void;
  readonly open?: boolean;
  readonly onOpenChange?: (open: boolean) => void;
}

function NodeSearchInternal({ onSearch, onSelectNode, open, onOpenChange }: NodeSearchProperties) {
  const [searchResults, setSearchResults] = useState<Node[]>([]);
  const [searchString, setSearchString] = useState('');
  const { getNodes, fitView, setNodes } = useReactFlow<Node, BuiltInEdge>();

  const defaultOnSearch = useCallback(
    (value: string) => {
      const nodes = getNodes();
      const normalized = value.toLowerCase();
      return nodes.filter((node) => getNodeLabel(node).toLowerCase().includes(normalized));
    },
    [getNodes],
  );

  const handleQueryChange = useCallback(
    (value: string) => {
      setSearchString(value);
      if (value.length === 0) {
        setSearchResults([]);
        return;
      }
      onOpenChange?.(true);
      const results = (onSearch ?? defaultOnSearch)(value);
      setSearchResults(results);
    },
    [defaultOnSearch, onOpenChange, onSearch],
  );

  const defaultOnSelectNode = useCallback(
    (node: Node) => {
      setNodes((nodes) =>
        nodes.map((entry) => (entry.id === node.id ? { ...entry, selected: true } : entry)),
      );
      void fitView({ nodes: [node], duration: 500 });
    },
    [fitView, setNodes],
  );

  const handleSelect = useCallback(
    (node: Node) => {
      const selectNode = onSelectNode ?? defaultOnSelectNode;
      selectNode(node);
      setSearchString('');
      onOpenChange?.(false);
    },
    [defaultOnSelectNode, onOpenChange, onSelectNode],
  );

  return (
    <>
      <CommandInput
        placeholder="Search nodes..."
        onValueChange={handleQueryChange}
        value={searchString}
        onFocus={() => onOpenChange?.(true)}
      />
      {open ? (
        <CommandList>
          {searchResults.length === 0 ? (
            <CommandEmpty>No results found. {searchString}</CommandEmpty>
          ) : (
            <CommandGroup heading="Nodes">
              {searchResults.map((node) => (
                <CommandItem
                  key={node.id}
                  onSelect={() => {
                    handleSelect(node);
                  }}
                >
                  <span>{getNodeLabel(node)}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          )}
        </CommandList>
      ) : null}
    </>
  );
}

export function NodeSearch({
  className,
  onSearch,
  onSelectNode,
  ...panelProperties
}: NodeSearchProperties) {
  const [open, setOpen] = useState(false);
  return (
    <Command
      shouldFilter={false}
      className={cn('rounded-lg border shadow-md md:min-w-[450px]', className)}
    >
      <NodeSearchInternal
        {...panelProperties}
        onSearch={onSearch}
        onSelectNode={onSelectNode}
        open={open}
        onOpenChange={setOpen}
      />
    </Command>
  );
}

export type NodeSearchDialogProperties = NodeSearchProperties;

export function NodeSearchDialog({
  onSearch,
  onSelectNode,
  open,
  onOpenChange,
  ...panelProperties
}: NodeSearchDialogProperties) {
  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <NodeSearchInternal
        {...panelProperties}
        onSearch={onSearch}
        onSelectNode={onSelectNode}
        open={open}
        onOpenChange={onOpenChange}
      />
    </CommandDialog>
  );
}

function getNodeLabel(node: Node): string {
  const label = (node.data as { label?: unknown } | undefined)?.label;
  if (typeof label === 'string' && label.trim()) {
    return label;
  }
  const identifier = node.id;
  return typeof identifier === 'string' ? identifier : String(identifier);
}
