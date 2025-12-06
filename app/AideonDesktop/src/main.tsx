import { StrictMode, useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';

import { invoke } from '@tauri-apps/api/core';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { AideonDesktopRoot } from './root';
import './styles.css';

const container = document.querySelector('#root');

if (!container) {
  throw new Error('Unable to locate root element');
}

createRoot(container).render(
  <StrictMode>
    <AppEntry />
  </StrictMode>,
);

/**
 *
 */
function AppEntry() {
  const [windowLabel, setWindowLabel] = useState<string | undefined>();
  const isTauri = '__TAURI__' in globalThis;

  useEffect(() => {
    queueMicrotask(() => {
      if (!isTauri) {
        console.log('[desktop] non-tauri environment, using path routing');
        setWindowLabel(undefined);
        return;
      }
      try {
        const currentWindow = getCurrentWindow();
        console.log('[desktop] window label', currentWindow.label);
        setWindowLabel(currentWindow.label);
      } catch (error) {
        console.warn('[desktop] failed to read window label, falling back to path', error);
        setWindowLabel(undefined);
      }
    });
  }, [isTauri]);

  const hashPath = globalThis.location.hash.replace(/^#/, '').replace(/\/$/, '') || '/';
  const route = isTauri ? (windowLabel ?? 'splash') : hashPath;
  const wantsSplash = route === 'splash' || route === '/splash';
  // Only bypass splash automatically in browser mode when it wasn't explicitly requested in hash.
  const normalizedRoute = !isTauri && wantsSplash && hashPath === '/splash' ? '/' : route;
  const pathname = globalThis.location.pathname;
  const search = globalThis.location.search;

  console.log('[desktop] route resolve', {
    hashPath,
    pathname,
    search,
    windowLabel,
    route: normalizedRoute,
    location: globalThis.location.href,
  });

  let view: React.ReactNode = <AideonDesktopRoot />;
  switch (normalizedRoute) {
    case 'splash':
    case '/splash': {
      view = <SplashScreen />;

      break;
    }
    case 'status':
    case '/status': {
      view = <StatusScreen />;

      break;
    }
    case 'about':
    case '/about': {
      view = <AboutScreen />;

      break;
    }
    case 'settings':
    case '/settings': {
      view = <SettingsScreen />;

      break;
    }
    case 'styleguide':
    case '/styleguide': {
      view = <StyleguideScreen />;

      break;
    }
    // No default
  }

  return <FrontendReady>{view}</FrontendReady>;
}

/**
 *
 * @param root0
 * @param root0.children
 */
function FrontendReady({ children }: { readonly children: React.ReactNode }) {
  useEffect(() => {
    if ('__TAURI__' in globalThis) {
      invoke('set_complete', { task: 'frontend' })
        .then(() => {
          console.log('[desktop] notified host frontend ready');
          return true;
        })
        .catch((error: unknown) => {
          console.warn('failed to notify frontend ready', error);
        });
    }
  }, []);
  return <>{children}</>;
}

/**
 *
 */
function SplashScreen() {
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

  // Rotate status lines
  useEffect(() => {
    let ix = 0;
    const interval = setInterval(() => {
      setCurrentLine(loadLines[ix % loadLines.length] ?? '');
      ix += 1;
    }, 800);
    return () => {
      clearInterval(interval);
    };
  }, [loadLines]);

  // Simulate frontend init and notify host
  useEffect(() => {
    let cancelled = false;
    /**
     *
     */
    async function init() {
      try {
        await new Promise((resolve) => setTimeout(resolve, 1800));
        if (!cancelled) {
          await invoke('set_complete', { task: 'frontend' });
        }
      } catch (error) {
        console.warn('splash: init failed', error);
      }
    }
    void init();
    return () => {
      cancelled = true;
    };
  }, [loadLines]);

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-950 text-slate-50">
      <img
        src="/splash.png"
        alt="Aideon Praxis splash"
        className="pointer-events-none absolute inset-0 h-full w-full object-cover"
        aria-hidden
      />
      <div
        className="absolute inset-0 bg-gradient-to-br from-slate-950/90 via-slate-900/75 to-slate-950/90 backdrop-blur-sm"
        aria-hidden
      />
      <div className="relative max-w-4xl rounded-2xl border border-white/12 bg-black/55 p-8 shadow-2xl backdrop-blur-xl md:p-10">
        <div className="space-y-4">
          <p className="text-xs font-semibold uppercase tracking-[0.35em] text-slate-200">
            Aideon Praxis
          </p>
          <h1 className="text-3xl font-semibold leading-tight text-white">Loading workspace…</h1>
          <p className="text-sm text-slate-100">Initialising host services and adapters.</p>
          <div className="mt-4 space-y-3 rounded-lg border border-white/12 bg-white/10 p-4 backdrop-blur">
            <div className="flex items-center gap-3 text-slate-50">
              <span
                className="inline-flex h-3 w-3 animate-ping rounded-full bg-emerald-400"
                aria-hidden
              />
              <span className="text-sm font-medium">Host connecting</span>
            </div>
            <div className="text-xs text-slate-100">{currentLine}</div>
            <div className="relative mt-1 h-1.5 overflow-hidden rounded-full bg-white/20">
              <span className="absolute inset-y-0 left-0 w-1/3 animate-[pulse_1.4s_ease-in-out_infinite] rounded-full bg-emerald-400/80" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 *
 */
function StatusScreen() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background text-foreground">
      <div className="rounded-lg border border-border/70 bg-card/90 px-6 py-4 shadow-md">
        <p className="text-sm font-medium">Host status</p>
        <p className="text-xs text-muted-foreground">All services initialising…</p>
      </div>
    </div>
  );
}

/**
 *
 */
function AboutScreen() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background text-foreground">
      <div className="space-y-2 rounded-lg border border-border/60 bg-card/90 px-6 py-5 shadow">
        <h1 className="text-lg font-semibold">Aideon Praxis</h1>
        <p className="text-sm text-muted-foreground">Desktop shell for Praxis Canvas and tools.</p>
      </div>
    </div>
  );
}

/**
 *
 */
function SettingsScreen() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background text-foreground">
      <div className="space-y-3 rounded-lg border border-border/60 bg-card/90 px-6 py-5 shadow">
        <h1 className="text-lg font-semibold">Settings</h1>
        <p className="text-sm text-muted-foreground">Settings UI coming soon.</p>
      </div>
    </div>
  );
}

/**
 *
 */
function StyleguideScreen() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background text-foreground">
      <div className="space-y-3 rounded-lg border border-border/60 bg-card/90 px-6 py-5 shadow">
        <h1 className="text-lg font-semibold">Styleguide</h1>
        <p className="text-sm text-muted-foreground">Design system documentation pending.</p>
      </div>
    </div>
  );
}
