'use client';

import { useEffect, useMemo, useRef, useState, type ReactElement, type ReactNode } from 'react';

import { AideonDesktopRoot } from '@/root';
import { HOST_EVENT_NAMES } from '../adapters/host-events';
import { getSetupState, openStatusWindow, setSetupComplete } from '../adapters/system-ipc';
import { SplashScreen as PraxisSplashScreen } from '../components/splash/splash-screen';
import { Badge } from '../design-system/components/ui/badge';
import { Button } from '../design-system/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../design-system/components/ui/card';
import { RadioGroup, RadioGroupItem } from '../design-system/components/ui/radio-group';
import { useColorTheme } from '../design-system/theme/color-theme';
import { isTauriRuntime } from '../lib/runtime';

/**
 * Root screen for the main desktop window.
 */
export function MainScreen() {
  return (
    <FrontendReady>
      <AideonDesktopRoot />
    </FrontendReady>
  );
}

/**
 * Splash screen displayed while the host initializes.
 */
export function SplashScreenRoute() {
  const shouldSignalFrontendReady = true;
  const loadLines = useMemo(
    () => [
      'Reticulating splines…',
      'Weaving twin orbits…',
      'Replaying future states…',
      'Cooling hot paths…',
      'Aligning decision matrices…',
      'Seeding knowledge graph…',
      'Collapsing branches to present…',
      'Normalising capability models…',
      'Hardening isolation layer…',
      'Bootstrapping sidecar…',
      'Calibrating maturity plateaus…',
      'Scheduling time-dimension renders…',
    ],
    [],
  );

  const [currentLine, setCurrentLine] = useState<string>(loadLines[0] ?? '');
  const [backendReady, setBackendReady] = useState(false);
  const [setupPhase, setSetupPhase] = useState<string>('starting');
  const [setupError, setSetupError] = useState<{ code: string; message: string } | undefined>();

  useEffect(() => {
    if (!isTauriRuntime()) {
      return;
    }
    let cancelled = false;
    let unlistenBackend: undefined | (() => void);
    let unlistenProgress: undefined | (() => void);
    let unlistenFailed: undefined | (() => void);
    const subscribe = async () => {
      try {
        const { listen } = await import('@tauri-apps/api/event');
        if (cancelled) {
          return;
        }
        unlistenBackend = await listen(HOST_EVENT_NAMES.setupBackendReady, () => {
          setBackendReady(true);
        });
        unlistenProgress = await listen<{ phase?: string }>(
          HOST_EVENT_NAMES.setupProgress,
          (event) => {
            const phase = event.payload.phase;
            if (typeof phase === 'string' && phase.length > 0) {
              setSetupPhase(phase);
            }
          },
        );
        unlistenFailed = await listen<{ code?: string; message?: string }>(
          HOST_EVENT_NAMES.setupFailed,
          (event) => {
            const code = event.payload.code;
            const message = event.payload.message;
            if (typeof code === 'string' && typeof message === 'string') {
              setSetupError({ code, message });
            }
          },
        );
      } catch {
        // ignore missing tauri event module (browser preview)
      }
    };
    subscribe().catch(() => false);
    return () => {
      cancelled = true;
      unlistenBackend?.();
      unlistenProgress?.();
      unlistenFailed?.();
    };
  }, []);

  useEffect(() => {
    if (!isTauriRuntime()) {
      return;
    }
    const checkSetup = async () => {
      try {
        const state = await getSetupState();
        if (state.backend) {
          setBackendReady(true);
        }
      } catch {
        // swallow errors during browser preview or startup races
      }
    };
    void checkSetup();
  }, []);

  useEffect(() => {
    let ix = 0;
    const interval = setInterval(() => {
      if (setupError) {
        setCurrentLine('Setup failed — see Status for details.');
        return;
      }
      if (backendReady) {
        setCurrentLine('Backend ready…');
        return;
      }
      if (setupPhase === 'migrating') {
        setCurrentLine('Migrating…');
        return;
      }
      setCurrentLine(loadLines[ix % loadLines.length] ?? '');
      ix += 1;
    }, 800);
    return () => {
      clearInterval(interval);
    };
  }, [backendReady, loadLines, setupError, setupPhase]);

  return (
    <FrontendReady enabled={shouldSignalFrontendReady}>
      <PraxisSplashScreen line={currentLine} />
      {setupError && (
        <div className="fixed inset-0 flex items-end justify-end p-6">
          <Card className="w-full max-w-md border-destructive/50 bg-card/90 shadow-lg">
            <CardHeader>
              <CardTitle className="text-destructive">Setup failed</CardTitle>
              <CardDescription className="text-muted-foreground">
                The host failed to initialize. Open Status to view diagnostics and recovery actions.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="rounded-md border border-border/60 bg-muted/30 px-3 py-2">
                <p className="text-xs font-medium">
                  <span className="font-mono">{setupError.code}</span>
                </p>
                <p className="mt-1 text-xs text-muted-foreground">{setupError.message}</p>
              </div>
              <div className="flex items-center justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    openStatusWindow().catch(() => false);
                  }}
                >
                  Open Status
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </FrontendReady>
  );
}

/**
 * Minimal host status window.
 */
