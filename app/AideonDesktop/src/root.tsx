import { useState } from 'react';

import type { SelectionState } from './canvas';
import { PraxisCanvasSurface } from './canvas';
import {
  DesktopShell,
  Menubar,
  MenubarContent,
  MenubarItem,
  MenubarMenu,
  MenubarTrigger,
} from './design-system';

import { DesktopPropertiesPanel } from './desktop-properties-panel';
import { DesktopTree } from './desktop-tree';

/**
 * Application root composing the desktop shell and canvas surface.
 * @returns Root component for the Praxis desktop app.
 */
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
