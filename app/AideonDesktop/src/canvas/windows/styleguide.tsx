import { useEffect, useMemo, useState } from 'react';

import { mountWindow } from './bootstrap';

import { Button } from '../../design-system/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../../design-system/components/ui/card';
import { Input } from '../../design-system/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../design-system/components/ui/select';

import './styleguide-window.css';

const themes: { label: string; mode: ThemeMode }[] = [
  { label: 'System', mode: 'system' },
  { label: 'Light', mode: 'light' },
  { label: 'Dark', mode: 'dark' },
];

const swatches = [
  { label: 'Background', variable: '--background' },
  { label: 'Foreground', variable: '--foreground' },
  { label: 'Accent', variable: '--accent' },
  { label: 'Border', variable: '--border' },
];

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

function colorFromVariable(variable: string): string {
  if (typeof document === 'undefined') {
    return variable;
  }
  return getComputedStyle(document.body).getPropertyValue(variable).trim() || variable;
}

export function StyleguideWindow() {
  const [mode, setMode] = useState<ThemeMode>('system');
  const [accent, setAccent] = useState('--accent');

  useEffect(() => {
    applyTheme(mode);
  }, [mode]);

  const accentOptions = useMemo(
    () => [
      { label: 'Primary', value: '--primary' },
      { label: 'Secondary', value: '--secondary' },
      { label: 'Accent', value: '--accent' },
      { label: 'Destructive', value: '--destructive' },
    ],
    [],
  );

  return (
    <main>
      <section className="section">
        <Card className="bg-transparent border-none shadow-none">
          <CardHeader>
            <CardTitle className="text-2xl text-white">Praxis styleguide</CardTitle>
            <CardDescription className="text-muted-foreground">
              Built from shadcn/ui tokens and extended blocks.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="theme-grid">
              {themes.map((entry) => {
                const backgroundVariable = entry.mode === 'system' ? '--muted' : `--${entry.mode}`;
                return (
                  <div key={entry.mode} className="theme-card">
                    <span>{entry.label}</span>
                    <div
                      className="swatch"
                      style={{
                        background: `var(${backgroundVariable})`,
                      }}
                    />
                    <Button
                      variant={mode === entry.mode ? 'secondary' : 'ghost'}
                      onClick={() => {
                        setMode(entry.mode);
                      }}
                    >
                      {entry.label}
                    </Button>
                  </div>
                );
              })}
            </div>
            <div className="theme-grid">
              {swatches.map((swatch) => (
                <div key={swatch.label} className="theme-card">
                  <span>{swatch.label}</span>
                  <div className="swatch" style={{ background: `var(${swatch.variable})` }} />
                  <p className="text-xs text-muted-foreground">
                    {colorFromVariable(swatch.variable)}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </section>
      <section className="section">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h2 className="text-xl font-semibold">Component previews</h2>
          <div className="flex gap-2 items-center">
            <span className="text-xs text-muted-foreground uppercase tracking-[0.3em]">
              Accent token
            </span>
            <Select
              value={accent}
              onValueChange={(value: string) => {
                setAccent(value);
              }}
            >
              <SelectTrigger id="accent-select" className="w-40">
                <SelectValue placeholder="Accent token" />
              </SelectTrigger>
              <SelectContent>
                {accentOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="preview-grid">
          <Card className="preview-card">
            <CardHeader>
              <CardTitle>Buttons</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="button-row">
                <Button variant="secondary">Primary</Button>
                <Button variant="outline">Outline</Button>
                <Button variant="ghost">Ghost</Button>
              </div>
            </CardContent>
          </Card>
          <Card className="preview-card">
            <CardHeader>
              <CardTitle>Inputs</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Input placeholder="Search tokens" className="bg-background" />
              <Input placeholder="Blocked field" disabled />
            </CardContent>
          </Card>
          <Card className="preview-card">
            <CardHeader>
              <CardTitle>Notifications</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">Status · Ready</p>
              <p className="text-xs text-muted-foreground">Accent token: {accent}</p>
            </CardContent>
          </Card>
        </div>
      </section>
    </main>
  );
}

if (import.meta.env.MODE !== 'test') {
  mountWindow(<StyleguideWindow />);
}
