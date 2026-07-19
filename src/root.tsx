import { AideonDesktopShell } from 'aideon/shell/aideon-desktop-shell';
import { AideonToolbar } from 'aideon/shell/aideon-toolbar';
import { useAddWidgetCommand } from 'aideon/shell/use-add-widget-command';
import { isTauriRuntime } from 'lib/runtime';
import {
  HostPlatformProvider,
  LicensingProvider,
  PlatformContent,
  PlatformInspector,
  PlatformNavigation,
  PlatformToolbar,
  SurfaceProvider,
} from 'platform';

/**
 * Toolbar connected to the host platform context, supplying the canonical
 * Add-widget command (issue #440) alongside the generic shell commands.
 * @param root0 - Component props.
 * @param root0.modeLabel - Desktop/browser mode label shown in the toolbar.
 */
function AppToolbar({ modeLabel }: { readonly modeLabel?: string }) {
  const addWidgetCommand = useAddWidgetCommand();
  return (
    <AideonToolbar
      title="Aideon"
      modeLabel={modeLabel}
      workspaceToolbar={<PlatformToolbar />}
      commands={[addWidgetCommand]}
    />
  );
}

/**
 * Application root. One unified host platform: licensed engines contribute
 * widgets to a single shell — there is no per-module workspace or switcher.
 */
export function AideonDesktopRoot() {
  const modeLabel = isTauriRuntime() ? 'Desktop' : undefined;

  return (
    <LicensingProvider>
      <HostPlatformProvider>
        <SurfaceProvider>
          <AideonDesktopShell
            contentLayout="full-bleed"
            navigation={<PlatformNavigation />}
            toolbar={<AppToolbar modeLabel={modeLabel} />}
            content={<PlatformContent />}
            inspector={<PlatformInspector />}
          />
        </SurfaceProvider>
      </HostPlatformProvider>
    </LicensingProvider>
  );
}
