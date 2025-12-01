import React from 'react';
import ReactDOM from 'react-dom/client';

import { AideonDesktopRoot } from './root';
import './styles.css';
import { invoke } from '@tauri-apps/api/core';
import { getCurrent } from '@tauri-apps/api/window';

const container = document.querySelector('#root');

if (!container) {
  throw new Error('Unable to locate root element');
}

ReactDOM.createRoot(container).render(
  <React.StrictMode>
    <AppEntry />
  </React.StrictMode>,
);

function AppEntry() {
  const [windowLabel, setWindowLabel] = React.useState<string | undefined>(undefined);

  React.useEffect(() => {
    if ('__TAURI__' in window) {
      void getCurrent()
        .then((current) => setWindowLabel(current.label))
        .catch(() => {
          // fall back to hash path
          setWindowLabel(undefined);
        });
    } else {
      setWindowLabel(undefined);
    }
  }, []);

  const hashPath = window.location.hash.replace(/^#/, '');
  const path = (hashPath || window.location.pathname || '/').replace(/\/$/, '') || '/';
  const route = windowLabel ?? path;

  let view: React.ReactNode = <AideonDesktopRoot />;
  if (route === 'splash' || route === '/splash') {
    view = <SplashScreen />;
  } else if (route === 'status' || route === '/status') {
    view = <StatusScreen />;
  } else if (route === 'about' || route === '/about') {
    view = <AboutScreen />;
  } else if (route === 'settings' || route === '/settings') {
    view = <SettingsScreen />;
  } else if (route === 'styleguide' || route === '/styleguide') {
    view = <StyleguideScreen />;
  }

  return <FrontendReady>{view}</FrontendReady>;
}

function FrontendReady({ children }: { readonly children: React.ReactNode }) {
  React.useEffect(() => {
    if ('__TAURI__' in window) {
      void invoke('set_complete', { task: 'frontend' }).catch((error) => {
        console.warn('failed to notify frontend ready', error);
      });
    }
  }, []);
  return <>{children}</>;
}

function SplashScreen() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-background via-muted to-background text-foreground">
      <div className="space-y-4 text-center">
        <p className="text-xs uppercase tracking-[0.35em] text-muted-foreground">Aideon Praxis</p>
        <h1 className="text-2xl font-semibold">Loading workspace…</h1>
        <p className="text-sm text-muted-foreground">Initialising host services and adapters.</p>
      </div>
    </div>
  );
}

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
