import { AideonDesktopShell } from 'aideon/shell/aideon-desktop-shell';
import { AideonToolbar } from 'aideon/shell/aideon-toolbar';
import { isTauriRuntime } from 'lib/runtime';
import {
  HostPlatformProvider,
  LicensingProvider,
  PlatformContent,
  PlatformInspector,
  PlatformNavigation,
  PlatformToolbar,
} from 'platform';

/**
 * Application root. One unified host platform: licensed engines contribute
 * widgets to a single shell — there is no per-module workspace or switcher.
 */
export function AideonDesktopRoot() {
  const modeLabel = isTauriRuntime() ? 'Desktop' : undefined;

  return (
    <LicensingProvider>
      <HostPlatformProvider>
        <AideonDesktopShell
          contentLayout="full-bleed"
          navigation={<PlatformNavigation />}
          toolbar={
            <AideonToolbar
              title="Aideon"
              modeLabel={modeLabel}
              workspaceToolbar={<PlatformToolbar />}
            />
          }
          content={<PlatformContent />}
          inspector={<PlatformInspector />}
        />
      </HostPlatformProvider>
    </LicensingProvider>
  );
}
