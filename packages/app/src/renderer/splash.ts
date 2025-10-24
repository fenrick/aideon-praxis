import { invoke } from '@tauri-apps/api/core';
// Lightweight splashscreen controller used in the dedicated splash window.
// Rotates a friendly loadline and signals the host once the frontend init
// completes, matching the host's two‑phase setup (frontend/backend).
import { info } from '@tauri-apps/plugin-log';

const lines = [
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

function rotateLoadline() {
  let ix = 0;
  const element: HTMLSpanElement | null = document.querySelector('#loadline');
  const tick = () => {
    if (element) element.textContent = (lines[ix % lines.length] ?? '') as unknown as string;
    ix += 1;
    const jitter = 800; // deterministic to satisfy lint rules
    setTimeout(tick, jitter);
  };
  setTimeout(tick, 900);
}

async function main() {
  rotateLoadline();
  await info('splash: frontend init start');
  // Simulate work similar to previous App.svelte gating
  await new Promise((resolve) => setTimeout(resolve, 3000));
  await info('splash: frontend init complete');
  await invoke('set_complete', { task: 'frontend' });
}

await main();
