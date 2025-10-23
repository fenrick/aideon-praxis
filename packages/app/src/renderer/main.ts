import { invoke } from '@tauri-apps/api/core';
import { debug, info } from '@tauri-apps/plugin-log';
import App from './App.svelte';

const container = document.querySelector('#root');
if (!container) {
  throw new Error('Root container #root not found');
}
const app = new App({ target: container as HTMLElement });

// Frontend initialisation gate: only notify host when finished
function sleep(seconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, seconds * 1000));
}

async function setup() {
  // Fake heavy setup work to simulate real init
  await debug('Performing really heavy frontend setup task...');
  await sleep(3);
  await info('Frontend setup task complete!');
  await invoke('set_complete', { task: 'frontend' });
}

globalThis.addEventListener('DOMContentLoaded', () => {
  void setup();
});

export default app;