export function StatusScreen() {
  const [seedSummary, setSeedSummary] = useState<
    | {
        readonly datasetVersion?: string;
        readonly metamodelVersion?: string;
      }
    | undefined
  >();

  useEffect(() => {
    if (!isTauriRuntime()) {
      return;
    }
    let cancelled = false;
    let unlistenSeed: undefined | (() => void);
    const subscribe = async () => {
      try {
        const { listen } = await import('@tauri-apps/api/event');
        unlistenSeed = await listen<{
          readonly datasetVersion?: string;
          readonly metamodelVersion?: string;
        }>(HOST_EVENT_NAMES.setupSeedSummary, (event) => {
          if (cancelled) {
            return;
          }
          let datasetVersion: string | undefined;
          if (typeof event.payload.datasetVersion === 'string') {
            datasetVersion = event.payload.datasetVersion;
          }
          let metamodelVersion: string | undefined;
          if (typeof event.payload.metamodelVersion === 'string') {
            metamodelVersion = event.payload.metamodelVersion;
          }
          if (datasetVersion || metamodelVersion) {
            setSeedSummary({ datasetVersion, metamodelVersion });
          }
        });
      } catch {
        // ignore missing tauri event module (browser preview)
      }
    };
    subscribe().catch(() => false);
    return () => {
      cancelled = true;
      unlistenSeed?.();
    };
  }, []);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background text-foreground">
      <div className="rounded-lg border border-border/70 bg-card/90 px-6 py-4 shadow-md">
        <p className="text-sm font-medium">Host status</p>
        <p className="text-xs text-muted-foreground">All services initialising…</p>
        {seedSummary && (
          <div className="mt-2 space-y-1 rounded border border-border/40 bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
            <p>Baseline dataset: {seedSummary.datasetVersion ?? 'unknown'}</p>
            <p>Schema version: {seedSummary.metamodelVersion ?? 'unknown'}</p>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * About dialog content for the desktop shell.
 */
export function AboutScreen() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background text-foreground">
      <div className="space-y-2 rounded-lg border border-border/60 bg-card/90 px-6 py-5 shadow">
        <h1 className="text-lg font-semibold">Aideon</h1>
        <p className="text-sm text-muted-foreground">
          Desktop shell for Praxis workspace and tools.
        </p>
      </div>
    </div>
  );
}

/**
 * Settings window for theme selection and preferences.
 */
export function SettingsScreen() {
  const { colorTheme, options, preloadThemes, setColorTheme } = useColorTheme();

  useEffect(() => {
    preloadThemes().catch(() => false);
  }, [preloadThemes]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background text-foreground">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle>Settings</CardTitle>
          <CardDescription>Personalize the desktop experience.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-3">
            <div>
              <p className="text-sm font-semibold">Color theme</p>
              <p className="text-xs text-muted-foreground">
                Choose the primary color palette for the UI. Changes persist automatically.
              </p>
            </div>
            <RadioGroup
              value={colorTheme}
              onValueChange={(value) => {
                setColorTheme(value as typeof colorTheme);
              }}
              className="space-y-3"
            >
              {options.map((option) => (
                <label
                  key={option.id}
                  htmlFor={`color-theme-${option.id}`}
                  className="flex cursor-pointer items-center gap-4 rounded-lg border border-border/60 bg-card/80 p-4 transition hover:bg-muted/40"
                >
                  <RadioGroupItem value={option.id} id={`color-theme-${option.id}`} />
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{option.label}</span>
                      {option.id === 'corp-blue' && <Badge variant="secondary">Default</Badge>}
                      {option.source && <Badge variant="outline">{option.source}</Badge>}
                    </div>
                    <p className="text-xs text-muted-foreground">{option.description}</p>
                  </div>
                  <ThemePreview themeId={option.id} />
                </label>
              ))}
            </RadioGroup>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/**
 * Placeholder UI styleguide window.
 */
export function StyleguideScreen() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background text-foreground">
      <div className="space-y-3 rounded-lg border border-border/60 bg-card/90 px-6 py-5 shadow">
        <h1 className="text-lg font-semibold">Styleguide</h1>
        <p className="text-sm text-muted-foreground">Design system documentation pending.</p>
      </div>
    </div>
  );
}

/**
 * Signals the host once the main window has rendered.
 * @param root0 - Component props.
 * @param root0.children - Content to render.
 * @param root0.enabled - Whether the signal should be emitted.
 */
export function FrontendReady({
  children,
  enabled = true,
}: {
  readonly children: ReactNode;
  readonly enabled?: boolean;
}): ReactElement | undefined {
  const didSignal = useRef(false);
  useEffect(() => {
    if (!enabled || didSignal.current) {
      return;
    }
    let cancelled = false;
    const attemptSignal = () => {
      if (cancelled || didSignal.current) {
        return;
      }
      if (!isTauriRuntime()) {
        return;
      }
      setSetupComplete('frontend')
        .then(() => {
          didSignal.current = true;
          return true;
        })
        .catch(() => false);
    };
    attemptSignal();
    const interval = setInterval(attemptSignal, 300);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [enabled]);
  return children as ReactElement | undefined;
}

/**
 * Render a compact preview of theme tokens.
 * @param root0 - Preview props.
 * @param root0.themeId - Theme identifier.
 */
function ThemePreview({ themeId }: { readonly themeId: string }) {
  const dataTheme = themeId === 'corp-blue' ? undefined : themeId;
  return (
    <div
      data-color-theme={dataTheme}
      className="grid grid-cols-3 gap-1 rounded-md border border-border/60 bg-background p-2 text-foreground"
    >
      <span className="h-3 w-3 rounded-full bg-primary" />
      <span className="h-3 w-3 rounded-full bg-accent" />
      <span className="h-3 w-3 rounded-full bg-muted" />
    </div>
  );
}
