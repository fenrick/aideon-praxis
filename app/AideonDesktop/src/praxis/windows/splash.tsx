import { invoke } from '@tauri-apps/api/core';
import { useEffect, useState } from 'react';
import { mountWindow } from './bootstrap';

import './splash-window.css';

const loadLines = [
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
];

/**
 * Splash/loading window shown during startup.
 * @returns Splash window component.
 */
export default function SplashWindow() {
  const [currentLine, setCurrentLine] = useState(loadLines[0]);
  useEffect(() => {
    let ix = 0;
    const interval = setInterval(() => {
      setCurrentLine(loadLines[ix % loadLines.length] ?? '');
      ix += 1;
    }, 800);
    return () => {
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    /**
     *
     */
    async function init() {
      try {
        await new Promise((resolve) => setTimeout(resolve, 3000));
        if (cancelled) {
          return;
        }
        await invoke('set_complete', { task: 'frontend' });
      } catch {
        cancelled = true;
      }
    }

    init().catch(() => false);
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="splash">
      <img className="bg" src="/splash.png" alt="Praxis splash" />
      <div className="right">
        <h1 className="title">Aideon&nbsp;Praxis</h1>
        <div className="loading">
          <span id="loadline">{currentLine}</span>
          <div className="bar">
            <i aria-hidden="true"></i>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Determine runtime mode from Vite import meta.
 * @returns Runtime mode string.
 */
function getRuntimeMode(): string {
  const meta: unknown = import.meta;
  if (
    meta &&
    typeof meta === 'object' &&
    'env' in meta &&
    (meta as { env?: { MODE?: unknown } }).env &&
    typeof (meta as { env?: { MODE?: unknown } }).env?.MODE === 'string'
  ) {
    return (meta as { env?: { MODE?: unknown } }).env?.MODE as string;
  }
  return 'development';
}

const runtimeMode = getRuntimeMode();
if (runtimeMode !== 'test') {
  mountWindow(<SplashWindow />);
}
