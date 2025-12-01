import { useState } from 'react';

import {
  DesktopShell,
  Menubar,
  MenubarContent,
  MenubarItem,
  MenubarMenu,
  MenubarTrigger,
} from '@aideon/design-system';
import type { SelectionState } from '@aideon/PraxisCanvas';
import { PraxisCanvasSurface } from '@aideon/PraxisCanvas';

import { DesktopPropertiesPanel } from './DesktopPropertiesPanel';
import { DesktopTree } from './DesktopTree';

export function AideonDesktopRoot() {
  const [selection, setSelection] = useState<SelectionState | undefined>();

  return (
    <DesktopShell
      toolbar={
        <Menubar>
          <MenubarMenu>
            <MenubarTrigger>Workspace</MenubarTrigger>
            <MenubarContent>
              <MenubarItem>Praxis Canvas</MenubarItem>
              <MenubarItem disabled>Coming soon</MenubarItem>
            </MenubarContent>
          </MenubarMenu>
        </Menubar>
      }
      tree={<DesktopTree />}
      main={<PraxisCanvasSurface onSelectionChange={setSelection} />}
      properties={<DesktopPropertiesPanel selection={selection} />}
    />
  );
}

function Placeholder({ label }: { readonly label: string }) {
  return (
    <div className="flex h-full items-center justify-center px-4 text-sm text-muted-foreground">
      {label} panel placeholder
    </div>
  );
}
