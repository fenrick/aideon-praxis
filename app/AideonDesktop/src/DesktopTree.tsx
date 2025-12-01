import {
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@aideon/design-system';
import { Skeleton } from '@aideon/design-system/components/ui/skeleton';

import { useWorkspaceTree, type WorkspaceTreeItem } from './hooks/useWorkspaceTree';

export function DesktopTree() {
  const { loading, items } = useWorkspaceTree();

  return (
    <SidebarContent className="p-2">
      <SidebarGroup>
        <SidebarGroupLabel>Projects</SidebarGroupLabel>
        <SidebarGroupContent>
          <SidebarMenu>
            {loading ? (
              <div className="space-y-2 p-1">
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-4 w-40" />
              </div>
            ) : (
              items.map((item) => <TreeNode key={item.id} item={item} />)
            )}
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>
    </SidebarContent>
  );
}

function TreeNode({ item }: { readonly item: WorkspaceTreeItem }) {
  return (
    <SidebarMenuItem>
      <SidebarMenuButton asChild size="sm">
        <div className="flex flex-col gap-1 text-left">
          <span className="font-medium text-sm">{item.label}</span>
          {item.children ? (
            <div className="text-xs text-muted-foreground">
              {item.children.length} workspace{item.children.length === 1 ? '' : 's'}
            </div>
          ) : null}
        </div>
      </SidebarMenuButton>
      {item.children ? (
        <div className="ml-3 mt-1 space-y-1">
          {item.children.map((child) => (
            <SidebarMenuButton key={child.id} size="sm" className="text-muted-foreground">
              {child.label}
            </SidebarMenuButton>
          ))}
        </div>
      ) : null}
    </SidebarMenuItem>
  );
}
