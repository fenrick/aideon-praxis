import { useEffect, useState } from 'react';
import { mountWindow } from './bootstrap';

import './settings-window.css';

type ThemeMode = 'system' | 'light' | 'dark';

function applyTheme(mode: ThemeMode) {
  const body = document.body;
  body.classList.remove('theme-light', 'theme-dark');
  if (mode === 'light') {
    body.classList.add('theme-light');
  } else if (mode === 'dark') {
    body.classList.add('theme-dark');
  }
}

export function SettingsWindow() {
  const [mode, setMode] = useState<ThemeMode>(() => {
    const globalWindow = (globalThis as { window?: Window & typeof globalThis }).window;
    if (!globalWindow || !globalWindow.localStorage?.getItem) {
      return 'system';
    }
    const stored = globalWindow.localStorage.getItem('themeMode') as ThemeMode | null;
    return stored ?? 'system';
  });

  useEffect(() => {
    applyTheme(mode);
    const globalWindow = (globalThis as { window?: Window & typeof globalThis }).window;
    if (!globalWindow || !globalWindow.localStorage?.setItem) {
      return;
    }
    globalWindow.localStorage.setItem('themeMode', mode);
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

if (import.meta.env.MODE !== 'test') {
  mountWindow(<SettingsWindow />);
}
