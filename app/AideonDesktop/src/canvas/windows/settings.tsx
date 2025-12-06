import { useEffect, useState } from 'react';
import { mountWindow } from './bootstrap';

import './settings-window.css';

type ThemeMode = 'system' | 'light' | 'dark';

/**
 * Apply theme class to the document body.
 * @param mode - Theme mode to apply.
 */
function applyTheme(mode: ThemeMode) {
  const body = document.body;
  body.classList.remove('theme-light', 'theme-dark');
  if (mode === 'light') {
    body.classList.add('theme-light');
  } else if (mode === 'dark') {
    body.classList.add('theme-dark');
  }
}

/**
 * Settings window to switch appearance modes.
 * @returns Settings window component.
 */
export function SettingsWindow() {
  const [mode, setMode] = useState<ThemeMode>(() => {
    if (typeof localStorage === 'undefined') {
      return 'system';
    }
    const stored = localStorage.getItem('themeMode') as ThemeMode | null;
    return stored ?? 'system';
  });

  useEffect(() => {
    applyTheme(mode);
    if (typeof localStorage === 'undefined') {
      return;
    }
    localStorage.setItem('themeMode', mode);
  }, [mode]);

  return (
    <div className="settings-shell">
      <h2>Appearance</h2>
      <fieldset>
        <legend style={{ marginBottom: 8 }}>Theme</legend>
        <label>
          <input
            type="radio"
            name="mode"
            value="system"
            checked={mode === 'system'}
            onChange={() => {
              setMode('system');
            }}
          />
          System
        </label>
        <label>
          <input
            type="radio"
            name="mode"
            value="light"
            checked={mode === 'light'}
            onChange={() => {
              setMode('light');
            }}
          />
          Light
        </label>
        <label>
          <input
            type="radio"
            name="mode"
            value="dark"
            checked={mode === 'dark'}
            onChange={() => {
              setMode('dark');
            }}
          />
          Dark
        </label>
      </fieldset>
      <p className="helper">Accent color follows system (AccentColor).</p>
    </div>
  );
}

/**
 * Determine the current runtime mode from Vite import meta.
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
  mountWindow(<SettingsWindow />);
}
