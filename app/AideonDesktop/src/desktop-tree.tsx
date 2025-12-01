import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@aideon/design-system';
import { Skeleton } from '@aideon/design-system/components/ui/skeleton';

import { useWorkspaceTree, type WorkspaceTreeItem } from './hooks/use-workspace-tree';

export function DesktopTree() {
  const { loading, items, error } = useWorkspaceTree();

  return (
    <SidebarContent className="p-2">
      <SidebarGroup>
        <SidebarGroupLabel>Projects</SidebarGroupLabel>
        <SidebarGroupContent>
          <SidebarMenu>
            {loading && (
              <div className="space-y-2 p-1">
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-4 w-40" />
              </div>
            )}

            {!loading && error && (
              <SidebarMenuItem>
                <SidebarMenuButton
                  disabled
                  className="text-left text-xs text-destructive hover:text-destructive"
                >
                  Failed to load workspaces: {error}
                </SidebarMenuButton>
              </SidebarMenuItem>
            )}

            {!loading && !error && items.map((item) => <TreeNode key={item.id} item={item} />)}
          </SidebarMenu>
          {!loading && !error && items.length === 0 ? (
            <Sidebar className="mt-2 rounded-md border border-dashed border-border/70 bg-muted/30 p-2 text-xs text-muted-foreground">
              No workspaces available yet.
            </Sidebar>
          ) : null}
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
