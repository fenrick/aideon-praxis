import type { ReactNode } from 'react';

export function NodeSearchDialog({ children }: { children?: ReactNode }) {
  return <div data-testid="node-search-dialog">{children}</div>;
}
